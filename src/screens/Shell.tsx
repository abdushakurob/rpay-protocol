import { useEffect, useState, type ReactNode } from "react"
import { paymentLabel, payments as loadPayments, type Payment } from "../activity/store"
import { useSession } from "../account/session"
import { publishName } from "../directory/directory"
import { formatSol } from "../format"
import { fundDevnet, readBalance, syncPayments } from "../solana/chain"
import { WalletMobileNav, WalletSidebar, type WalletTab } from "../ui/WalletNav"

export function Shell({
  tab,
  onTab,
  onSend,
  onReceive,
  help,
  activity,
  settings,
}: {
  tab: WalletTab
  onTab: (tab: WalletTab) => void
  onSend: () => void
  onReceive: () => void
  help: ReactNode
  activity: ReactNode
  settings: ReactNode
}) {
  const session = useSession()
  const [lamports, setLamports] = useState<number | null>(null)
  const [rows, setRows] = useState<Payment[]>([])
  const [note, setNote] = useState("")
  const [funding, setFunding] = useState(false)
  const alias = session.status === "unlocked" ? session.alias : ""
  const publicKey = session.status === "unlocked" ? session.publicKey : ""

  async function refresh() {
    if (!publicKey) return
    const [balance, list] = await Promise.all([
      readBalance(publicKey).catch(() => null),
      syncPayments(publicKey).catch(() => loadPayments()),
    ])
    if (balance !== null) setLamports(balance)
    setRows(list)
  }

  useEffect(() => {
    void refresh()
    if (session.status === "unlocked" && !session.published) {
      void publishName({ alias: session.alias, publicKey: session.publicKey }).then((result) => {
        if (result.published) void session.notePublished()
      })
    }
  }, [publicKey])

  async function fund() {
    setFunding(true)
    setNote("")
    try {
      await fundDevnet(publicKey)
      await refresh()
      setNote("1 SOL added from devnet.")
    } catch {
      setNote("Devnet is busy right now. Try again in a little while.")
    } finally {
      setFunding(false)
    }
  }

  return (
    <main className="wallet-shell">
      <WalletSidebar tab={tab} alias={alias} onTab={onTab} />
      <div className="wallet-main">
        {tab === "home" ? (
          <section className="wallet-page">
            <header className="wallet-hero">
              <div className="wallet-hero-copy">
                <p className="eyebrow">Portfolio</p>
                <p className="balance-display">{lamports === null ? "—" : formatSol(lamports)}</p>
                <p className="balance-unit">SOL · Devnet</p>
                <p className="wallet-name">{alias}</p>
              </div>
              <div className="wallet-hero-actions">
                <button className="pill primary" type="button" onClick={onReceive}>Receive</button>
                <button className="pill accent" type="button" onClick={onSend}>Send</button>
                <button className="pill ghost" type="button" onClick={() => void refresh()}>Refresh</button>
                <button className="pill ghost" type="button" onClick={() => void fund()} disabled={funding}>
                  {funding ? "Funding…" : "Fund"}
                </button>
              </div>
            </header>
            {note ? <p className="banner info">{note}</p> : null}
            <div className="wallet-grid">
              <section className="panel">
                <h2>Assets</h2>
                <div className="asset-row">
                  <div className="asset-icon">S</div>
                  <div>
                    <strong>Solana</strong>
                    <span className="muted">SOL</span>
                  </div>
                  <strong className="asset-amount">{lamports === null ? "—" : `${formatSol(lamports)} SOL`}</strong>
                </div>
              </section>
              <section className="panel">
                <h2>Latest activity</h2>
                {rows.length === 0 ? (
                  <p className="muted">No payments yet.</p>
                ) : (
                  <ul className="activity-list">
                    {rows.slice(0, 5).map((row) => (
                      <li className="activity-item" key={row.id}>
                        <div>
                          <strong>
                            {row.direction === "in" ? `From ${row.name}` : row.direction === "pass" ? `Passed on to ${row.name}` : row.name}
                          </strong>
                          <span className="muted">{paymentLabel(row)}</span>
                        </div>
                        <strong className={row.direction === "in" ? "pos" : ""}>
                          {row.direction === "in" ? "+" : row.direction === "pass" ? "" : "−"}
                          {formatSol(row.lamports)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>
        ) : null}
        {tab === "activity" ? activity : null}
        {tab === "help" ? help : null}
        {tab === "settings" ? settings : null}
      </div>
      <WalletMobileNav tab={tab} onTab={onTab} />
    </main>
  )
}
