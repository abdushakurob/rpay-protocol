import type { SolanaCluster } from "./version"
import type { AssetDescriptor } from "./types"

export const NATIVE_SOL: AssetDescriptor = {
  kind: "native_sol",
  symbol: "SOL",
  decimals: 9,
}

/** Official Tether USDT mint on Solana mainnet-beta. */
export const USDT_MAINNET_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"

export function usdtAsset(mint: string, options?: { symbol?: string; decimals?: number }): AssetDescriptor {
  return {
    kind: "spl_token",
    mint,
    symbol: options?.symbol ?? "USDT",
    decimals: options?.decimals ?? 6,
  }
}

export function isOfficialUsdtMint(mint: string) {
  return mint === USDT_MAINNET_MINT
}

/**
 * Resolve the USDT asset descriptor for a cluster.
 * On Devnet, pass an explicit mint (from `VITE_USDT_MINT` or `npm run usdt:devnet`).
 * Official Tether USDT is only assumed for mainnet-beta when no override is provided.
 */
export function resolveUsdtAsset(options?: {
  cluster?: SolanaCluster
  mint?: string
}): (AssetDescriptor & { labeledTestToken: boolean }) | null {
  const cluster = options?.cluster ?? "devnet"
  const mint = options?.mint?.trim() || (cluster === "mainnet-beta" ? USDT_MAINNET_MINT : "")
  if (!mint) return null
  const official = isOfficialUsdtMint(mint) && cluster === "mainnet-beta"
  return {
    ...usdtAsset(mint, { symbol: official ? "USDT" : "USDT-DEV" }),
    labeledTestToken: !official,
  }
}

export function parseTokenAmount(input: string, decimals: number) {
  const value = input.trim()
  if (!new RegExp(`^\\d+(\\.\\d{0,${decimals}})?$`).test(value) || value === ".") return null
  const [whole, fraction = ""] = value.split(".")
  const raw = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"))
  if (raw <= 0n || raw > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return Number(raw)
}

export function formatAmount(amount: number, asset: AssetDescriptor) {
  const whole = amount / 10 ** asset.decimals
  return `${whole} ${asset.symbol}`
}

export function formatTokenAmount(amount: number, decimals: number) {
  return (amount / 10 ** decimals).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}
