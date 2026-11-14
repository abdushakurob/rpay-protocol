import type { MerchantProfile } from "../lib/auth"
import { formatRequestAmount, formatSol } from "../lib/client"
import {
  assetMix,
  dailyVolumeSeries,
  formatRelativeTime,
  pendingRequests,
  recentRequests,
  settledInRange,
  settledToday,
  statusLabel,
  todayVsYesterdayPercent,
  type MerchantRequestRecord,
  type VolumeRange,
} from "../lib/store"

type Balances = {
  sol: number
  usdt: null | { uiAmount: number; symbol: string; labeledTestToken: boolean }
}

type Props = {
  profile: MerchantProfile
  requests: MerchantRequestRecord[]
  balances: Balances | null
  networkHint: string | null
  range: VolumeRange
  usdtConfigured: boolean
  onRangeChange: (range: VolumeRange) => void
  onCharge: () => void
  onOpenRequest: (id: string) => void
  onNavigate: (tab: "overview" | "transactions" | "settings") => void
}

function formatUi(amount: number, digits = 4) {
  if (amount <= 0) return "0"
  return amount.toLocaleString(undefined, { maximumFractionDigits: digits })
}

function shortAddr(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export function Overview({
  profile,
  requests,
  balances,
  networkHint,
  range,
  usdtConfigured,
  onRangeChange,
  onCharge,
  onOpenRequest,
  onNavigate,
}: Props) {
  const shop = profile.shopName
  const initial = shop.slice(0, 1).toUpperCase()
  const today = settledToday(requests)
  const period = settledInRange(requests, range)
  const mix = assetMix(requests, range)
  const series = dailyVolumeSeries(requests, range)
  const vsYesterday = todayVsYesterdayPercent(requests)
  const pending = pendingRequests(requests)
  const recent = recentRequests(requests, 5)
  const maxBar = Math.max(0.0001, ...series.map((p) => p.sol + p.usdt))

  return (
    <div className="dash">
      <header className="dash-head">
        <div className="merchant-identity">
          <span className="identity-avatar">{initial}</span>
          <div>
            <p className="eyebrow">RPay Merchant</p>
            <strong>{shop}</strong>
            <span className="online-state">
              <i /> Devnet
            </span>
          </div>
        </div>
        <nav className="dash-nav" aria-label="Merchant sections">
          <button type="button" className="active" aria-current="page">
            Overview
          </button>
          <button type="button" onClick={() => onNavigate("transactions")}>
            Transactions
          </button>
          <button type="button" onClick={() => onNavigate("settings")}>
            Settings
          </button>
        </nav>
      </header>

      {networkHint ? <p className="dash-network-hint">{networkHint}</p> : null}

      <section className="dash-till" aria-label="New charge">
        <div className="dash-till-copy">
          <p className="dash-kicker">Till</p>
          <h2>Ready to charge</h2>
          <p>
            {today.count === 0
              ? "No settled payments yet today — start with a QR charge."
              : `${today.count} paid today · ${formatUi(today.sol)} SOL${usdtConfigured && today.usdt > 0 ? ` · ${formatUi(today.usdt, 2)} USDT-DEV` : ""}`}
          </p>
        </div>
        <button type="button" className="dash-till-cta" onClick={onCharge}>
          Charge customer <span>→</span>
        </button>
      </section>

      {pending.length > 0 ? (
        <section className="dash-pending">
          <div className="panel-title">
            <h2>Waiting for payment</h2>
            <span className="dash-count">{pending.length} open</span>
          </div>
          <ul className="dash-recent-list">
            {pending.slice(0, 4).map((item) => (
              <li key={item.id}>
                <button type="button" className="dash-recent-row" onClick={() => onOpenRequest(item.id)}>
                  <span>
                    <strong>{formatRequestAmount(item.request)}</strong>
                    <small>
                      {item.request.memo || "Show QR"} · {formatRelativeTime(item.createdAt)}
                    </small>
                  </span>
                  <em className="status-pill" data-state="pending">
                    Resume
                  </em>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="dash-hero">
        <div className="dash-hero-card dash-hero-balance">
          <p className="dash-kicker">Wallet balance</p>
          <p className="dash-hero-value">
            {balances ? formatSol(balances.sol) : "—"} <small>SOL</small>
          </p>
          {usdtConfigured && balances?.usdt ? (
            <p className="dash-hero-sub">
              {balances.usdt.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {balances.usdt.symbol}
            </p>
          ) : (
            <p className="dash-hero-sub">
              Payout {profile.payoutAddress ? shortAddr(profile.payoutAddress) : "—"}
            </p>
          )}
        </div>
        <div className="dash-hero-card dash-hero-today">
          <p className="dash-kicker">Today’s revenue</p>
          <p className="dash-hero-value">
            {formatUi(today.sol)} <small>SOL</small>
          </p>
          {today.usdt > 0 || usdtConfigured ? (
            <p className="dash-hero-sub">
              {formatUi(today.usdt, 2)} {balances?.usdt?.symbol ?? "USDT-DEV"}
              {vsYesterday != null ? (
                <span className={`dash-delta${vsYesterday >= 0 ? " is-up" : " is-down"}`}>
                  {vsYesterday >= 0 ? "+" : ""}
                  {vsYesterday.toFixed(1)}% vs yesterday
                </span>
              ) : null}
            </p>
          ) : vsYesterday != null ? (
            <p className="dash-hero-sub">
              <span className={`dash-delta${vsYesterday >= 0 ? " is-up" : " is-down"}`}>
                {vsYesterday >= 0 ? "+" : ""}
                {vsYesterday.toFixed(1)}% vs yesterday
              </span>
            </p>
          ) : (
            <p className="dash-hero-sub">
              {today.count === 0 ? "Waiting on first settle" : `${today.count} paid today`}
            </p>
          )}
        </div>
      </section>

      <section className="dash-metrics">
        <div className="dash-metric is-accent">
          <p className="dash-kicker">Payments today</p>
          <p className="dash-metric-value">+{today.count}</p>
          <p className="dash-metric-sub">
            {formatUi(today.sol)} SOL
            {usdtConfigured ? ` · ${formatUi(today.usdt, 2)} token` : ""}
          </p>
        </div>
        <div className="dash-metric">
          <p className="dash-kicker">Payment mix · {range}d</p>
          <p className="dash-metric-value">{period.count === 0 ? "—" : `${Math.round(mix.solShare)}% SOL`}</p>
          <p className="dash-metric-sub">
            {period.count === 0
              ? "No settled payments in range"
              : usdtConfigured
                ? `${Math.round(mix.usdtShare)}% USDT-DEV`
                : "All SOL in this range"}
          </p>
          {period.count > 0 ? (
            <div className="dash-mix-bar" aria-hidden="true">
              <span style={{ width: `${mix.solShare}%` }} className="is-sol" />
              <span style={{ width: `${mix.usdtShare}%` }} className="is-usdt" />
            </div>
          ) : null}
        </div>
        <div className="dash-metric is-period">
          <p className="dash-kicker">{range}d total</p>
          <p className="dash-metric-value">
            {formatUi(period.sol)} <small>SOL</small>
          </p>
          <p className="dash-metric-sub">
            {period.count} paid
            {usdtConfigured ? ` · ${formatUi(period.usdt, 2)} USDT-DEV` : ""}
          </p>
        </div>
      </section>

      <section className="dash-chart-card">
        <div className="dash-chart-head">
          <div>
            <p className="dash-kicker">Payment volume</p>
            <h2>Last {range} days</h2>
          </div>
          <div className="dash-range" role="group" aria-label="Volume range">
            <button type="button" className={range === 7 ? "active" : ""} onClick={() => onRangeChange(7)}>
              7d
            </button>
            <button type="button" className={range === 30 ? "active" : ""} onClick={() => onRangeChange(30)}>
              30d
            </button>
          </div>
        </div>
        <div className="dash-legend">
          <span>
            <i className="is-sol" /> SOL
          </span>
          {usdtConfigured ? (
            <span>
              <i className="is-usdt" /> USDT-DEV
            </span>
          ) : null}
        </div>
        <div className="dash-bars" role="img" aria-label={`Settled volume over ${range} days`}>
          {series.map((point) => (
            <div
              key={point.dayStart}
              className="dash-bar-col"
              title={`${point.label}: ${formatUi(point.sol)} SOL${usdtConfigured ? `, ${formatUi(point.usdt, 2)} USDT` : ""}`}
            >
              <div className="dash-bar-stack">
                {usdtConfigured && point.usdt > 0 ? (
                  <span className="dash-bar is-usdt" style={{ height: `${(point.usdt / maxBar) * 100}%` }} />
                ) : null}
                <span className="dash-bar is-sol" style={{ height: `${(point.sol / maxBar) * 100}%` }} />
              </div>
              <small>{point.label}</small>
            </div>
          ))}
        </div>
        {period.count === 0 ? <p className="dash-empty-inline">No settled volume in this range yet.</p> : null}
      </section>

      <section className="dash-recent panel">
        <div className="panel-title">
          <h2>Recent payments</h2>
          <button type="button" className="text-btn" onClick={() => onNavigate("transactions")}>
            View all
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <strong>No charges yet</strong>
            <p className="muted">Use Charge customer above to create your first QR.</p>
            <button type="button" className="dash-empty-charge" onClick={onCharge}>
              Charge customer
            </button>
          </div>
        ) : (
          <ul className="dash-recent-list">
            {recent.map((item) => (
              <li key={item.id}>
                <button type="button" className="dash-recent-row" onClick={() => onOpenRequest(item.id)}>
                  <span>
                    <strong>{formatRequestAmount(item.request)}</strong>
                    <small>
                      {item.request.memo || item.request.requestId.slice(0, 8)} · {formatRelativeTime(item.createdAt)}
                    </small>
                  </span>
                  <em className="status-pill" data-state={item.status}>
                    {statusLabel(item.status)}
                  </em>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
