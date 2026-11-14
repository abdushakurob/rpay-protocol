export type FaucetResult =
  | { ok: true; signature: string; amount: number; symbol: string }
  | { ok: false; error: string; retryAfterSec?: number }

export async function faucetStatus() {
  try {
    const response = await fetch("/api/usdt-faucet")
    if (!response.ok) return { configured: false }
    return (await response.json()) as { configured: boolean }
  } catch {
    return { configured: false }
  }
}

export async function requestUsdtDev(publicKey: string): Promise<FaucetResult> {
  const response = await fetch("/api/usdt-faucet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicKey }),
  })
  const body = (await response.json()) as {
    ok?: boolean
    signature?: string
    amount?: number
    symbol?: string
    error?: string
    retryAfterSec?: number
  }
  if (body.ok && body.signature) {
    return {
      ok: true,
      signature: body.signature,
      amount: body.amount ?? 0,
      symbol: body.symbol ?? "USDT-DEV",
    }
  }
  return {
    ok: false,
    error: body.error ?? "request-failed",
    retryAfterSec: body.retryAfterSec,
  }
}
