import { useState } from "react"
import type { MerchantProfile } from "../lib/auth"
import { RPC_URL } from "../lib/client"

type Props = {
  profile: MerchantProfile
  chargeCount: number
  onChangeWallet: () => void
  onClearHistory: () => void
  onLogOut: () => void
  onNavigate: (tab: "overview" | "transactions" | "settings") => void
  onCharge: () => void
}

function shortAddr(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-6)}`
}

export function Settings({
  profile,
  chargeCount,
  onChangeWallet,
  onClearHistory,
  onLogOut,
  onNavigate,
  onCharge,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const address = profile.payoutAddress ?? ""
  const initial = profile.shopName.slice(0, 1).toUpperCase()

  function copyAddress() {
    if (!address) return
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <div className="dash">
      <header className="dash-head">
        <div className="merchant-identity">
          <span className="identity-avatar">{initial}</span>
          <div>
            <p className="eyebrow">Shop settings</p>
            <strong>{profile.shopName}</strong>
            <span className="online-state">
              <i /> Devnet
            </span>
          </div>
        </div>
        <nav className="dash-nav" aria-label="Merchant sections">
          <button type="button" onClick={() => onNavigate("overview")}>
            Overview
          </button>
          <button type="button" onClick={() => onNavigate("transactions")}>
            Transactions
          </button>
          <button type="button" className="active" aria-current="page">
            Settings
          </button>
        </nav>
      </header>

      <section className="settings-grid">
        <article className="settings-card settings-card--shop">
          <p className="dash-kicker">Shop</p>
          <h2>{profile.shopName}</h2>
          <p className="settings-lead">
            This name lives on this device only. Customers never see a login — they scan your charge QR.
          </p>
          <dl className="settings-dl">
            <div>
              <dt>Charges stored</dt>
              <dd>{chargeCount}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>Solana Devnet</dd>
            </div>
          </dl>
          <button type="button" className="settings-primary" onClick={onCharge}>
            Charge customer <span>→</span>
          </button>
        </article>

        <article className="settings-card">
          <p className="dash-kicker">Payout wallet</p>
          <h2>Where money lands</h2>
          <p className="settings-lead">Incoming payments settle to this Solana address.</p>
          {address ? (
            <>
              <div className="settings-wallet-row">
                <code title={address}>{shortAddr(address)}</code>
                <button type="button" className="settings-secondary" onClick={copyAddress}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="settings-mono">{address}</p>
              <button type="button" className="settings-secondary" onClick={onChangeWallet}>
                Change payout wallet
              </button>
            </>
          ) : (
            <button type="button" className="settings-primary" onClick={onChangeWallet}>
              Add payout wallet
            </button>
          )}
        </article>

        <article className="settings-card">
          <p className="dash-kicker">Connection</p>
          <h2>RPC</h2>
          <p className="settings-lead">Used for balances and payment checks.</p>
          <p className="settings-mono">{RPC_URL}</p>
          <p className="settings-note">Override with <code>VITE_RPC_URL</code> when you rebuild the app.</p>
        </article>

        <article className="settings-card settings-card--danger">
          <p className="dash-kicker">Device</p>
          <h2>Local data</h2>
          <p className="settings-lead">
            Charge history is saved in this browser. Clearing it does not move or reverse on-chain payments.
          </p>
          {!confirmClear ? (
            <div className="settings-row-actions">
              <button type="button" className="settings-secondary" onClick={() => setConfirmClear(true)}>
                Clear charge history
              </button>
              <button type="button" className="settings-ghost" onClick={onLogOut}>
                Log out
              </button>
            </div>
          ) : (
            <div className="settings-confirm-box">
              <p>Remove {chargeCount} local charge{chargeCount === 1 ? "" : "s"} from this device?</p>
              <div className="settings-row-actions">
                <button
                  type="button"
                  className="settings-danger"
                  onClick={() => {
                    onClearHistory()
                    setConfirmClear(false)
                  }}
                >
                  Confirm clear
                </button>
                <button type="button" className="settings-secondary" onClick={() => setConfirmClear(false)}>
                  Keep history
                </button>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
