import { formatTokenAmount } from "@rpay/protocol"
import { useEffect, useState, type ReactNode } from "react"
import { paymentAmountText, paymentLabel, payments as loadPayments, type Payment } from "../activity/store"
import { useSession } from "../account/session"
import { getCachedBalance, setCachedBalance } from "../db"
import { publishName } from "../directory/directory"
import { formatSol } from "../format"
import { configuredUsdt, usdtEnabled } from "../solana/assets"
import { faucetStatus, requestUsdtDev } from "../solana/faucet"
import { fundDevnet, readBalance, readUsdtBalance, syncPayments } from "../solana/chain"
import { IconArrow, IconDown, IconPlus, IconRefresh, IconUp, SolanaMark } from "../ui/Icons"
import { WalletMobileNav, WalletSidebar, type WalletTab } from "../ui/WalletNav"

type ShellProps = {
  tab: WalletTab
  onTab: (tab: WalletTab) => void
  onSend: () => void
  onReceive: () => void
  onRelay: () => void
  relay: ReactNode
  activity: ReactNode
  settings: ReactNode
}

export function Shell({ tab, onTab, onSend, onReceive, onRelay, relay, activity, settings }: ShellProps) {
  const session = useSession()
  const usdt = configuredUsdt()
  const [lamports, setLamports] = useState<number | null>(null)
  const [tokenAmount, setTokenAmount] = useState<number | null>(null)
  const [rows, setRows] = useState<Payment[]>([])
  const [note, setNote] = useState("")
  const [funding, setFunding] = useState(false)
  const [requestingUsdt, setRequestingUsdt] = useState(false)
  const [faucetReady, setFaucetReady] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [connected, setConnected] = useState(true)
  const alias = session.status === "unlocked" ? session.alias : ""
  const publicKey = session.status === "unlocked" ? session.publicKey : ""

  async function refresh() {
    if (!publicKey) return
    setRefreshing(true)
    const [balance, token, list] = await Promise.all([
      readBalance(publicKey).catch(() => null),
      usdtEnabled() ? readUsdtBalance(publicKey).catch(() => null) : Promise.resolve(null),
      syncPayments(publicKey).catch(() => loadPayments()),
    ])
    if (balance !== null) {
      const refreshedAt = Date.now()
      setLamports(balance)
      setUpdatedAt(refreshedAt)
      setConnected(true)
      void setCachedBalance(publicKey, { lamports: balance, updatedAt: refreshedAt }).catch(() => undefined)
    } else {
      setConnected(false)
    }
    setTokenAmount(token ? token.amount : usdtEnabled() ? 0 : null)
    setRows(list)
    setRefreshing(false)
  }

  useEffect(() => {
    let active = true
    async function initialise() {
      const cached = await getCachedBalance(publicKey).catch(() => undefined)
      if (!active) return
      if (cached) {
        setLamports(cached.lamports)
        setUpdatedAt(cached.updatedAt)
      }
      void refresh()
      void faucetStatus().then((status) => {
        if (active) setFaucetReady(Boolean(status.configured))
      })
    }
    if (publicKey) void initialise()
    if (session.status === "unlocked" && !session.published) {
      void publishName({ alias: session.alias, publicKey: session.publicKey }).then((result) => {
        if (result.published) void session.notePublished()
      })
    }
    return () => {
      active = false
    }
  }, [publicKey])

  async function fund() {
    setFunding(true)
    setNote("")
    try {
      await fundDevnet(publicKey)
      await refresh()
      setNote("1 SOL added from Devnet.")
    } catch {
      setNote("Devnet faucet is unavailable. Use https://faucet.solana.com (Devnet) instead.")
    } finally {
      setFunding(false)
    }
  }

  async function claimUsdt() {
    if (!publicKey) return
    setRequestingUsdt(true)
    setNote("")
    try {
      const result = await requestUsdtDev(publicKey)
      if (!result.ok) {
        if (result.error === "cooldown") {
          setNote(`USDT-DEV faucet cooldown — try again in about ${result.retryAfterSec ?? 1800}s.`)
        } else if (result.error === "faucet-unconfigured") {
          setNote("USDT-DEV faucet is not configured on this server.")
        } else if (result.error === "faucet-unfunded") {
          setNote("Faucet wallet needs Devnet SOL for fees.")
        } else {
          setNote("Couldn't mint USDT-DEV right now. Try again shortly.")
        }
        return
      }
      await refresh()
      setNote(`${result.amount} ${result.symbol} added to this wallet.`)
    } catch {
      setNote("Couldn't reach the USDT-DEV faucet.")
    } finally {
      setRequestingUsdt(false)
    }
  }

  return (
    <main className="wallet-shell">
      <WalletSidebar tab={tab} alias={alias} onTab={onTab} />
      <div className="wallet-main">
        {tab === "home" ? (
          <section className="wallet-page wallet-page--home">
            <header className="wallet-home-head">
              <div className="wallet-identity">
                <span className="identity-avatar">{alias.slice(0, 1).toUpperCase()}</span>
                <div>
                  <p className="eyebrow">Your RPay wallet</p>
                  <strong>@{alias}</strong>
                  <span className={connected ? "online-state" : "online-state is-offline"}>
                    <i /> {connected ? "Devnet connected" : "Devnet offline"}
                  </span>
                </div>
              </div>
              <button
                className={refreshing ? "refresh-wallet is-refreshing" : "refresh-wallet"}
                type="button"
                onClick={() => void refresh()}
                aria-label="Refresh wallet"
              >
                <IconRefresh />
              </button>
            </header>
            <section className="wallet-balance-card">
              <div className={`wallet-balances${usdt ? " wallet-balances--dual" : ""}`}>
                <div className="wallet-balance-tile">
                  <div className="wallet-token">
                    <SolanaMark />
                    <span>
                      SOL <small>Devnet</small>
                    </span>
                  </div>
                  {lamports === null ? (
                    <div className="balance-loading" role="status">
                      <i aria-hidden="true" />
                      <span>Fetching balance</span>
                    </div>
                  ) : (
                    <p className="balance-display">
                      {formatSol(lamports)} <small>SOL</small>
                    </p>
                  )}
                </div>
                {usdt ? (
                  <div className="wallet-balance-tile">
                    <div className="wallet-token">
                      <span className="token-mark" aria-hidden="true">
                        ₮
                      </span>
                      <span>
                        {usdt.symbol} <small>Devnet</small>
                      </span>
                    </div>
                    {tokenAmount === null ? (
                      <div className="balance-loading" role="status">
                        <i aria-hidden="true" />
                        <span>Fetching balance</span>
                      </div>
                    ) : (
                      <p className="balance-display">
                        {formatTokenAmount(tokenAmount, usdt.decimals)} <small>{usdt.symbol}</small>
                      </p>
                    )}
                    {faucetReady ? (
                      <button
                        className="token-claim"
                        type="button"
                        disabled={requestingUsdt}
                        onClick={() => void claimUsdt()}
                      >
                        {requestingUsdt ? "Requesting…" : `Request ${usdt.symbol}`}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <p className="balance-unit">
                {updatedAt
                  ? `Last updated ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(updatedAt)}`
                  : "Syncing wallet"}
              </p>
              <div className="wallet-action-row">
                <button className="wallet-action wallet-action--primary" type="button" onClick={() => void fund()} disabled={funding}>
                  <span>
                    <IconPlus />
                  </span>
                  <b>{funding ? "Funding..." : "Fund"}</b>
                </button>
                <button className="wallet-action" type="button" onClick={onSend}>
                  <span>
                    <IconUp />
                  </span>
                  <b>Send</b>
                </button>
                <button className="wallet-action" type="button" onClick={onReceive}>
                  <span>
                    <IconDown />
                  </span>
                  <b>Receive</b>
                </button>
                <button className="wallet-action" type="button" onClick={onRelay}>
                  <span>
                    <IconRefresh />
                  </span>
                  <b>Relay</b>
                </button>
              </div>
            </section>
            {note ? <p className="banner info">{note}</p> : null}
            <div className="wallet-grid">
              <section className="panel">
                <div className="panel-title">
                  <h2>Recent activity</h2>
                  <button type="button" onClick={() => onTab("activity")}>
                    See all <IconArrow />
                  </button>
                </div>
                {rows.length === 0 ? (
                  <p className="muted">No payments yet. Send, receive, or relay a payment to get started.</p>
                ) : (
                  <ul className="activity-list">
                    {rows.slice(0, 5).map((row) => (
                      <li className="activity-item" key={row.id}>
                        <div>
                          <strong>
                            {row.direction === "in"
                              ? `Received from ${row.name}`
                              : row.direction === "pass"
                                ? `Relayed to ${row.name}`
                                : `Sent to ${row.name}`}
                          </strong>
                          <span className="muted">{paymentLabel(row)}</span>
                        </div>
                        <strong className={row.direction === "in" ? "pos" : ""}>
                          {row.direction === "in" ? "+" : row.direction === "pass" ? "" : "−"}
                          {paymentAmountText(row)}
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
        {tab === "relay" ? relay : null}
        {tab === "settings" ? settings : null}
      </div>
      <WalletMobileNav tab={tab} onTab={onTab} />
    </main>
  )
}
