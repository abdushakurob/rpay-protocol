import { useEffect, useState } from "react"
import { paymentLabel, payments, type Payment } from "../activity/store"
import { formatSol } from "../format"
import { receiptUrl } from "../solana/chain"
import { syncPayments } from "../solana/chain"
import { useSession } from "../account/session"

export function Activity() {
  const [rows, setRows] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const session = useSession()
  useEffect(() => {
    async function load() {
      try {
        const next = session.status === "unlocked" ? await syncPayments(session.publicKey) : await payments()
        setRows(next)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [session])

  return (
    <section className="wallet-page">
      <header className="page-head">
        <h1>Activity</h1>
        <p className="muted">Every payment you sent, received, or relayed from this wallet.</p>
      </header>
      <div className="panel">
        {loading ? (
          <div className="activity-loading" role="status"><i aria-hidden="true" /> Loading activity</div>
        ) : rows.length === 0 ? (
          <div className="empty-state"><strong>No activity yet</strong><p className="muted">Your completed payments and relay receipts will appear here.</p></div>
        ) : (
          <ul className="activity-list">
            {rows.map((row) => (
              <li className="activity-item" key={row.id}>
                <div>
                  <strong>
                    {row.direction === "in" ? `Received from ${row.name}` : row.direction === "pass" ? `Relayed to ${row.name}` : `Sent to ${row.name}`}
                  </strong>
                  <span className="muted">{paymentLabel(row)}</span>
                  {row.signature && row.status === "delivered" ? (
                    <a className="link" href={receiptUrl(row.signature)} target="_blank" rel="noreferrer">View receipt</a>
                  ) : null}
                </div>
                <strong className={row.direction === "in" ? "pos" : ""}>
                  {row.direction === "in" ? "+" : row.direction === "pass" ? "" : "−"}
                  {formatSol(row.lamports)}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
