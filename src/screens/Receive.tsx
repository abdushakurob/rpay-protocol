import { useState } from "react"
import { useSession } from "../account/session"
import { encodeIdentity } from "../protocol/codes"
import { shortAddress } from "../format"
import { IconBack } from "../ui/Icons"
import { QrImage } from "../ui/QrImage"

export function Receive({ onClose }: { onClose: () => void }) {
  const session = useSession()
  const [copied, setCopied] = useState(false)
  if (session.status !== "unlocked") return null
  const code = encodeIdentity(session.alias, session.publicKey)

  return (
    <main className="wallet-shell wallet-shell--solo">
      <div className="wallet-main wallet-main--flow">
      <section className="wallet-page wallet-page--flow">
        <div className="topbar">
          <button className="back" type="button" aria-label="Back" onClick={onClose}><IconBack /></button>
          <h1>Receive</h1>
          <span />
        </div>
        <div className="sheet center">
          <p className="flow-kicker">Your RPay username</p>
          <h2>@{session.alias}</h2>
          <QrImage text={code} />
          <p className="hint">Share your username or wallet address to receive SOL.</p>
          <p>{shortAddress(session.publicKey)}</p>
          <button
            className="primary"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(session.publicKey).then(() => setCopied(true))
            }}
          >
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
      </section>
      </div>
    </main>
  )
}
