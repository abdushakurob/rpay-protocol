import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { remember, rememberAll, payments, type Payment } from "../activity/store"
import { nameForAddress } from "../directory/directory"
import { shortAddress } from "../format"
import { buildTransfer } from "../protocol/transfer"
import { encodeSignedTx } from "../protocol/codes"

export const RPC_URL = import.meta.env.VITE_RPC_URL || "https://api.devnet.solana.com"

export const connection = new Connection(RPC_URL, "confirmed")

const FEE = 5_000

export function receiptUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

export async function readBalance(publicKey: string) {
  return connection.getBalance(new PublicKey(publicKey), "confirmed")
}

export async function fundDevnet(publicKey: string) {
  const signature = await connection.requestAirdrop(new PublicKey(publicKey), 1_000_000_000)
  const started = Date.now()
  while (Date.now() - started < 40_000) {
    const status = await connection.getSignatureStatuses([signature])
    const value = status.value[0]
    if (value?.err) throw new Error("airdrop")
    if (value?.confirmationStatus === "confirmed" || value?.confirmationStatus === "finalized") return signature
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error("airdrop")
}

export async function freshBlockhash() {
  return connection.getLatestBlockhash("confirmed")
}

export function signTransfer(options: {
  keypair: Keypair
  to: string
  lamports: number
  blockhash: string
}) {
  const tx = buildTransfer({
    from: options.keypair.publicKey,
    to: new PublicKey(options.to),
    lamports: options.lamports,
    blockhash: options.blockhash,
  })
  tx.sign(options.keypair)
  const raw = tx.signatures[0]?.signature
  if (!raw) throw new Error("unsigned")
  return { tx, code: encodeSignedTx(tx), signature: encodeBase58(raw) }
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function encodeBase58(bytes: Uint8Array) {
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1
  const digits = [0]
  for (let index = zeros; index < bytes.length; index += 1) {
    let carry = bytes[index]
    for (let digit = 0; digit < digits.length; digit += 1) {
      carry += digits[digit] * 256
      digits[digit] = carry % 58
      carry = Math.floor(carry / 58)
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = Math.floor(carry / 58)
    }
  }
  let out = "1".repeat(zeros)
  for (let index = digits.length - 1; index >= 0; index -= 1) out += ALPHABET[digits[index]]
  return out
}

export async function submitSigned(serialized: Uint8Array, blockhash: string, lastValidBlockHeight: number) {
  const signature = await connection.sendRawTransaction(serialized)
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
  return signature
}

export async function sendOnline(options: { keypair: Keypair; to: string; lamports: number; balance: number }) {
  if (options.balance < options.lamports + FEE) throw new Error("funds")
  const latest = await freshBlockhash()
  const signed = signTransfer({ ...options, blockhash: latest.blockhash })
  const signature = await submitSigned(signed.tx.serialize(), latest.blockhash, latest.lastValidBlockHeight)
  return signature
}

export async function syncPayments(owner: string) {
  const local = await payments()
  if (!navigator.onLine) return local
  try {
    const signatures = await connection.getSignaturesForAddress(new PublicKey(owner), { limit: 8 })
    const parsed = await connection.getParsedTransactions(
      signatures.map((item) => item.signature),
      { maxSupportedTransactionVersion: 0 },
    )
    const chainItems: Payment[] = []
    for (let index = 0; index < parsed.length; index += 1) {
      const tx = parsed[index]
      const listed = signatures[index]
      if (!tx) continue
      const instruction = tx.transaction.message.instructions.find(
        (item) => "parsed" in item && item.program === "system" && item.parsed.type === "transfer",
      )
      if (!instruction || !("parsed" in instruction)) continue
      const info = instruction.parsed.info as { source: string; destination: string; lamports: number }
      const outgoing = info.source === owner
      if (!outgoing && info.destination !== owner) continue
      const counterparty = outgoing ? info.destination : info.source
      const known = await nameForAddress(counterparty)
      const localMatch = local.find((item) => item.signature === listed.signature)
      if (localMatch?.direction === "pass") continue
      chainItems.push({
        id: listed.signature,
        signature: listed.signature,
        direction: outgoing ? "out" : "in",
        name: known?.alias || shortAddress(counterparty),
        counterparty,
        lamports: info.lamports,
        status: tx.meta?.err ? "failed" : "delivered",
        at: (listed.blockTime ?? Math.floor(Date.now() / 1000)) * 1000,
      })
    }
    const chainIds = new Set(chainItems.map((item) => item.signature))
    const kept = local.filter((item) => !item.signature || !chainIds.has(item.signature) || item.direction === "pass")
    await rememberAll([...kept, ...chainItems])
    return payments()
  } catch {
    return local
  }
}

export async function savePayment(payment: Payment) {
  await remember(payment)
}
