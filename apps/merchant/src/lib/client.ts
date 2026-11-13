import { Connection, PublicKey } from "@solana/web3.js"
import {
  NATIVE_SOL,
  RPayClient,
  associatedTokenAddress,
  formatTokenAmount,
  isSettledState,
  labelForState,
  parseTokenAmount,
  resolveUsdtAsset,
  serializeMessage,
  type AssetDescriptor,
  type PaymentRequestMessage,
  type TransactionState,
} from "@rpay/protocol"

export const RPC_URL = import.meta.env.VITE_RPC_URL || "https://api.devnet.solana.com"
export const connection = new Connection(RPC_URL, "confirmed")
export const protocol = new RPayClient({ connection, cluster: "devnet" })

export type MerchantAsset = "sol" | "usdt"

export function configuredUsdt() {
  return resolveUsdtAsset({
    cluster: "devnet",
    mint: import.meta.env.VITE_USDT_MINT,
  })
}

export function isValidAddress(value: string) {
  try {
    return new PublicKey(value).toBase58() === value
  } catch {
    return false
  }
}

export function solToLamports(value: string) {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,9})?$/.test(trimmed)) return null
  const [whole, fraction = ""] = trimmed.split(".")
  const padded = (fraction + "000000000").slice(0, 9)
  const lamports = Number(whole) * 1_000_000_000 + Number(padded)
  if (!Number.isSafeInteger(lamports) || lamports <= 0) return null
  return lamports
}

export function formatSol(lamports: number) {
  return (lamports / 1_000_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 9,
  })
}

export function explorerTx(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

export function createPaymentRequestForAsset(options: {
  recipient: string
  amountInput: string
  asset: MerchantAsset
  memo?: string
}) {
  if (options.asset === "sol") {
    const lamports = solToLamports(options.amountInput)
    if (!lamports) return null
    return protocol.createMerchantPaymentRequest({
      recipient: options.recipient,
      amount: lamports,
      asset: NATIVE_SOL,
      memo: options.memo,
    })
  }
  const usdt = configuredUsdt()
  if (!usdt) return null
  const raw = parseTokenAmount(options.amountInput, usdt.decimals)
  if (!raw) return null
  return protocol.createMerchantPaymentRequest({
    recipient: options.recipient,
    amount: raw,
    asset: usdt,
    memo: options.memo,
  })
}

export function requestPayload(request: PaymentRequestMessage) {
  return serializeMessage(request)
}

export function formatRequestAmount(request: PaymentRequestMessage) {
  if (request.asset.kind === "native_sol") return `${formatSol(request.amount)} SOL`
  return `${formatTokenAmount(request.amount, request.asset.decimals)} ${request.asset.symbol}`
}

export async function verifySignatureState(signature: string): Promise<TransactionState> {
  return protocol.verifySettlement(signature)
}

export async function readMerchantBalances(recipient: string) {
  const sol = await connection.getBalance(new PublicKey(recipient), "confirmed")
  const usdt = configuredUsdt()
  if (!usdt?.mint) {
    return { sol, usdt: null as null | { uiAmount: number; symbol: string; labeledTestToken: boolean } }
  }
  const token = await protocol.readTokenBalance(recipient, usdt.mint)
  return {
    sol,
    usdt: {
      uiAmount: token.uiAmount,
      symbol: usdt.symbol,
      labeledTestToken: usdt.labeledTestToken,
    },
  }
}

async function matchSolTransfer(options: {
  recipient: string
  amount: number
  createdAt: number
}) {
  const signatures = await connection.getSignaturesForAddress(new PublicKey(options.recipient), { limit: 20 })
  const parsed = await connection.getParsedTransactions(
    signatures.map((item) => item.signature),
    { maxSupportedTransactionVersion: 0 },
  )

  for (let index = 0; index < parsed.length; index += 1) {
    const tx = parsed[index]
    const listed = signatures[index]
    if (!tx || tx.meta?.err) continue
    const blockTimeMs = (listed.blockTime ?? 0) * 1000
    if (blockTimeMs && blockTimeMs + 5_000 < options.createdAt) continue

    const instruction = tx.transaction.message.instructions.find(
      (item) => "parsed" in item && item.program === "system" && item.parsed.type === "transfer",
    )
    if (!instruction || !("parsed" in instruction)) continue
    const info = instruction.parsed.info as { source: string; destination: string; lamports: number }
    if (info.destination !== options.recipient || info.lamports !== options.amount) continue

    const state = await verifySignatureState(listed.signature)
    return {
      signature: listed.signature,
      state,
      settled: isSettledState(state),
      from: info.source,
    }
  }
  return null
}

async function matchSplTransfer(options: {
  recipient: string
  amount: number
  asset: AssetDescriptor
  createdAt: number
}) {
  const expectedMint = options.asset.mint
  if (!expectedMint) return null
  const ata = associatedTokenAddress(new PublicKey(options.recipient), new PublicKey(expectedMint))
  const ataAddress = ata.toBase58()
  const signatures = await connection.getSignaturesForAddress(ata, { limit: 20 })
  const parsed = await connection.getParsedTransactions(
    signatures.map((item) => item.signature),
    { maxSupportedTransactionVersion: 0 },
  )

  for (let index = 0; index < parsed.length; index += 1) {
    const tx = parsed[index]
    const listed = signatures[index]
    if (!tx || tx.meta?.err) continue
    const blockTimeMs = (listed.blockTime ?? 0) * 1000
    if (blockTimeMs && blockTimeMs + 5_000 < options.createdAt) continue

    const instruction = tx.transaction.message.instructions.find((item) => {
      if (!("parsed" in item) || item.program !== "spl-token") return false
      const type = item.parsed.type as string
      return type === "transferChecked" || type === "transfer"
    })
    if (!instruction || !("parsed" in instruction)) continue
    const info = instruction.parsed.info as {
      mint?: string
      tokenAmount?: { amount: string; decimals: number }
      amount?: string
      destination?: string
      authority?: string
    }
    const raw = Number(info.tokenAmount?.amount ?? info.amount ?? 0)
    const observedMint: string = info.mint ?? expectedMint
    const destination = info.destination
    if (observedMint !== expectedMint || raw !== options.amount) continue
    if (destination && destination !== ataAddress) continue

    const state = await verifySignatureState(listed.signature)
    return {
      signature: listed.signature,
      state,
      settled: isSettledState(state),
      from: info.authority ?? "",
    }
  }
  return null
}

/**
 * Look for a matching on-chain transfer for a payment request.
 * Merchant acceptance still requires independent chain verification.
 */
export async function findMatchingIncomingTransfer(options: {
  request: PaymentRequestMessage
  createdAt: number
}) {
  if (options.request.asset.kind === "native_sol") {
    return matchSolTransfer({
      recipient: options.request.recipient,
      amount: options.request.amount,
      createdAt: options.createdAt,
    })
  }
  return matchSplTransfer({
    recipient: options.request.recipient,
    amount: options.request.amount,
    asset: options.request.asset,
    createdAt: options.createdAt,
  })
}

export { labelForState, isSettledState, NATIVE_SOL }
