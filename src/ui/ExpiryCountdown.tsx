import { useEffect, useState } from "react"
import { formatExpiryClock, getExpirySnapshot } from "@rpay/protocol"

export function ExpiryCountdown({
  expiresAt,
  fetchedAt,
  onExpired,
}: {
  expiresAt: number
  fetchedAt?: number
  onExpired?: () => void
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  const snap = getExpirySnapshot({ expiresAt, fetchedAt, now })

  useEffect(() => {
    if (snap.expired) onExpired?.()
  }, [snap.expired, onExpired])

  return (
    <p className="expiry-pill" data-expired={snap.expired ? "yes" : "no"}>
      {snap.expired
        ? "Expired — get a fresh connection code"
        : `Expires ${formatExpiryClock(expiresAt)} · ${snap.label}`}
    </p>
  )
}
