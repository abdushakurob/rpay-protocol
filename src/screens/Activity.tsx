import { useEffect, useState } from "react"
import { paymentLabel, payments, type Payment } from "../activity/store"
import { formatSol } from "../format"
import { receiptUrl } from "../solana/chain"

export function Activity() {
  const [rows, setRows] = useState<Payment[]>([])
  useEffect(() => {
    void payments().then(setRows)
  }, [])

  return (
    <section className="wallet-page">
      <header className="page-head">
        <h1>Activity</h1>
        <p className="muted">Payments on this device and devnet.</p>
      </header>
      <div className="panel">
        {rows.length === 0 ? (
          <p className="muted">No payments yet.</p>
        ) : (
          <ul className="activity-list">
            {rows.map((row) => (
              <li className="activity-item" key={row.id}>
                <div>
                  <strong>
                    {row.direction === "in" ? `From ${row.name}` : row.direction === "pass" ? `Passed on to ${row.name}` : row.name}
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
