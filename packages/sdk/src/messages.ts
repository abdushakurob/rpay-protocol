import { ProtocolError, ProtocolErrorCode } from "./errors"
import { createExchangeId } from "./transport/encoding"
import type {
  NetworkContextMessage,
  PaymentRequestMessage,
  ProtocolMessage,
  SignedTransactionMessage,
  SubmissionStatusMessage,
  AssetDescriptor,
  TransactionState,
} from "./types"
import { DEFAULT_CLUSTER, PROTOCOL_ID, PROTOCOL_VERSION, SUPPORTED_CLUSTERS, type SolanaCluster } from "./version"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function assertCluster(value: unknown): SolanaCluster {
  if (typeof value !== "string" || !SUPPORTED_CLUSTERS.includes(value as SolanaCluster)) {
    throw new ProtocolError(ProtocolErrorCode.WRONG_CLUSTER, `unsupported cluster: ${String(value)}`)
  }
  return value as SolanaCluster
}

function assertVersion(value: unknown) {
  if (value !== PROTOCOL_VERSION) {
    throw new ProtocolError(ProtocolErrorCode.UNSUPPORTED_VERSION, `unsupported protocol version: ${String(value)}`)
  }
}

function baseFields(type: ProtocolMessage["type"], cluster: SolanaCluster, exchangeId?: string) {
  return {
    protocol: PROTOCOL_ID,
    version: PROTOCOL_VERSION,
    type,
    exchangeId: exchangeId ?? createExchangeId(),
    cluster,
  } as const
}

export function createNetworkContext(options: {
  recentBlockhash: string
  lastValidBlockHeight: number
  currentBlockHeight: number
  fetchedAt?: number
  expiresAt?: number
  slotMs?: number
  cluster?: SolanaCluster
  exchangeId?: string
  feePayer?: string
}): NetworkContextMessage {
  if (
    !options.recentBlockhash ||
    !Number.isInteger(options.lastValidBlockHeight) ||
    !Number.isInteger(options.currentBlockHeight)
  ) {
    throw new ProtocolError(ProtocolErrorCode.INVALID_CONTEXT, "invalid network context fields")
  }
  const fetchedAt = options.fetchedAt ?? Date.now()
  const slotMs = options.slotMs ?? 400
  const remainingBlocks = Math.max(0, options.lastValidBlockHeight - options.currentBlockHeight)
  const expiresAt = options.expiresAt ?? fetchedAt + remainingBlocks * slotMs
  return {
    ...baseFields("network_context", options.cluster ?? DEFAULT_CLUSTER, options.exchangeId),
    type: "network_context",
    recentBlockhash: options.recentBlockhash,
    lastValidBlockHeight: options.lastValidBlockHeight,
    currentBlockHeight: options.currentBlockHeight,
    fetchedAt,
    expiresAt,
    slotMs,
    feePayer: options.feePayer,
  }
}

export function createSignedTransactionMessage(options: {
  transactionBase64: string
  cluster?: SolanaCluster
  exchangeId?: string
}): SignedTransactionMessage {
  if (!options.transactionBase64) {
    throw new ProtocolError(ProtocolErrorCode.INVALID_TRANSACTION, "missing transaction payload")
  }
  return {
    ...baseFields("signed_transaction", options.cluster ?? DEFAULT_CLUSTER, options.exchangeId),
    type: "signed_transaction",
    transactionEncoding: "base64",
    transaction: options.transactionBase64,
  }
}

export function createSubmissionStatus(options: {
  state: TransactionState
  signature?: string | null
  observedCommitment?: SubmissionStatusMessage["observedCommitment"]
  error?: string | null
  cluster?: SolanaCluster
  exchangeId?: string
}): SubmissionStatusMessage {
  return {
    ...baseFields("submission_status", options.cluster ?? DEFAULT_CLUSTER, options.exchangeId),
    type: "submission_status",
    signature: options.signature ?? null,
    state: options.state,
    observedCommitment: options.observedCommitment ?? null,
    error: options.error ?? null,
  }
}

export function createPaymentRequest(options: {
  recipient: string
  amount: number
  asset: AssetDescriptor
  requestId?: string
  memo?: string
  expiresAt?: number
  cluster?: SolanaCluster
  exchangeId?: string
}): PaymentRequestMessage {
  if (!options.recipient || !Number.isSafeInteger(options.amount) || options.amount <= 0) {
    throw new ProtocolError(ProtocolErrorCode.INVALID_PAYMENT_REQUEST, "invalid payment request fields")
  }
  return {
    ...baseFields("payment_request", options.cluster ?? DEFAULT_CLUSTER, options.exchangeId),
    type: "payment_request",
    requestId: options.requestId ?? createExchangeId(),
    recipient: options.recipient,
    amount: options.amount,
    asset: options.asset,
    memo: options.memo,
    expiresAt: options.expiresAt,
  }
}

