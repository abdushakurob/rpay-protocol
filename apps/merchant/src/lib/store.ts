import type { PaymentRequestMessage, TransactionState } from "@rpay/protocol"
import { loadProfile, savePayoutAddress, type MerchantProfile } from "./auth"

const REQUESTS_KEY = "rpay.merchant.requests"

/** @deprecated use MerchantProfile — kept for type clarity in UI */
export type MerchantSettings = {
  recipient: string
  displayName: string
}

export type MerchantRequestRecord = {
  id: string
  createdAt: number
  request: PaymentRequestMessage
  payload: string
  status: TransactionState | "pending"
  signature?: string
  note?: string
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function profileToSettings(profile: MerchantProfile): MerchantSettings | null {
  if (!profile.payoutAddress) return null
  return { displayName: profile.shopName, recipient: profile.payoutAddress }
}

export function loadSettings(): MerchantSettings | null {
  const profile = loadProfile()
  if (!profile) return null
  return profileToSettings(profile)
}

export function saveSettings(settings: MerchantSettings) {
  savePayoutAddress(settings.recipient)
}

export function loadRequests(): MerchantRequestRecord[] {
  return readJson<MerchantRequestRecord[]>(REQUESTS_KEY, []).sort((a, b) => b.createdAt - a.createdAt)
}

export function saveRequests(requests: MerchantRequestRecord[]) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests))
}

export function upsertRequest(record: MerchantRequestRecord) {
  const next = loadRequests().filter((item) => item.id !== record.id)
  next.unshift(record)
  saveRequests(next)
  return next
}
