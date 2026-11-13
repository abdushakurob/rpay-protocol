import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js"
import type { ProtocolSigner } from "./adapters/wdk"
import { NATIVE_SOL } from "./assets"
import { ProtocolError, ProtocolErrorCode } from "./errors"
import { SOLANA_SLOT_MS, deriveExpiresAt, getExpirySnapshot, isContextExpired } from "./expiry"
import {
  createNetworkContext,
  createPaymentRequest,
  createSignedTransactionMessage,
  createSubmissionStatus,
  parseMessage,
  serializeMessage,
} from "./messages"
import { buildSolTransfer } from "./solana/transfer"
import { buildSplTransfer, readTokenBalance, signSplTransfer, verifySplTransfer } from "./solana/spl"
import { observeSignature, submitSignedTransaction } from "./solana/submit"
import { verifyTransfer } from "./solana/verify"
import { fromBase64, toBase64 } from "./transport/encoding"
import {
  decodeBlockhash,
  decodeSignedTx,
  encodeSignedTx,
  isLegacyQrPayload,
} from "./transport/qr-legacy"
import type { AssetDescriptor, NetworkContextMessage, PaymentRequestMessage, TransactionState } from "./types"
import { DEFAULT_CLUSTER, type SolanaCluster } from "./version"

export type RPayClientOptions = {
  connection: Connection
  cluster?: SolanaCluster
}

/**
 * High-level protocol client for payers, relays, and merchants.
 * Does not store keys; signing is injected by the host wallet.
 */
export class RPayClient {
  readonly connection: Connection
  readonly cluster: SolanaCluster

  constructor(options: RPayClientOptions) {
    this.connection = options.connection
    this.cluster = options.cluster ?? DEFAULT_CLUSTER
  }

  async fetchNetworkContext(exchangeId?: string, feePayer?: string): Promise<NetworkContextMessage> {
    try {
      const [latest, currentBlockHeight] = await Promise.all([
        this.connection.getLatestBlockhash("confirmed"),
        this.connection.getBlockHeight("confirmed"),
      ])
      const fetchedAt = Date.now()
      const expiresAt = deriveExpiresAt({
        fetchedAt,
        lastValidBlockHeight: latest.lastValidBlockHeight,
        currentBlockHeight,
        slotMs: SOLANA_SLOT_MS,
      })
      return createNetworkContext({
        recentBlockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
        currentBlockHeight,
        fetchedAt,
        expiresAt,
        slotMs: SOLANA_SLOT_MS,
        cluster: this.cluster,
        exchangeId,
        feePayer,
      })
    } catch (error) {
      throw new ProtocolError(
        ProtocolErrorCode.RPC_UNAVAILABLE,
        error instanceof Error ? error.message : "RPC unavailable",
        error,
      )
    }
  }

  /**
   * Encode network context for QR exchange.
   * Includes absolute expiresAt / fetchedAt so scanners can countdown without guessing.
   */
  encodeNetworkContextQr(context: NetworkContextMessage) {
    return serializeMessage(context)
  }

  contextExpiry(context: Pick<NetworkContextMessage, "expiresAt" | "fetchedAt">, now = Date.now()) {
    return getExpirySnapshot({ expiresAt: context.expiresAt, fetchedAt: context.fetchedAt, now })
  }

  async assertContextStillValid(context: NetworkContextMessage) {
    const height = await this.connection.getBlockHeight("confirmed")
    if (
      isContextExpired({
        expiresAt: context.expiresAt,
        lastValidBlockHeight: context.lastValidBlockHeight,
        currentBlockHeight: height,
      })
    ) {
      throw new ProtocolError(ProtocolErrorCode.BLOCKHASH_EXPIRED, "network context expired — fetch a fresh stamp")
    }
  }

  decodeScannedPayload(raw: string) {
    const text = raw.trim()
    if (text.startsWith("{")) {
      try {
        return { kind: "envelope" as const, message: parseMessage(text) }
      } catch {
        return null
      }
    }
    if (isLegacyQrPayload(text)) {
      const blockhash = decodeBlockhash(text)
      if (blockhash) {
        const fetchedAt = Date.now()
        return createNetworkContext({
          recentBlockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
          currentBlockHeight: blockhash.lastValidBlockHeight,
          fetchedAt,
          expiresAt: fetchedAt,
          cluster: this.cluster,
        })
      }
      const tx = decodeSignedTx(text)
      if (tx) {
        return {
          kind: "legacy_signed_tx" as const,
          transaction: tx,
          message: createSignedTransactionMessage({
            transactionBase64: toBase64(tx.serialize()),
            cluster: this.cluster,
          }),
        }
      }
      return null
    }
    try {
      return { kind: "envelope" as const, message: parseMessage(text) }
    } catch {
      return null
    }
  }

