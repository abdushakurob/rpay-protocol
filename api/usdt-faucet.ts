import type { VercelRequest, VercelResponse } from "@vercel/node"
import { dispenseUsdtDev, faucetConfigured } from "../server/usdtFaucet.mjs"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("access-control-allow-origin", "*")
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS")
  res.setHeader("access-control-allow-headers", "content-type")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method === "GET") {
    res.status(200).json({ configured: faucetConfigured() })
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method" })
    return
  }

  const publicKey =
    typeof req.body === "object" && req.body && "publicKey" in req.body
      ? String((req.body as { publicKey?: string }).publicKey ?? "")
      : ""

  const result = await dispenseUsdtDev(publicKey)
  res.status(result.status).json(result)
}
