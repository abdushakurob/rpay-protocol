import { useCallback, useEffect, useRef, useState } from "react"
import { getExpirySnapshot, type NetworkContextMessage } from "@rpay/protocol"
import { nameForAddress } from "../directory/directory"
import { formatSol, shortAddress } from "../format"
import { decodeSignedTx } from "../protocol/codes"
import { verifyTransfer } from "../protocol/verify"
import { connection, protocol, receiptUrl, savePayment, submitSigned } from "../solana/chain"
import { ExpiryCountdown } from "../ui/ExpiryCountdown"
import { QrImage } from "../ui/QrImage"
import { Scanner } from "../ui/Scanner"

type Ready = {
  code: string
  from: string
  to: string
  lamports: number
  blockhash: string
  lastValidBlockHeight: number
  name: string
}

export function Help() {
  const contexts = useRef<NetworkContextMessage[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [code, setCode] = useState("")
  const [context, setContext] = useState<NetworkContextMessage | null>(null)
  const [ready, setReady] = useState<Ready | null>(null)
  const [error, setError] = useState("")
  const [result, setResult] = useState("")
  const [busy, setBusy] = useState(false)
  const [scanKey, setScanKey] = useState(0)
  const [mode, setMode] = useState<"connect" | "scan">("connect")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  const refreshContext = useCallback(async () => {
    const next = await protocol.fetchNetworkContext()
    contexts.current = [next, ...contexts.current].slice(0, 4)
    setContext(next)
    setCode(protocol.encodeNetworkContextQr(next))
    setError("")
  }, [])

  useEffect(() => {
    if (!online) return
    let stop = false
    async function tick() {
      try {
        if (stop) return
        await refreshContext()
      } catch {
        if (!stop) setError("Unable to reach devnet. Try again shortly.")
      }
    }
    void tick()
    const timer = window.setInterval(() => void tick(), 15_000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [online, refreshContext])

  async function inspect(value: string) {
    setError("")
    const tx = decodeSignedTx(value.trim())
    if (!tx) {
      setError("This code is not a payment.")
      setScanKey((key) => key + 1)
      return
    }
    const checked = verifyTransfer(
      tx,
      contexts.current.map((item) => item.recentBlockhash),
    )
    if (!checked.ok) {
      setError(
        checked.reason === "old"
          ? "This payment expired. Ask the sender to create a new one with a fresh connection code."
          : "This payment could not be verified.",
      )
      setScanKey((key) => key + 1)
      return
    }
    const known = await nameForAddress(checked.to)
    const match = contexts.current.find((item) => item.recentBlockhash === checked.blockhash)
    if (!match) {
      setError("This payment expired. Ask the sender to create a new one with a fresh connection code.")
      return
    }
    if (getExpirySnapshot({ expiresAt: match.expiresAt }).expired) {
      setError("This connection stamp expired. Refresh the connection code and ask them to resign.")
      return
    }
    setReady({
      code: value.trim(),
      ...checked,
      lastValidBlockHeight: match.lastValidBlockHeight,
      name: known?.alias || shortAddress(checked.to),
    })
  }

  async function passOn() {
    if (!ready) return
    setBusy(true)
    setError("")
    try {
      const height = await connection.getBlockHeight("confirmed")
      if (height > ready.lastValidBlockHeight) {
        setError("This payment expired. Ask the sender to create a new one.")
        setReady(null)
        setScanKey((key) => key + 1)
        return
      }
      const tx = decodeSignedTx(ready.code)
      if (!tx) throw new Error("shape")
      const signature = await submitSigned(tx.serialize(), ready.blockhash, ready.lastValidBlockHeight)
      await savePayment({
        id: signature,
        signature,
        direction: "pass",
        name: ready.name,
        counterparty: ready.to,
        asset: { kind: "sol", lamports: ready.lamports },
        status: "delivered",
        at: Date.now(),
      })
      setResult(signature)
    } catch {
      setError("Unable to relay this payment. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="wallet-page relay-page">
      <header className="page-head">
        <p className="flow-kicker">Connected device</p>
        <h1>Relay a payment</h1>
        <p className="muted">Help someone nearby send money without access to their wallet.</p>
      </header>
      <div className="relay-workspace">
        {online ? (
          result ? (
            <div className="relay-result stack">
              <p className="flow-kicker">Payment delivered</p>
              <h2>Relay complete.</h2>
              <p className="hint">The signed payment was submitted to Solana.</p>
              <a className="primary" href={receiptUrl(result)} target="_blank" rel="noreferrer">
                View receipt
              </a>
            </div>
          ) : ready ? (
            <div className="relay-review stack">
              <p className="flow-kicker">Payment verified</p>
              <h2>
                Relay {formatSol(ready.lamports)} SOL to {ready.name}?
              </h2>
              <p className="hint">
                The amount and recipient were authorized on the sender’s phone. You cannot change them.
              </p>
              <button className="primary" type="button" disabled={busy} onClick={() => void passOn()}>
                {busy ? "Relaying…" : "Relay payment"}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  setReady(null)
                  setMode("scan")
                  setScanKey((key) => key + 1)
                }}
              >
                Scan a different payment
              </button>
            </div>
          ) : mode === "connect" ? (
            <div className="relay-connect stack">
              <p className="flow-kicker">Step 1 of 2 · Connect</p>
              <h2>Let the sender connect to your phone.</h2>
              <p className="hint">
                Ask them to finish preparing the payment first, then scan this code. It includes the exact expiry
                time for this network stamp.
              </p>
              {code ? (
                <div className="relay-code">
                  <QrImage text={code} />
                  <span>
                    <i /> Connection ready
                  </span>
                </div>
              ) : (
                <p className="hint">Preparing a fresh connection code…</p>
              )}
              {context ? <ExpiryCountdown expiresAt={context.expiresAt} fetchedAt={context.fetchedAt} /> : null}
              {code ? (
                <button
                  className="copy-code"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(code).then(() => setCopied(true))
                  }}
                >
                  {copied ? "Code copied" : "Copy connection code"}
                </button>
              ) : null}
              <button className="ghost" type="button" onClick={() => void refreshContext()}>
                Refresh stamp now
              </button>
              <button className="primary" type="button" disabled={!code} onClick={() => setMode("scan")}>
                They’re connected — scan payment
              </button>
              <p className="relay-safety">You never see their password or get access to their wallet.</p>
            </div>
          ) : (
            <div className="relay-scan stack">
              <p className="flow-kicker">Step 2 of 2 · Verify</p>
              <h2>Scan the signed payment.</h2>
              <p className="hint">
                Point your camera at the sender’s RPay code. Nothing is sent until you review the verified payment.
              </p>
              {context ? <ExpiryCountdown expiresAt={context.expiresAt} fetchedAt={context.fetchedAt} /> : null}
              <Scanner key={scanKey} onCode={(value) => void inspect(value)} />
              <button className="ghost" type="button" onClick={() => setMode("connect")}>
                Back to connection code
              </button>
            </div>
          )
        ) : (
          <div className="relay-offline">
            <h2>Relay needs an internet connection.</h2>
            <p className="hint">Connect this phone, then return to help someone send their signed payment.</p>
          </div>
        )}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  )
}
