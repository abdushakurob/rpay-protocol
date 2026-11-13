import type { ProtocolId, ProtocolVersion, SolanaCluster } from "./version"

/** Protocol roles (docs/00-introduction.md, docs/02). */
export type ProtocolRole = "payer" | "relay" | "verifier" | "recipient" | "merchant"

/**
 * Transaction lifecycle states (docs/03-transaction-lifecycle.md).
 * A relay acknowledgement is never settlement.
 */
export type TransactionState =
  | "draft"
  | "context_ready"
  | "prepared"
  | "signed"
  | "transferred"
  | "submitted"
  | "confirmed"
  | "finalized"
  | "failed"
  | "expired"
  | "unknown"

export type MessageType =
  | "payment_request"
  | "network_context"
  | "signed_transaction"
  | "submission_status"
  | "settlement_receipt"
  | "protocol_error"

export type AssetKind = "native_sol" | "spl_token"

export type AssetDescriptor = {
  kind: AssetKind
  /** Base58 mint for SPL; omitted for native SOL. */
  mint?: string
  symbol: string
  decimals: number
}

export type PaymentAmount = {
  /** Smallest unit: lamports for SOL, raw token amount for SPL. */
  amount: number
  asset: AssetDescriptor
}

export type ProtocolEnvelopeBase = {
  protocol: ProtocolId
  version: ProtocolVersion
  type: MessageType
  exchangeId: string
  cluster: SolanaCluster
}

export type NetworkContextMessage = ProtocolEnvelopeBase & {
  type: "network_context"
  recentBlockhash: string
  lastValidBlockHeight: number
  /** Block height observed when this context was created. */
  currentBlockHeight: number
  /** Unix ms when the relay created this context. */
  fetchedAt: number
  /**
   * Absolute unix ms when this context should be treated as expired in UIs.
   * Derived from remaining slots at fetch time; chain height remains authoritative at submit.
   */
  expiresAt: number
  /** Slot duration (ms) used to derive expiresAt. */
  slotMs: number
  feePayer?: string
}

export type SignedTransactionMessage = ProtocolEnvelopeBase & {
  type: "signed_transaction"
  transactionEncoding: "base64"
  transaction: string
}

export type SubmissionStatusMessage = ProtocolEnvelopeBase & {
  type: "submission_status"
  signature: string | null
  state: TransactionState
  observedCommitment: "processed" | "confirmed" | "finalized" | null
  error: string | null
}

export type PaymentRequestMessage = ProtocolEnvelopeBase & {
  type: "payment_request"
  requestId: string
  recipient: string
  amount: number
  asset: AssetDescriptor
  memo?: string
  expiresAt?: number
}

export type SettlementReceiptMessage = ProtocolEnvelopeBase & {
  type: "settlement_receipt"
  signature: string
  state: "confirmed" | "finalized"
  observedCommitment: "confirmed" | "finalized"
  recipient: string
  amount: number
  asset: AssetDescriptor
}

export type ProtocolErrorMessage = ProtocolEnvelopeBase & {
  type: "protocol_error"
  code: string
  message: string
}

export type ProtocolMessage =
  | NetworkContextMessage
  | SignedTransactionMessage
  | SubmissionStatusMessage
  | PaymentRequestMessage
  | SettlementReceiptMessage
  | ProtocolErrorMessage

export type Signer = {
  publicKey: string
  signTransaction: (serializedMessage: Uint8Array) => Promise<Uint8Array> | Uint8Array
}
