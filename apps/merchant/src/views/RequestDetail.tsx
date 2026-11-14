import { QrImage } from "../components/QrImage"
import { explorerTx, formatRequestAmount } from "../lib/client"
import { isPaidStatus, isWaitingStatus, statusLabel, type MerchantRequestRecord } from "../lib/store"

type Props = {
  selected: MerchantRequestRecord
  busy: boolean
  error: string
  copied: boolean
  manualSignature: string
  onManualSignature: (value: string) => void
  onBack: () => void
  onCheck: () => void
  onVerifyManual: () => void
  onCopy: () => void
  onCancel: () => void
  onNewCharge: () => void
  onDone: () => void
}

export function RequestDetail({
  selected,
  busy,
  error,
  copied,
  manualSignature,
  onManualSignature,
  onBack,
  onCheck,
  onVerifyManual,
  onCopy,
  onCancel,
  onNewCharge,
  onDone,
}: Props) {
  const paid = isPaidStatus(selected.status)
  const waiting = isWaitingStatus(selected.status)

  return (
    <section className="flow-page">
      <div className="topbar">
        <button className="back" type="button" aria-label="Back" onClick={onBack}>
          ←
        </button>
        <h1>Payment</h1>
        <span />
      </div>
      <div className="sheet">
        <p className="flow-kicker">{paid ? "Settled" : waiting ? "Show to customer" : statusLabel(selected.status)}</p>
        <h2>{formatRequestAmount(selected.request)}</h2>
        {selected.request.memo ? <p className="hint">{selected.request.memo}</p> : null}
        <p className="hint">
          {new Date(selected.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>

        {paid ? (
          <div className="paid-banner">Paid — funds are on your payout wallet.</div>
        ) : waiting ? (
          <div className="waiting-pulse">
            <i /> Waiting for customer to pay
          </div>
        ) : selected.status === "cancelled" ? (
          <div className="cancelled-banner">This charge was cancelled.</div>
        ) : null}

        {waiting || paid ? (
          <div className="qr-stage">
            <QrImage text={selected.payload} />
            {waiting ? (
              <p className="muted" style={{ color: "#5b6b64", textAlign: "center", margin: 0 }}>
                Customer: RPay → Send → Scan merchant request
              </p>
            ) : null}
          </div>
        ) : null}

        {waiting ? (
          <>
            <button type="button" className="primary" disabled={busy} onClick={onCheck}>
              {busy ? "Checking Solana…" : "Check for payment"}
            </button>
            <button type="button" className="ghost" onClick={onCopy}>
              {copied ? "Request copied" : "Copy request code"}
            </button>
            <label>
              Or paste their transaction signature
              <input
                value={manualSignature}
                onChange={(event) => onManualSignature(event.target.value)}
                placeholder="Base58 signature"
                spellCheck={false}
              />
            </label>
            <button type="button" className="ghost" disabled={busy} onClick={onVerifyManual}>
              Verify signature
            </button>
            <button type="button" className="ghost danger-text" onClick={onCancel}>
              Cancel charge
            </button>
          </>
        ) : null}

        {paid ? (
          <>
            <button type="button" className="primary" onClick={onNewCharge}>
              New charge
            </button>
            <button type="button" className="ghost" onClick={onDone}>
              Done
            </button>
          </>
        ) : null}

        {!waiting && !paid ? (
          <button type="button" className="primary" onClick={onNewCharge}>
            New charge
          </button>
        ) : null}

        {error ? <p className="error">{error}</p> : null}
        {selected.note ? <p className="hint">{selected.note}</p> : null}
        {selected.signature ? (
          <a className="explorer-link" href={explorerTx(selected.signature)} target="_blank" rel="noreferrer">
            View on Solana Explorer
          </a>
        ) : null}
      </div>
    </section>
  )
}
