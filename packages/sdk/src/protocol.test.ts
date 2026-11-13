import { describe, expect, it } from "vitest"
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js"
import { NATIVE_SOL, parseTokenAmount, resolveUsdtAsset, usdtAsset } from "./assets"
import { ProtocolError, ProtocolErrorCode } from "./errors"
import { canTransition, isPreSettlementState, isSettledState } from "./lifecycle"
import {
  createNetworkContext,
  createPaymentRequest,
  createSignedTransactionMessage,
  parseMessage,
  serializeMessage,
} from "./messages"
import { buildSplTransfer, verifySplTransfer } from "./solana/spl"
import { buildSolTransfer } from "./solana/transfer"
import { verifyTransfer } from "./solana/verify"
import { toBase64 } from "./transport/encoding"
import {
  decodeBlockhash,
  decodeIdentity,
  decodeSignedTx,
  encodeBlockhash,
  encodeIdentity,
  encodeSignedTx,
} from "./transport/qr-legacy"
import { deriveExpiresAt, getExpirySnapshot, isContextExpired } from "./expiry"
import { PROTOCOL_ID, PROTOCOL_VERSION } from "./version"

describe("protocol envelopes", () => {
  it("round-trips network context and payment request", () => {
    const fetchedAt = 1_700_000_000_000
    const context = createNetworkContext({
      recentBlockhash: "Bh11111111111111111111111111111111",
      lastValidBlockHeight: 142,
      currentBlockHeight: 100,
      fetchedAt,
      feePayer: "11111111111111111111111111111111",
    })
    expect(context.protocol).toBe(PROTOCOL_ID)
    expect(context.version).toBe(PROTOCOL_VERSION)
    expect(context.expiresAt).toBe(fetchedAt + 42 * 400)
    expect(parseMessage(serializeMessage(context))).toEqual(context)

    const request = createPaymentRequest({
      recipient: "11111111111111111111111111111111",
      amount: 1_000_000,
      asset: NATIVE_SOL,
    })
    expect(request.type).toBe("payment_request")
    expect(parseMessage(serializeMessage(request)).type).toBe("payment_request")
  })

  it("rejects wrong cluster and version", () => {
    expect(() =>
      parseMessage(
        JSON.stringify({
          protocol: "rpay",
          version: "9.9.9",
          type: "network_context",
          exchangeId: "x",
          cluster: "devnet",
          recentBlockhash: "a",
          lastValidBlockHeight: 1,
        }),
      ),
    ).toThrowError(ProtocolError)

    try {
      parseMessage(
        JSON.stringify({
          protocol: "rpay",
          version: PROTOCOL_VERSION,
          type: "network_context",
          exchangeId: "x",
          cluster: "not-a-cluster",
          recentBlockhash: "a",
          lastValidBlockHeight: 1,
        }),
      )
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ProtocolError)
      expect((error as ProtocolError).code).toBe(ProtocolErrorCode.WRONG_CLUSTER)
    }
  })
})

describe("lifecycle", () => {
  it("enforces settlement boundaries", () => {
    expect(canTransition("signed", "transferred")).toBe(true)
    expect(canTransition("signed", "finalized")).toBe(false)
    expect(isPreSettlementState("submitted")).toBe(true)
    expect(isSettledState("confirmed")).toBe(true)
  })
})

describe("legacy QR + transfer verify", () => {
  it("round-trips compact codes and verifies signatures", () => {
    expect(decodeBlockhash(encodeBlockhash("abc", 42))).toEqual({ blockhash: "abc", lastValidBlockHeight: 42 })
    const address = "11111111111111111111111111111111"
    expect(decodeIdentity(encodeIdentity("mina", address))).toEqual({ alias: "mina", publicKey: address })

    const from = Keypair.generate()
    const to = Keypair.generate()
    const blockhash = Keypair.generate().publicKey.toBase58()
    const tx = buildSolTransfer({ from: from.publicKey, to: to.publicKey, lamports: 5_000, blockhash })
    tx.sign(from)
    expect(verifyTransfer(tx, [blockhash])).toMatchObject({ ok: true, lamports: 5_000 })
    const decoded = decodeSignedTx(encodeSignedTx(tx))
    expect(decoded && verifyTransfer(decoded, [blockhash]).ok).toBe(true)
    expect(verifyTransfer(tx, ["stale"]).ok).toBe(false)

    const message = createSignedTransactionMessage({ transactionBase64: toBase64(tx.serialize()) })
    expect(message.transactionEncoding).toBe("base64")

    const extra = buildSolTransfer({ from: from.publicKey, to: to.publicKey, lamports: 5_000, blockhash })
    extra.add(SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to.publicKey, lamports: 1 }))
    extra.sign(from)
    expect(verifyTransfer(extra, [blockhash]).ok).toBe(false)

    const tampered = Transaction.from(tx.serialize())
    tampered.signatures[0].signature![0] ^= 0xff
    expect(verifyTransfer(tampered, [blockhash]).ok).toBe(false)
  })
})

describe("expiry", () => {
  it("derives absolute expiresAt and snapshots remaining time", () => {
    const fetchedAt = 1_000_000
    const expiresAt = deriveExpiresAt({
      fetchedAt,
      lastValidBlockHeight: 200,
      currentBlockHeight: 100,
      slotMs: 400,
    })
    expect(expiresAt).toBe(fetchedAt + 40_000)
    expect(getExpirySnapshot({ expiresAt, fetchedAt, now: fetchedAt + 10_000 }).label).toBe("30s left")
    expect(getExpirySnapshot({ expiresAt, fetchedAt, now: fetchedAt + 5_000 }).remainingMs).toBe(35_000)
    expect(isContextExpired({ expiresAt, now: expiresAt })).toBe(true)
    expect(
      isContextExpired({
        expiresAt: fetchedAt + 60_000,
        lastValidBlockHeight: 100,
        currentBlockHeight: 101,
      }),
    ).toBe(true)
  })
})

describe("USDT / SPL", () => {
  it("parses amounts and builds payment requests", () => {
    expect(parseTokenAmount("1.5", 6)).toBe(1_500_000)
    expect(resolveUsdtAsset({ cluster: "devnet" })).toBeNull()
    const mint = Keypair.generate().publicKey.toBase58()
    const asset = resolveUsdtAsset({ cluster: "devnet", mint })
    expect(asset?.labeledTestToken).toBe(true)
    expect(asset?.symbol).toBe("USDT-DEV")

    const request = createPaymentRequest({
      recipient: "11111111111111111111111111111111",
      amount: 1_000_000,
      asset: usdtAsset(mint),
    })
    expect(request.asset.kind).toBe("spl_token")
    expect(parseMessage(serializeMessage(request)).type).toBe("payment_request")
  })

  it("verifies a signed SPL transfer-checked instruction", () => {
    const from = Keypair.generate()
    const to = Keypair.generate()
    const mint = Keypair.generate()
    const blockhash = Keypair.generate().publicKey.toBase58()
    const tx = buildSplTransfer({
      from: from.publicKey,
      to: to.publicKey,
      mint: mint.publicKey,
      amount: 2_500_000,
      decimals: 6,
      blockhash,
    })
    tx.sign(from)
    expect(
      verifySplTransfer(tx, [blockhash], { mint: mint.publicKey.toBase58(), decimals: 6, amount: 2_500_000 }),
    ).toMatchObject({ ok: true, amount: 2_500_000 })
    expect(verifySplTransfer(tx, ["stale"]).ok).toBe(false)
  })
})
