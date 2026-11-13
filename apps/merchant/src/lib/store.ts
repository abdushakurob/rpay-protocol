import type { PaymentRequestMessage, TransactionState } from "@rpay/protocol"

const SETTINGS_KEY = "rpay.merchant.settings"
const REQUESTS_KEY = "rpay.merchant.requests"

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

export function loadSettings(): MerchantSettings | null {
  const value = readJson<MerchantSettings | null>(SETTINGS_KEY, null)
  if (!value?.recipient) return null
  return value
}

export function saveSettings(settings: MerchantSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
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
