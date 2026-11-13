/**
 * Wall-clock expiry for network context.
 *
 * Solana validity is defined by `lastValidBlockHeight`. At context creation we
 * also publish `expiresAt` so UIs can countdown from an absolute timestamp
 * embedded in the shared QR/envelope. Relays MUST still re-check chain height
 * before submit — device clocks can drift.
 */

/** Nominal Solana slot duration used only to derive wall-clock expiresAt at fetch time. */
export const SOLANA_SLOT_MS = 400

export type ExpirySnapshot = {
  expired: boolean
  /** Milliseconds remaining until expiresAt (0 if expired / missing). */
  remainingMs: number
  expiresAt: number | null
  fetchedAt: number | null
  label: string
}

export function deriveExpiresAt(options: {
  fetchedAt: number
  lastValidBlockHeight: number
  currentBlockHeight: number
  slotMs?: number
}) {
  const remainingBlocks = Math.max(0, options.lastValidBlockHeight - options.currentBlockHeight)
  const slotMs = options.slotMs ?? SOLANA_SLOT_MS
  return options.fetchedAt + remainingBlocks * slotMs
}

export function getExpirySnapshot(options: {
  expiresAt?: number | null
  fetchedAt?: number | null
  now?: number
}): ExpirySnapshot {
  const now = options.now ?? Date.now()
  const expiresAt = options.expiresAt ?? null
  const fetchedAt = options.fetchedAt ?? null
  if (!expiresAt) {
    return {
      expired: false,
      remainingMs: 0,
      expiresAt,
      fetchedAt,
      label: "Expiry unknown",
    }
  }
  const remainingMs = Math.max(0, expiresAt - now)
  const expired = remainingMs <= 0
  return {
    expired,
    remainingMs,
    expiresAt,
    fetchedAt,
    label: expired ? "Expired" : formatRemaining(remainingMs),
  }
}

export function formatRemaining(ms: number) {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min <= 0) return `${sec}s left`
  return `${min}:${sec.toString().padStart(2, "0")} left`
}

export function formatExpiryClock(expiresAt: number) {
  return new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

export function isContextExpired(options: {
  expiresAt?: number | null
  lastValidBlockHeight?: number
  currentBlockHeight?: number
  now?: number
}) {
  if (typeof options.currentBlockHeight === "number" && typeof options.lastValidBlockHeight === "number") {
    if (options.currentBlockHeight > options.lastValidBlockHeight) return true
  }
  if (options.expiresAt) return (options.now ?? Date.now()) >= options.expiresAt
  return false
}