  createMerchantPaymentRequest(options: {
    recipient: string
    amount: number
    asset?: AssetDescriptor
    memo?: string
    expiresAt?: number
  }): PaymentRequestMessage {
    return createPaymentRequest({
      recipient: options.recipient,
      amount: options.amount,
      asset: options.asset ?? NATIVE_SOL,
      memo: options.memo,
      expiresAt: options.expiresAt,
      cluster: this.cluster,
    })
  }

  prepareSolTransfer(options: {
    from: PublicKey
    to: PublicKey
    lamports: number
    blockhash: string
  }) {
    return buildSolTransfer(options)
  }

  /**
   * Sign a SOL transfer with a Keypair.
   * Host wallets MAY replace this with a hardware or WDK signer adapter.
   */
  signSolTransfer(options: {
    keypair: Keypair
    to: string
    lamports: number
    blockhash: string
    exchangeId?: string
  }) {
    const tx = buildSolTransfer({
      from: options.keypair.publicKey,
      to: new PublicKey(options.to),
      lamports: options.lamports,
      blockhash: options.blockhash,
    })
    tx.sign(options.keypair)
    return this.packageSignedTransaction(tx, options.exchangeId)
  }

  prepareSplTransfer(options: {
    from: PublicKey
    to: PublicKey
    mint: PublicKey
    amount: number
    decimals: number
    blockhash: string
  }) {
    return buildSplTransfer(options)
  }

  /** Sign an SPL token transfer (USDT / test USDT) with a Keypair. */
  signSplTransfer(options: {
    keypair: Keypair
    to: string
    mint: string
    amount: number
    decimals: number
    blockhash: string
    exchangeId?: string
  }) {
    const tx = signSplTransfer(options)
    return this.packageSignedTransaction(tx, options.exchangeId)
  }

  /** Sign a pre-built transaction with any protocol signer (Keypair or WDK adapter). */
  async signWithSigner(options: {
    signer: ProtocolSigner
    transaction: Transaction
    exchangeId?: string
  }) {
    const signed = await options.signer.signTransaction(options.transaction)
    return this.packageSignedTransaction(signed, options.exchangeId)
  }

  async readTokenBalance(owner: string, mint: string) {
    return readTokenBalance(this.connection, owner, mint)
  }

  verifySolTransfer(tx: Transaction, recentBlockhashes: string[]) {
    return verifyTransfer(tx, recentBlockhashes)
  }

  verifySplTransfer(
    tx: Transaction,
    recentBlockhashes: string[],
    expected?: Pick<AssetDescriptor, "mint" | "decimals"> & { amount?: number },
  ) {
    return verifySplTransfer(tx, recentBlockhashes, expected)
  }

  private packageSignedTransaction(tx: Transaction, exchangeId?: string) {
    const serialized = tx.serialize()
    const message = createSignedTransactionMessage({
      transactionBase64: toBase64(serialized),
      cluster: this.cluster,
      exchangeId,
    })
    return {
      transaction: tx,
      legacyQr: encodeSignedTx(tx),
      message,
      messageJson: serializeMessage(message),
    }
  }

  async relaySubmit(options: {
    serialized: Uint8Array
    blockhash: string
    lastValidBlockHeight: number
    exchangeId?: string
    confirm?: boolean
  }) {
    const confirmation =
      options.confirm === false
        ? undefined
        : {
            blockhash: options.blockhash,
            lastValidBlockHeight: options.lastValidBlockHeight,
          }

    const result = await submitSignedTransaction(
      this.connection,
      options.serialized,
      confirmation,
      "confirmed",
    ).catch((error) => {
      if (error instanceof ProtocolError) throw error
      throw new ProtocolError(ProtocolErrorCode.SUBMISSION_REJECTED, "relay submit failed", error)
    })

    const state = result.state
    return {
      ...result,
      statusMessage: createSubmissionStatus({
        state,
        signature: result.signature,
        observedCommitment: state === "finalized" ? "finalized" : state === "confirmed" ? "confirmed" : null,
        cluster: this.cluster,
        exchangeId: options.exchangeId,
      }),
    }
  }

  async verifySettlement(signature: string): Promise<TransactionState> {
    return observeSignature(this.connection, signature)
  }

  decodeSignedTransactionBytes(messageJsonOrLegacy: string) {
    if (isLegacyQrPayload(messageJsonOrLegacy)) {
      const tx = decodeSignedTx(messageJsonOrLegacy)
      if (!tx) throw new ProtocolError(ProtocolErrorCode.INVALID_TRANSACTION, "invalid legacy signed tx")
      return tx
    }
    const message = parseMessage(messageJsonOrLegacy)
    if (message.type !== "signed_transaction") {
      throw new ProtocolError(ProtocolErrorCode.INVALID_TRANSACTION, "expected signed_transaction message")
    }
    return Transaction.from(fromBase64(message.transaction))
  }
}
