/** Recommended error categories (docs/02 §8). */
export const ProtocolErrorCode = {
  UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION",
  WRONG_CLUSTER: "WRONG_CLUSTER",
  INVALID_CONTEXT: "INVALID_CONTEXT",
  INVALID_TRANSACTION: "INVALID_TRANSACTION",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  INVALID_PAYMENT_REQUEST: "INVALID_PAYMENT_REQUEST",
  RPC_UNAVAILABLE: "RPC_UNAVAILABLE",
  BLOCKHASH_EXPIRED: "BLOCKHASH_EXPIRED",
  SUBMISSION_REJECTED: "SUBMISSION_REJECTED",
  CONFIRMATION_TIMEOUT: "CONFIRMATION_TIMEOUT",
  UNKNOWN_OUTCOME: "UNKNOWN_OUTCOME",
  MALFORMED_ENVELOPE: "MALFORMED_ENVELOPE",
} as const

export type ProtocolErrorCode = (typeof ProtocolErrorCode)[keyof typeof ProtocolErrorCode]

export class ProtocolError extends Error {
  readonly code: ProtocolErrorCode
  readonly details?: unknown

  constructor(code: ProtocolErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = "ProtocolError"
    this.code = code
    this.details = details
  }
}

/** UNKNOWN_OUTCOME is not a safe instruction to authorize a second payment. */
export function isUnsafeToRetry(code: ProtocolErrorCode) {
  return code === ProtocolErrorCode.UNKNOWN_OUTCOME || code === ProtocolErrorCode.CONFIRMATION_TIMEOUT
}
