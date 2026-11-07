import { useEffect, useRef, useState } from "react"
import { nameForAddress } from "../directory/directory"
import { formatSol, shortAddress } from "../format"
import { decodeSignedTx, encodeBlockhash } from "../protocol/codes"
import { verifyTransfer } from "../protocol/verify"
import { connection, freshBlockhash, receiptUrl, savePayment, submitSigned } from "../solana/chain"
import { QrImage } from "../ui/QrImage"
import { Scanner } from "../ui/Scanner"

type Ready = { code: string; from: string; to: string; lamports: number; blockhash: string; lastValidBlockHeight: number; name: string }

export function Help() {
  const recent = useRef<{ blockhash: string; lastValidBlockHeight: number }[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [code, setCode] = useState("")
  const [ready, setReady] = useState<Ready | null>(null)
  const [error, setError] = useState("")
  const [result, setResult] = useState("")
  const [busy, setBusy] = useState(false)
  const [scanKey, setScanKey] = useState(0)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  useEffect(() => {
    if (!online) return
    let stop = false
    async function tick() {
      try {
        const latest = await freshBlockhash()
        if (stop) return
        recent.current = [latest, ...recent.current].slice(0, 4)
        setCode(encodeBlockhash(latest.blockhash, latest.lastValidBlockHeight))
      } catch {
        if (!stop) setError("Couldn't reach devnet. Try again in a little while.")
      }
    }
    void tick()
    const timer = window.setInterval(() => void tick(), 20_000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [online])

  async function inspect(value: string) {
    setError("")
    const tx = decodeSignedTx(value.trim())
    if (!tx) {
      setError("That isn't a payment.")
      setScanKey((key) => key + 1)
      return
    }
    const checked = verifyTransfer(tx, recent.current.map((item) => item.blockhash))
    if (!checked.ok) {
      setError(checked.reason === "old" ? "That code is old. Scan their screen again." : "That isn't a payment.")
      setScanKey((key) => key + 1)
      return
    }
    const known = await nameForAddress(checked.to)
    const match = recent.current.find((item) => item.blockhash === checked.blockhash)
    if (!match) {
      setError("That code is old. Scan their screen again.")
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
        setError("That code is old. Scan their screen again.")
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
        lamports: ready.lamports,
        status: "delivered",
        at: Date.now(),
      })
      setResult(signature)
    } catch {
      setError("Couldn't pass this on.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="wallet-page">
      <header className="page-head">
        <h1>Help</h1>
        <p className="muted">Pass on someone else&apos;s signed payment.</p>
      </header>
      <div className="panel stack">
        {online ? (
          <>
            <h2>You have internet. Someone nearby can pay through you.</h2>
            {code ? <div className="center"><QrImage text={code} /></div> : <p className="hint">Getting a fresh code…</p>}
            {result ? (
              <div className="stack">
                <h2>Delivered</h2>
                <a href={receiptUrl(result)} target="_blank" rel="noreferrer">View receipt</a>
              </div>
            ) : ready ? (
              <div className="stack">
                <h2>Pass on {formatSol(ready.lamports)} SOL to {ready.name}?</h2>
                <button className="primary" type="button" disabled={busy} onClick={() => void passOn()}>Pass this on</button>
              </div>
            ) : (
              <Scanner key={scanKey} onCode={(value) => void inspect(value)} />
            )}
          </>
        ) : (
          <h2>This phone needs internet before someone can pay through you.</h2>
        )}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </section>
  )
}
