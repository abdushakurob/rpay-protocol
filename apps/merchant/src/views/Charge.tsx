import type { MerchantAsset } from "../lib/client"

type Usdt = { symbol: string; labeledTestToken: boolean } | null | undefined

type Props = {
  payoutAddress: string
  asset: MerchantAsset
  amount: string
  memo: string
  usdt: Usdt
  error: string
  onAsset: (asset: MerchantAsset) => void
  onAmount: (value: string) => void
  onMemo: (value: string) => void
  onBack: () => void
  onSubmit: () => void
}

const SOL_PRESETS = ["0.01", "0.05", "0.1"]
const USDT_PRESETS = ["1", "5", "10"]

function shortAddr(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export function Charge({
  payoutAddress,
  asset,
  amount,
  memo,
  usdt,
  error,
  onAsset,
  onAmount,
  onMemo,
  onBack,
  onSubmit,
}: Props) {
  const presets = asset === "sol" ? SOL_PRESETS : USDT_PRESETS

  return (
    <section className="flow-page">
      <div className="topbar">
        <button className="back" type="button" aria-label="Back" onClick={onBack}>
          ←
        </button>
        <h1>Charge</h1>
        <span />
      </div>
      <div className="sheet">
        <p className="flow-kicker">New sale</p>
        <h2>How much are they paying?</h2>
        <div className="asset-toggle" role="group" aria-label="Asset">
          <button
            type="button"
            className={asset === "sol" ? "active" : ""}
            onClick={() => {
              onAsset("sol")
              onAmount("0.01")
            }}
          >
            SOL
          </button>
          <button
            type="button"
            className={asset === "usdt" ? "active" : ""}
            disabled={!usdt}
            onClick={() => {
              onAsset("usdt")
              onAmount("1")
            }}
          >
            {usdt?.labeledTestToken ? "USDT-DEV" : "USDT"}
          </button>
        </div>
        <div className="amount-presets" role="group" aria-label="Amount presets">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={amount === preset ? "active" : ""}
              onClick={() => onAmount(preset)}
            >
              {preset} {asset === "sol" ? "SOL" : usdt?.symbol ?? "USDT"}
            </button>
          ))}
        </div>
        <label>
          Amount
          <input
            className="amount-input"
            value={amount}
            onChange={(event) => onAmount(event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          Note (optional)
          <input
            value={memo}
            onChange={(event) => onMemo(event.target.value)}
            placeholder="Order #42 / Table 3"
          />
        </label>
        <p className="hint">Money goes to {shortAddr(payoutAddress)}</p>
        {usdt?.labeledTestToken && asset === "usdt" ? (
          <p className="hint">Devnet test token — not official Tether USDT.</p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className="primary" onClick={onSubmit}>
          Show payment QR
        </button>
      </div>
    </section>
  )
}
