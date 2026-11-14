import { resolveUsdtAsset, type AssetDescriptor } from "@rpay/protocol"

export type PayAsset = "sol" | "usdt"

export function configuredUsdt(): (AssetDescriptor & { labeledTestToken: boolean }) | null {
  return resolveUsdtAsset({
    cluster: "devnet",
    mint: import.meta.env.VITE_USDT_MINT,
  })
}

export function usdtEnabled() {
  return configuredUsdt() !== null
}