export function serializeMessage(message: ProtocolMessage) {
  return JSON.stringify(message)
}

export function parseMessage(raw: string): ProtocolMessage {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ProtocolError(ProtocolErrorCode.MALFORMED_ENVELOPE, "message is not valid JSON")
  }
  return validateMessage(parsed)
}

export function validateMessage(value: unknown): ProtocolMessage {
  if (!isRecord(value)) {
    throw new ProtocolError(ProtocolErrorCode.MALFORMED_ENVELOPE, "message must be an object")
  }
  if (value.protocol !== PROTOCOL_ID) {
    throw new ProtocolError(ProtocolErrorCode.MALFORMED_ENVELOPE, "missing rpay protocol marker")
  }
  assertVersion(value.version)
  const cluster = assertCluster(value.cluster)
  if (typeof value.exchangeId !== "string" || !value.exchangeId) {
    throw new ProtocolError(ProtocolErrorCode.MALFORMED_ENVELOPE, "missing exchangeId")
  }
  if (typeof value.type !== "string") {
    throw new ProtocolError(ProtocolErrorCode.MALFORMED_ENVELOPE, "missing message type")
  }

  switch (value.type) {
    case "network_context": {
      if (typeof value.recentBlockhash !== "string" || !Number.isInteger(value.lastValidBlockHeight)) {
        throw new ProtocolError(ProtocolErrorCode.INVALID_CONTEXT, "invalid network_context payload")
      }
      const fetchedAt = typeof value.fetchedAt === "number" ? value.fetchedAt : Date.now()
      const currentBlockHeight =
        typeof value.currentBlockHeight === "number" ? value.currentBlockHeight : value.lastValidBlockHeight
      const slotMs = typeof value.slotMs === "number" ? value.slotMs : 400
      const expiresAt =
        typeof value.expiresAt === "number"
          ? value.expiresAt
          : fetchedAt + Math.max(0, (value.lastValidBlockHeight as number) - (currentBlockHeight as number)) * slotMs
      return {
        protocol: PROTOCOL_ID,
        version: PROTOCOL_VERSION,
        type: "network_context",
        exchangeId: value.exchangeId,
        cluster,
        recentBlockhash: value.recentBlockhash,
        lastValidBlockHeight: value.lastValidBlockHeight as number,
        currentBlockHeight: currentBlockHeight as number,
        fetchedAt,
        expiresAt,
        slotMs,
        feePayer: typeof value.feePayer === "string" ? value.feePayer : undefined,
      }
    }
    case "signed_transaction": {
      if (value.transactionEncoding !== "base64" || typeof value.transaction !== "string") {
        throw new ProtocolError(ProtocolErrorCode.INVALID_TRANSACTION, "invalid signed_transaction payload")
      }
      return {
        protocol: PROTOCOL_ID,
        version: PROTOCOL_VERSION,
        type: "signed_transaction",
        exchangeId: value.exchangeId,
        cluster,
        transactionEncoding: "base64",
        transaction: value.transaction,
      }
    }
    case "submission_status": {
      return {
        protocol: PROTOCOL_ID,
        version: PROTOCOL_VERSION,
        type: "submission_status",
        exchangeId: value.exchangeId,
        cluster,
        signature: typeof value.signature === "string" ? value.signature : null,
        state: value.state as TransactionState,
        observedCommitment: (value.observedCommitment as SubmissionStatusMessage["observedCommitment"]) ?? null,
        error: typeof value.error === "string" ? value.error : null,
      }
    }
    case "payment_request": {
      if (
        typeof value.requestId !== "string" ||
        typeof value.recipient !== "string" ||
        !Number.isSafeInteger(value.amount) ||
        !isRecord(value.asset)
      ) {
        throw new ProtocolError(ProtocolErrorCode.INVALID_PAYMENT_REQUEST, "invalid payment_request payload")
      }
      return {
        protocol: PROTOCOL_ID,
        version: PROTOCOL_VERSION,
        type: "payment_request",
        exchangeId: value.exchangeId,
        cluster,
        requestId: value.requestId,
        recipient: value.recipient,
        amount: value.amount as number,
        asset: value.asset as AssetDescriptor,
        memo: typeof value.memo === "string" ? value.memo : undefined,
        expiresAt: typeof value.expiresAt === "number" ? value.expiresAt : undefined,
      }
    }
    case "settlement_receipt":
    case "protocol_error":
      return value as ProtocolMessage
    default:
      throw new ProtocolError(ProtocolErrorCode.MALFORMED_ENVELOPE, `unsupported message type: ${value.type}`)
  }
}

/** Claims in status messages are untrusted until independently verified on-chain. */
export function statusIsClaimOnly(_message: SubmissionStatusMessage) {
  return true
}
