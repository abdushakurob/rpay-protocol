import { dbAll, dbPut } from "../db"

export type PaymentStatus = "waiting" | "on-the-way" | "delivered" | "failed"

export type Payment = {
  id: string
  signature?: string
  direction: "out" | "in" | "pass"
  name: string
  counterparty: string
  lamports: number
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

export async function payments() {
  const all = await dbAll<Payment>("activity")
  return all.sort((a, b) => b.at - a.at)
}

export async function remember(payment: Payment) {
  await dbPut("activity", payment)
}

export async function rememberAll(items: Payment[]) {
  await Promise.all(items.map((item) => dbPut("activity", item)))
}
