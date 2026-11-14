import { isSettledState, type PaymentRequestMessage, type TransactionState } from "@rpay/protocol"
import { loadProfile, savePayoutAddress, type MerchantProfile } from "./auth"
import { formatRequestAmount } from "./client"

const REQUESTS_KEY = "rpay.merchant.requests"

/** @deprecated use MerchantProfile — kept for type clarity in UI */
export type MerchantSettings = {
  recipient: string
  displayName: string
}

export type MerchantUiStatus = TransactionState | "pending" | "cancelled"

export type MerchantRequestRecord = {
  id: string
  createdAt: number
  request: PaymentRequestMessage
  payload: string
  status: MerchantUiStatus
  signature?: string
  note?: string
}

export type VolumeRange = 7 | 30

export type DailyVolumePoint = {
  dayStart: number
  label: string
  sol: number
  usdt: number
}

export type AssetMix = {
  solShare: number
  usdtShare: number
  solAmount: number
  usdtAmount: number
  hasUsdt: boolean
}

export type SettledTotals = {
  count: number
  sol: number
  usdt: number
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

function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function isSol(request: PaymentRequestMessage) {
  return request.asset.kind === "native_sol"
}

function uiAmount(request: PaymentRequestMessage) {
  return request.amount / 10 ** request.asset.decimals
}

export function isPaidStatus(status: MerchantUiStatus) {
  return status !== "pending" && status !== "cancelled" && isSettledState(status as TransactionState)
}

export function isWaitingStatus(status: MerchantUiStatus) {
  return status === "pending" || status === "submitted" || status === "signed" || status === "transferred"
}

export function isFailedStatus(status: MerchantUiStatus) {
  return status === "failed"
}

export function isCancelledStatus(status: MerchantUiStatus) {
  return status === "cancelled" || status === "expired"
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

export function clearRequests() {
  saveRequests([])
  return [] as MerchantRequestRecord[]
}

export function upsertRequest(record: MerchantRequestRecord) {
  const next = loadRequests().filter((item) => item.id !== record.id)
  next.unshift(record)
  saveRequests(next)
  return next
}

export function cancelRequest(id: string) {
  const current = loadRequests().find((item) => item.id === id)
  if (!current) return loadRequests()
  if (isPaidStatus(current.status)) return loadRequests()
  return upsertRequest({
    ...current,
    status: "cancelled",
    note: current.note ?? "Cancelled by merchant",
  })
}

export function pendingRequests(requests: MerchantRequestRecord[] = loadRequests()) {
  return requests.filter((item) => isWaitingStatus(item.status))
}

export function recentRequests(requests: MerchantRequestRecord[] = loadRequests(), limit = 5) {
  return requests.slice(0, limit)
}

function settledInWindow(requests: MerchantRequestRecord[], from: number, to: number): SettledTotals {
  let count = 0
  let sol = 0
  let usdt = 0
  for (const item of requests) {
    if (!isPaidStatus(item.status)) continue
    if (item.createdAt < from || item.createdAt >= to) continue
    count += 1
    const amount = uiAmount(item.request)
    if (isSol(item.request)) sol += amount
    else usdt += amount
  }
  return { count, sol, usdt }
}

export function settledToday(requests: MerchantRequestRecord[] = loadRequests(), now = Date.now()): SettledTotals {
  const start = startOfDay(now)
  return settledInWindow(requests, start, start + 86_400_000)
}

export function settledYesterday(requests: MerchantRequestRecord[] = loadRequests(), now = Date.now()): SettledTotals {
  const today = startOfDay(now)
  return settledInWindow(requests, today - 86_400_000, today)
}

export function settledInRange(
  requests: MerchantRequestRecord[] = loadRequests(),
  days: VolumeRange,
  now = Date.now(),
): SettledTotals {
  const end = startOfDay(now) + 86_400_000
  const from = end - days * 86_400_000
  return settledInWindow(requests, from, end)
}

export function todayVsYesterdayPercent(requests: MerchantRequestRecord[] = loadRequests(), now = Date.now()) {
  const today = settledToday(requests, now)
  const yesterday = settledYesterday(requests, now)
  const todayTotal = today.sol + today.usdt
  const yesterdayTotal = yesterday.sol + yesterday.usdt
  if (yesterdayTotal <= 0) return null
  return ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
}

export function dailyVolumeSeries(
  requests: MerchantRequestRecord[] = loadRequests(),
  days: VolumeRange,
  now = Date.now(),
): DailyVolumePoint[] {
  const endDay = startOfDay(now)
  const points: DailyVolumePoint[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = endDay - i * 86_400_000
    const totals = settledInWindow(requests, dayStart, dayStart + 86_400_000)
    points.push({
      dayStart,
      label: new Date(dayStart).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sol: totals.sol,
      usdt: totals.usdt,
    })
  }
  return points
}

export function assetMix(
  requests: MerchantRequestRecord[] = loadRequests(),
  days: VolumeRange,
  now = Date.now(),
): AssetMix {
  const totals = settledInRange(requests, days, now)
  const sum = totals.sol + totals.usdt
  if (sum <= 0) {
    return { solShare: 0, usdtShare: 0, solAmount: 0, usdtAmount: 0, hasUsdt: totals.usdt > 0 }
  }
  return {
    solShare: (totals.sol / sum) * 100,
    usdtShare: (totals.usdt / sum) * 100,
    solAmount: totals.sol,
    usdtAmount: totals.usdt,
    hasUsdt: totals.usdt > 0 || requests.some((r) => !isSol(r.request)),
  }
}

export function exportRequestsCsv(requests: MerchantRequestRecord[] = loadRequests()) {
  const header = ["requestId", "createdAt", "amount", "asset", "memo", "status", "signature"]
  const rows = requests.map((item) => [
    item.request.requestId,
    new Date(item.createdAt).toISOString(),
    String(uiAmount(item.request)),
    item.request.asset.symbol,
    item.request.memo ?? "",
    item.status,
    item.signature ?? "",
  ])
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
  }
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}

export function downloadRequestsCsv(requests: MerchantRequestRecord[] = loadRequests()) {
  const csv = exportRequestsCsv(requests)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `rpay-merchant-charges-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function statusLabel(status: MerchantUiStatus) {
  if (status === "pending") return "Waiting"
  if (status === "cancelled" || status === "expired") return "Cancelled"
  if (status === "confirmed" || status === "finalized") return "Paid"
  if (status === "failed") return "Failed"
  if (status === "submitted") return "Processing"
  return status
}

export function shortId(value: string, head = 6, tail = 4) {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

export function formatRelativeTime(ms: number, now = Date.now()) {
  const delta = Math.max(0, now - ms)
  const min = Math.floor(delta / 60_000)
  if (min < 1) return "Just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function filterRequests(
  requests: MerchantRequestRecord[],
  options: { filter: "all" | "waiting" | "paid" | "failed"; query: string },
) {
  const q = options.query.trim().toLowerCase()
  return requests.filter((item) => {
    if (options.filter === "waiting" && !isWaitingStatus(item.status)) return false
    if (options.filter === "paid" && !isPaidStatus(item.status)) return false
    if (options.filter === "failed" && !isFailedStatus(item.status) && !isCancelledStatus(item.status)) return false
    if (!q) return true
    const hay = [
      item.id,
      item.request.requestId,
      item.request.memo ?? "",
      formatRequestAmount(item.request),
      item.signature ?? "",
      statusLabel(item.status),
    ]
      .join(" ")
      .toLowerCase()
    return hay.includes(q)
  })
}
