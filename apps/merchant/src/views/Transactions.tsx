import { useMemo, useState } from "react"
import { explorerTx, formatRequestAmount } from "../lib/client"
import {
  downloadRequestsCsv,
  filterRequests,
  shortId,
  statusLabel,
  type MerchantRequestRecord,
} from "../lib/store"

type Props = {
  requests: MerchantRequestRecord[]
  onOpenRequest: (id: string) => void
  onNavigate: (tab: "overview" | "transactions" | "settings") => void
}

export function Transactions({ requests, onOpenRequest, onNavigate }: Props) {
  const [filter, setFilter] = useState<"all" | "waiting" | "paid" | "failed">("all")
  const [query, setQuery] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const rows = useMemo(
    () => filterRequests(requests, { filter, query }),
    [requests, filter, query],
  )

  function copy(value: string, key: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1400)
    })
  }

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1 className="dash-page-title">Transactions</h1>
          <p className="dash-page-sub">{requests.length} charge{requests.length === 1 ? "" : "s"} on this device</p>
        </div>
        <nav className="dash-nav" aria-label="Merchant sections">
          <button type="button" onClick={() => onNavigate("overview")}>
            Overview
          </button>
          <button type="button" className="active" aria-current="page">
            Transactions
          </button>
          <button type="button" onClick={() => onNavigate("settings")}>
            Settings
          </button>
        </nav>
      </header>

      <div className="tx-toolbar">
        <div className="dash-range tx-filters" role="group" aria-label="Status filter">
          {(
            [
              ["all", "All"],
              ["waiting", "Waiting"],
              ["paid", "Paid"],
              ["failed", "Failed"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <label className="tx-search">
          <span className="sr-only">Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search memo, id, amount…"
          />
        </label>
        <button type="button" className="ghost tx-export" onClick={() => downloadRequestsCsv(requests)}>
          Export CSV
        </button>
      </div>

      <section className="tx-table-card">
        {rows.length === 0 ? (
          <div className="empty-state">
            <strong>No matching charges</strong>
            <p className="muted">Try another filter or create a new charge from Overview.</p>
          </div>
        ) : (
          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Note</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button type="button" className="tx-id" onClick={() => onOpenRequest(item.id)}>
                        {shortId(item.request.requestId)}
                      </button>
                      <button
                        type="button"
                        className="tx-copy"
                        aria-label="Copy request id"
                        onClick={() => copy(item.request.requestId, `id-${item.id}`)}
                      >
                        {copied === `id-${item.id}` ? "✓" : "⧉"}
                      </button>
                    </td>
                    <td>{item.request.memo || "—"}</td>
                    <td>
                      <button type="button" className="tx-amount" onClick={() => onOpenRequest(item.id)}>
                        {formatRequestAmount(item.request)}
                      </button>
                    </td>
                    <td>
                      <em className="status-pill" data-state={item.status}>
                        {statusLabel(item.status)}
                      </em>
                    </td>
                    <td>
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      {item.signature ? (
                        <span className="tx-sig">
                          <a href={explorerTx(item.signature)} target="_blank" rel="noreferrer">
                            {shortId(item.signature, 4, 4)}
                          </a>
                          <button
                            type="button"
                            className="tx-copy"
                            aria-label="Copy signature"
                            onClick={() => copy(item.signature!, `sig-${item.id}`)}
                          >
                            {copied === `sig-${item.id}` ? "✓" : "⧉"}
                          </button>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
