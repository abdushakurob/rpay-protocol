import { useState } from "react"
import { useSession } from "../account/session"
import { fundDevnet } from "../solana/chain"

export function Settings() {
  const session = useSession()
  const [note, setNote] = useState("")
  const [mainnetNote, setMainnetNote] = useState("")
  const [funding, setFunding] = useState(false)
  if (session.status !== "unlocked") return null

  return (
    <section className="wallet-page">
      <header className="page-head">
        <h1>Settings</h1>
        <p className="muted">Network, backup, and lock.</p>
      </header>
      <div className="panel stack">
        <h2>Your name</h2>
        <p className="wallet-name-inline">{session.alias}</p>
        <h2>Network</h2>
        <div className="network">
          <button className="choice" type="button" aria-pressed="true">
            <span><strong>Devnet</strong><span className="muted">Test SOL for this phone.</span></span>
          </button>
          <button
            className="choice"
            type="button"
            aria-pressed="false"
            onClick={() => setMainnetNote("Mainnet is coming later.")}
          >
            <span><strong>Mainnet</strong><span className="muted">Coming later.</span></span>
          </button>
        </div>
        {mainnetNote ? <p className="muted">{mainnetNote}</p> : null}
        <button
          className="pill primary wide"
          type="button"
          disabled={funding}
          onClick={() => {
            setFunding(true)
            setNote("")
            void fundDevnet(session.publicKey)
              .then(() => setNote("1 SOL added from devnet."))
              .catch(() => setNote("Devnet is busy right now. Try again in a little while."))
              .finally(() => setFunding(false))
          }}
        >
          {funding ? "Funding…" : "Fund from devnet"}
        </button>
        {note ? <p className="banner info">{note}</p> : null}
        <h2>Backup</h2>
        <p className="muted">Your 12 words stay with you. Write them down somewhere safe.</p>
        <button className="pill ghost wide" type="button" onClick={session.lock}>Lock wallet</button>
      </div>
    </section>
  )
}
