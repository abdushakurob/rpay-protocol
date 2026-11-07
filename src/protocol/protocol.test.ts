import { describe, expect, it } from "vitest"
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js"
import { decryptSecret, encryptSecret } from "../account/crypto"
import { keypairFromPhrase } from "../account/phrase"
import { canonicalAddress, isAlias, solToLamports } from "../format"
import { decodeBlockhash, decodeIdentity, decodeSignedTx, encodeBlockhash, encodeIdentity, encodeSignedTx } from "./codes"
import { buildTransfer } from "./transfer"
import { verifyTransfer } from "./verify"

describe("amounts and names", () => {
  it("reads SOL and names", () => {
    expect(solToLamports("1")).toBe(1_000_000_000)
    expect(solToLamports("0.000000001")).toBe(1)
    expect(solToLamports("0")).toBeNull()
    expect(isAlias("mina")).toBe(true)
    expect(isAlias("no")).toBe(false)
    const address = "11111111111111111111111111111111"
    expect(canonicalAddress(address)).toBe(address)
    expect(canonicalAddress("mina")).toBeNull()
  })
})

describe("payment codes", () => {
  it("round-trips a devnet code and a name", () => {
    expect(decodeBlockhash(encodeBlockhash("abc", 42))).toEqual({ blockhash: "abc", lastValidBlockHeight: 42 })
    const address = "11111111111111111111111111111111"
    expect(decodeIdentity(encodeIdentity("mina", address))).toEqual({ alias: "mina", publicKey: address })
  })

  it("accepts one signed transfer and rejects a changed one", () => {
    const from = Keypair.generate()
    const to = Keypair.generate()
    const blockhash = Keypair.generate().publicKey.toBase58()
    const tx = buildTransfer({ from: from.publicKey, to: to.publicKey, lamports: 5_000, blockhash })
    tx.sign(from)
    expect(verifyTransfer(tx, [blockhash])).toMatchObject({ ok: true, lamports: 5_000 })
    const decoded = decodeSignedTx(encodeSignedTx(tx))
    expect(decoded && verifyTransfer(decoded, [blockhash]).ok).toBe(true)
    expect(verifyTransfer(tx, ["stale"]).ok).toBe(false)

    const extra = buildTransfer({ from: from.publicKey, to: to.publicKey, lamports: 5_000, blockhash })
    extra.add(SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to.publicKey, lamports: 1 }))
    extra.sign(from)
    expect(verifyTransfer(extra, [blockhash]).ok).toBe(false)

    const tampered = Transaction.from(tx.serialize())
    tampered.signatures[0].signature![0] ^= 0xff
    expect(verifyTransfer(tampered, [blockhash]).ok).toBe(false)
  })
})

describe("account lock", () => {
  it("derives the same key and opens only with the password", async () => {
    const phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    expect(keypairFromPhrase(phrase).publicKey.toBase58()).toBe(keypairFromPhrase(phrase).publicKey.toBase58())
    const cipher = await encryptSecret("correct horse", phrase, 1_000)
    await expect(decryptSecret("correct horse", cipher)).resolves.toBe(phrase)
    await expect(decryptSecret("nope", cipher)).rejects.toThrow()
  })
})
