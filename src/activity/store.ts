import { formatTokenAmount } from "@rpay/protocol"
import { dbAll, dbPut } from "../db"
import { formatSol } from "../format"

export type PaymentStatus = "waiting" | "on-the-way" | "delivered" | "failed"

export type PaymentAsset =
  | { kind: "sol"; lamports: number }
  | { kind: "spl"; amount: number; decimals: number; symbol: string; mint: string }

export type Payment = {
  id: string
  signature?: string
  direction: "out" | "in" | "pass"
  name: string
  counterparty: string
  asset: PaymentAsset
  status: PaymentStatus
  at: number
}

export function paymentLabel(payment: Payment) {
  if (payment.status === "waiting") return "Waiting for them"
  if (payment.status === "on-the-way") return "On its way"
  if (payment.status === "delivered") return "Delivered"
  if (payment.direction === "pass") return "Couldn't pass this on."
  return "Couldn't send that."
}

export function paymentAmountText(payment: Payment) {
  if (payment.asset.kind === "spl") {
    return `${formatTokenAmount(payment.asset.amount, payment.asset.decimals)} ${payment.asset.symbol}`
  }
  return `${formatSol(payment.asset.lamports)} SOL`
}

export async function payments() {
  const all = await dbAll<Payment>("activity")
  return all
    .filter((item) => item?.asset?.kind === "sol" || item?.asset?.kind === "spl")
    .sort((a, b) => b.at - a.at)
}

export async function remember(payment: Payment) {
  await dbPut("activity", payment)
}

export async function rememberAll(items: Payment[]) {
  await Promise.all(items.map((item) => dbPut("activity", item)))
}
