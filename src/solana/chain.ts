import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { RPayClient, associatedTokenAddress, encodeSignedTx } from "@rpay/protocol"
import { remember, rememberAll, payments, type Payment } from "../activity/store"
import { nameForAddress } from "../directory/directory"
import { shortAddress } from "../format"
import { configuredUsdt } from "./assets"

export const RPC_URL = import.meta.env.VITE_RPC_URL || "https://api.devnet.solana.com"

export const connection = new Connection(RPC_URL, "confirmed")

/** Shared protocol client used by the reference wallet. */
export const protocol = new RPayClient({ connection, cluster: "devnet" })

const FEE = 5_000

export function receiptUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

export async function readBalance(publicKey: string) {
  return connection.getBalance(new PublicKey(publicKey), "confirmed")
}

export async function readUsdtBalance(publicKey: string) {
  const asset = configuredUsdt()
  if (!asset?.mint) return null
  return protocol.readTokenBalance(publicKey, asset.mint)
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
  const signed = protocol.signSolTransfer(options)
  const raw = signed.transaction.signatures[0]?.signature
  if (!raw) throw new Error("unsigned")
  return { tx: signed.transaction, code: signed.legacyQr, signature: encodeBase58(raw) }
}

export async function signUsdtTransfer(options: {
  keypair: Keypair
  to: string
  amount: number
  blockhash: string
}) {
  const asset = configuredUsdt()
  if (!asset?.mint) throw new Error("usdt-config")
  // Build with RPay protocol, authorize with Tether WDK (required for USDT).
  const prepared = protocol.prepareSplTransfer({
    from: options.keypair.publicKey,
    to: new PublicKey(options.to),
    mint: new PublicKey(asset.mint),
    amount: options.amount,
    decimals: asset.decimals,
    blockhash: options.blockhash,
  })
  // Lazy-load WDK so the wallet boots even if sodium peers are still resolving.
  const { signTransactionWithWdk } = await import("./wdk")
  const tx = await signTransactionWithWdk(options.keypair, prepared)
  const code = encodeSignedTx(tx)
  const raw = tx.signatures[0]?.signature
  if (!raw) throw new Error("unsigned")
  return { tx, code, signature: encodeBase58(raw), asset }
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
  const result = await protocol.relaySubmit({
    serialized,
    blockhash,
    lastValidBlockHeight,
  })
  return result.signature
}

export async function sendOnline(options: { keypair: Keypair; to: string; lamports: number; balance: number }) {
  if (options.balance < options.lamports + FEE) throw new Error("funds")
  const latest = await freshBlockhash()
  const signed = signTransfer({ ...options, blockhash: latest.blockhash })
  const signature = await submitSigned(signed.tx.serialize(), latest.blockhash, latest.lastValidBlockHeight)
  return signature
}

export async function sendUsdtOnline(options: {
  keypair: Keypair
  to: string
  amount: number
  tokenBalance: number
  solBalance: number
}) {
  if (options.tokenBalance < options.amount) throw new Error("funds")
  if (options.solBalance < FEE) throw new Error("fee")
  const context = await protocol.fetchNetworkContext()
  if (Date.now() >= context.expiresAt) throw new Error("expired")
  const signed = await signUsdtTransfer({ ...options, blockhash: context.recentBlockhash })
  await protocol.assertContextStillValid(context)
  const signature = await submitSigned(
    signed.tx.serialize(),
    context.recentBlockhash,
    context.lastValidBlockHeight,
  )
  return signature
}

type ParsedIx = {
  program?: string
  parsed?: { type?: string; info?: Record<string, unknown> }
}

function asParsedInstructions(tx: NonNullable<Awaited<ReturnType<typeof connection.getParsedTransactions>>>[number]) {
  if (!tx) return [] as ParsedIx[]
  const top = tx.transaction.message.instructions as ParsedIx[]
  const inner = (tx.meta?.innerInstructions ?? []).flatMap((group) => group.instructions as ParsedIx[])
  return [...top, ...inner]
}

async function ownerOfTokenAccount(ata: string) {
  try {
    const info = await connection.getParsedAccountInfo(new PublicKey(ata), "confirmed")
    const data = info.value?.data
    if (data && typeof data === "object" && "parsed" in data) {
      const owner = (data.parsed as { info?: { owner?: string } })?.info?.owner
      if (owner) return owner
    }
  } catch {
    // Fall through to ATA string.
  }
  return ata
}

