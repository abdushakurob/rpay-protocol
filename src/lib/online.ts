import { connection } from "../solana/chain"

let cached: { at: number; ok: boolean } | null = null

export async function canReachNetwork() {
  if (cached && Date.now() - cached.at < 8_000) return cached.ok
  try {
    const health = await connection.getLatestBlockhash("confirmed")
    const ok = Boolean(health.blockhash)
    cached = { at: Date.now(), ok }
    return ok
  } catch {
    cached = { at: Date.now(), ok: false }
    return false
  }
}
