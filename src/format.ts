import { PublicKey } from "@solana/web3.js"

export function isAlias(value: string) {
  return /^[a-z0-9]{3,20}$/.test(value)
}

export function canonicalAddress(value: string) {
  const trimmed = value.trim()
  try {
    const key = new PublicKey(trimmed)
    return key.toBase58() === trimmed ? trimmed : null
  } catch {
    return null
  }
}

export function shortAddress(value: string) {
  if (value.length <= 12) return value
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export function formatSol(lamports: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(lamports / 1_000_000_000)
}

export function solToLamports(input: string) {
  const value = input.trim()
  if (!/^\d+(\.\d{0,9})?$/.test(value) || value === "." ) return null
  const [whole, fraction = ""] = value.split(".")
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, "0"))
  if (lamports <= 0n || lamports > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return Number(lamports)
}
