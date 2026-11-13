import type { TransactionState } from "./types"

/**
 * Allowed transitions for the conceptual lifecycle (docs/03).
 * Clients MUST NOT jump to confirmed/finalized from local acknowledgements alone.
 */
const ALLOWED: Record<TransactionState, readonly TransactionState[]> = {
  draft: ["context_ready", "failed", "expired"],
  context_ready: ["prepared", "failed", "expired"],
  prepared: ["signed", "failed", "expired"],
  signed: ["transferred", "failed", "expired"],
  transferred: ["submitted", "failed", "expired", "unknown"],
  submitted: ["confirmed", "failed", "expired", "unknown"],
  confirmed: ["finalized", "failed"],
  finalized: [],
  failed: [],
  expired: [],
  unknown: ["submitted", "confirmed", "finalized", "failed", "expired"],
}

export function canTransition(from: TransactionState, to: TransactionState) {
  if (from === to) return true
  return ALLOWED[from].includes(to)
}

export function assertTransition(from: TransactionState, to: TransactionState) {
  if (!canTransition(from, to)) {
    throw new Error(`invalid lifecycle transition: ${from} -> ${to}`)
  }
}

/** States that imply on-chain settlement was independently observed. */
export function isSettledState(state: TransactionState) {
  return state === "confirmed" || state === "finalized"
}

/** Local or transport states that MUST NOT be shown as successful payment. */
export function isPreSettlementState(state: TransactionState) {
  return (
    state === "draft" ||
    state === "context_ready" ||
    state === "prepared" ||
    state === "signed" ||
    state === "transferred" ||
    state === "submitted"
  )
}

export function labelForState(state: TransactionState): string {
  switch (state) {
    case "draft":
      return "Draft"
    case "context_ready":
      return "Network context ready"
    case "prepared":
      return "Prepared"
    case "signed":
      return "Signed locally"
    case "transferred":
      return "Transferred to relay"
    case "submitted":
      return "Submitted"
    case "confirmed":
      return "Confirmed"
    case "finalized":
      return "Finalized"
    case "failed":
      return "Failed"
    case "expired":
      return "Expired"
    case "unknown":
      return "Unknown outcome"
  }
}
