import type { Connection } from "@solana/web3.js"
import { ProtocolError, ProtocolErrorCode } from "../errors"
import type { TransactionState } from "../types"

export type BlockhashConfirmation = {
  blockhash: string
  lastValidBlockHeight: number
}

export type SubmitResult = {
  signature: string
  state: Extract<TransactionState, "submitted" | "confirmed" | "finalized" | "failed" | "unknown">
}

/**
 * Submit exact signed bytes. Relays MUST NOT rewrite signed message fields.
 * A returned signature alone is not settlement.
 */
export async function submitSignedTransaction(
  connection: Connection,
  serialized: Uint8Array,
  confirmation?: BlockhashConfirmation,
  commitment: "confirmed" | "finalized" = "confirmed",
): Promise<SubmitResult> {
  let signature: string
  try {
    signature = await connection.sendRawTransaction(serialized)
  } catch (error) {
    throw new ProtocolError(
      ProtocolErrorCode.SUBMISSION_REJECTED,
      error instanceof Error ? error.message : "submission rejected",
      error,
    )
  }

  if (!confirmation) {
    return { signature, state: "submitted" }
  }

  try {
    const result = await connection.confirmTransaction(
      {
        signature,
        blockhash: confirmation.blockhash,
        lastValidBlockHeight: confirmation.lastValidBlockHeight,
      },
      commitment,
    )
    if (result.value.err) {
      return { signature, state: "failed" }
    }
    return { signature, state: commitment === "finalized" ? "finalized" : "confirmed" }
  } catch (error) {
    throw new ProtocolError(
      ProtocolErrorCode.UNKNOWN_OUTCOME,
      error instanceof Error ? error.message : "confirmation timed out or unknown",
      { signature, error },
    )
  }
}

export async function observeSignature(
  connection: Connection,
  signature: string,
): Promise<Extract<TransactionState, "submitted" | "confirmed" | "finalized" | "failed" | "unknown">> {
  try {
    const statuses = await connection.getSignatureStatuses([signature])
    const value = statuses.value[0]
    if (!value) return "unknown"
    if (value.err) return "failed"
    if (value.confirmationStatus === "finalized") return "finalized"
    if (value.confirmationStatus === "confirmed") return "confirmed"
    if (value.confirmationStatus === "processed") return "submitted"
    return "unknown"
  } catch {
    return "unknown"
  }
}