async function collectSignatures(owner: string) {
  const usdt = configuredUsdt()
  const ownerKey = new PublicKey(owner)
  const lists = [await connection.getSignaturesForAddress(ownerKey, { limit: 12 })]
  if (usdt?.mint) {
    const ata = associatedTokenAddress(ownerKey, new PublicKey(usdt.mint))
    lists.push(await connection.getSignaturesForAddress(ata, { limit: 12 }))
  }
  const seen = new Set<string>()
  const merged = []
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.signature)) continue
      seen.add(item.signature)
      merged.push(item)
    }
  }
  return merged.slice(0, 16)
}

export async function syncPayments(owner: string) {
  const local = await payments()
  if (!navigator.onLine) return local
  try {
    const usdt = configuredUsdt()
    const ownerAta = usdt?.mint
      ? associatedTokenAddress(new PublicKey(owner), new PublicKey(usdt.mint)).toBase58()
      : null
    const signatures = await collectSignatures(owner)
    const parsed = await connection.getParsedTransactions(
      signatures.map((item) => item.signature),
      { maxSupportedTransactionVersion: 0 },
    )
    const chainItems: Payment[] = []
    const seen = new Set<string>()

    for (let index = 0; index < parsed.length; index += 1) {
      const tx = parsed[index]
      const listed = signatures[index]
      if (!tx) continue
      const localMatch = local.find((item) => item.signature === listed.signature)
      if (localMatch?.direction === "pass") continue
      const at = (listed.blockTime ?? Math.floor(Date.now() / 1000)) * 1000
      const status = tx.meta?.err ? ("failed" as const) : ("delivered" as const)
      const instructions = asParsedInstructions(tx)

      const spl = instructions.find((item) => {
        if (item.program !== "spl-token") return false
        const type = item.parsed?.type
        return type === "transferChecked" || type === "transfer"
      })
      if (spl?.parsed?.info) {
        const info = spl.parsed.info as {
          mint?: string
          source?: string
          destination?: string
          authority?: string
          tokenAmount?: { amount: string; decimals: number }
          amount?: string
        }
        const mint = info.mint ?? usdt?.mint
        if (usdt?.mint && mint === usdt.mint && ownerAta) {
          const raw = Number(info.tokenAmount?.amount ?? info.amount ?? 0)
          const decimals = info.tokenAmount?.decimals ?? usdt.decimals
          const outgoing = info.source === ownerAta || info.authority === owner
          const incoming = info.destination === ownerAta
          if ((outgoing || incoming) && raw > 0 && !seen.has(listed.signature)) {
            let counterparty = outgoing
              ? (info.destination ?? "")
              : (info.authority ?? info.source ?? "")
            if (outgoing && counterparty && counterparty !== owner) {
              counterparty = await ownerOfTokenAccount(counterparty)
            } else if (!outgoing && info.source && info.source !== ownerAta) {
              counterparty = info.authority || (await ownerOfTokenAccount(info.source))
            }
            if (!counterparty) counterparty = owner
            const known = await nameForAddress(counterparty)
            seen.add(listed.signature)
            chainItems.push({
              id: listed.signature,
              signature: listed.signature,
              direction: outgoing ? "out" : "in",
              name: known?.alias || shortAddress(counterparty),
              counterparty,
              asset: {
                kind: "spl",
                amount: raw,
                decimals,
                symbol: usdt.symbol,
                mint: usdt.mint,
              },
              status,
              at,
            })
            continue
          }
        }
      }

      const sol = instructions.find(
        (item) => item.program === "system" && item.parsed?.type === "transfer",
      )
      if (sol?.parsed?.info) {
        const info = sol.parsed.info as { source: string; destination: string; lamports: number }
        const outgoing = info.source === owner
        if ((!outgoing && info.destination !== owner) || seen.has(listed.signature)) continue
        // Skip dust fee-shaped rows when the same tx already counted as SPL above.
        const counterparty = outgoing ? info.destination : info.source
        const known = await nameForAddress(counterparty)
        seen.add(listed.signature)
        chainItems.push({
          id: listed.signature,
          signature: listed.signature,
          direction: outgoing ? "out" : "in",
          name: known?.alias || shortAddress(counterparty),
          counterparty,
          asset: { kind: "sol", lamports: info.lamports },
          status,
          at,
        })
      }
    }

    const chainIds = new Set(chainItems.map((item) => item.signature))
    const kept = local.filter(
      (item) => !item.signature || !chainIds.has(item.signature) || item.direction === "pass",
    )
    await rememberAll([...kept, ...chainItems])
    return payments()
  } catch {
    return local
  }
}

export async function savePayment(payment: Payment) {
  await remember(payment)
}
