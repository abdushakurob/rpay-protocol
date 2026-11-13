import { useCallback, useEffect, useMemo, useState } from "react"
import { QrImage } from "./components/QrImage"
import {
  configuredUsdt,
  createPaymentRequestForAsset,
  explorerTx,
  findMatchingIncomingTransfer,
  formatRequestAmount,
  formatSol,
  isSettledState,
  isValidAddress,
  labelForState,
  readMerchantBalances,
  requestPayload,
  verifySignatureState,
  type MerchantAsset,
} from "./lib/client"
import {
  loadRequests,
  loadSettings,
  saveSettings,
  upsertRequest,
  type MerchantRequestRecord,
  type MerchantSettings,
} from "./lib/store"

type View = "dashboard" | "setup" | "create" | "detail"

export function App() {
  const usdt = useMemo(() => configuredUsdt(), [])
  const [settings, setSettings] = useState<MerchantSettings | null>(() => loadSettings())
  const [requests, setRequests] = useState<MerchantRequestRecord[]>(() => loadRequests())
  const [view, setView] = useState<View>(() => (loadSettings() ? "dashboard" : "setup"))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const [displayName, setDisplayName] = useState(settings?.displayName ?? "")
  const [recipient, setRecipient] = useState(settings?.recipient ?? "")
  const [asset, setAsset] = useState<MerchantAsset>("sol")
  const [amount, setAmount] = useState("0.01")
  const [memo, setMemo] = useState("")
  const [manualSignature, setManualSignature] = useState("")
  const [balances, setBalances] = useState<{
    sol: number
    usdt: null | { uiAmount: number; symbol: string; labeledTestToken: boolean }
  } | null>(null)

  const selected = useMemo(
    () => requests.find((item) => item.id === selectedId) ?? null,
    [requests, selectedId],
  )

  const refreshBalances = useCallback(async () => {
    const recipient = loadSettings()?.recipient
    if (!recipient) {
      setBalances(null)
      return
    }
    try {
      setBalances(await readMerchantBalances(recipient))
    } catch {
      // Keep last known balances on RPC blips.
    }
  }, [])

  const refresh = useCallback(() => {
    setRequests(loadRequests())
    setSettings(loadSettings())
    void refreshBalances()
  }, [refreshBalances])

  useEffect(() => {
    void refreshBalances()
    const timer = window.setInterval(() => void refreshBalances(), 12_000)
    return () => window.clearInterval(timer)
  }, [refreshBalances, settings?.recipient])

  useEffect(() => {
    if (!selected || selected.status === "confirmed" || selected.status === "finalized") return
    let cancelled = false

    async function poll() {
      if (!selected) return
      try {
        const match = await findMatchingIncomingTransfer({
          request: selected.request,
          createdAt: selected.createdAt,
        })
        if (cancelled || !match) return
        const next: MerchantRequestRecord = {
          ...selected,
          signature: match.signature,
          status: match.state,
          note: match.settled ? "Verified on Solana Devnet" : `Observed as ${labelForState(match.state)}`,
        }
        setRequests(upsertRequest(next))
      } catch {
        // Keep waiting; RPC blips are not settlement failures.
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), 8_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [selected])

  function saveMerchant() {
    setError("")
    const address = recipient.trim()
    if (!isValidAddress(address)) {
      setError("Enter a valid Solana address.")
      return
    }
    const next = { recipient: address, displayName: displayName.trim() || "RPay Merchant" }
    saveSettings(next)
    setSettings(next)
    setView("dashboard")
  }

  function createRequest() {
    if (!settings) return
    setError("")
    if (asset === "usdt" && !usdt) {
      setError("Set VITE_USDT_MINT (see npm run usdt:devnet) before requesting USDT.")
      return
    }
    const request = createPaymentRequestForAsset({
      recipient: settings.recipient,
      amountInput: amount,
      asset,
      memo: memo.trim() || undefined,
    })
    if (!request) {
      setError(asset === "sol" ? "Enter a valid SOL amount." : "Enter a valid USDT amount.")
      return
    }
    const record: MerchantRequestRecord = {
      id: request.requestId,
      createdAt: Date.now(),
      request,
      payload: requestPayload(request),
      status: "pending",
    }
    setRequests(upsertRequest(record))
    setSelectedId(record.id)
    setView("detail")
    setAmount(asset === "sol" ? "0.01" : "1")
    setMemo("")
  }

  async function verifyManual() {
    if (!selected) return
    setError("")
    setBusy(true)
    try {
      const signature = manualSignature.trim()
      if (!signature) {
        setError("Paste a transaction signature to verify.")
        return
      }
      const state = await verifySignatureState(signature)
      const next: MerchantRequestRecord = {
        ...selected,
        signature,
        status: state,
        note: isSettledState(state)
          ? "Verified on Solana Devnet"
          : `Chain status: ${labelForState(state)} — do not treat as settled yet`,
      }
      setRequests(upsertRequest(next))
      setManualSignature("")
    } catch {
      setError("Could not verify that signature on Devnet.")
    } finally {
      setBusy(false)
    }
  }

  async function scanAgain() {
    if (!selected) return
    setBusy(true)
    setError("")
    try {
      const match = await findMatchingIncomingTransfer({
        request: selected.request,
        createdAt: selected.createdAt,
      })
      if (!match) {
        setError("No matching on-chain transfer found yet.")
        return
      }
      const next: MerchantRequestRecord = {
        ...selected,
        signature: match.signature,
        status: match.state,
        note: match.settled ? "Verified on Solana Devnet" : `Observed as ${labelForState(match.state)}`,
      }
      setRequests(upsertRequest(next))
    } catch {
      setError("RPC lookup failed. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">RPay Protocol</p>
          <h1>Merchant</h1>
        </div>
        {settings ? (
          <button type="button" className="ghost" onClick={() => setView("setup")}>
            Settings
          </button>
        ) : null}
      </header>

      <main className="panel">
        {view === "setup" ? (
          <section className="stack">
            <h2>Receiving wallet</h2>
            <p className="muted">
              Payments settle to this Solana Devnet address. The merchant app never asks for private keys.
            </p>
            <label>
              Display name
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Market stall" />
            </label>
            <label>
              Recipient address
              <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Base58 public key" />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="button" className="primary" onClick={saveMerchant}>
              Save and continue
            </button>
          </section>
        ) : null}

        {view === "dashboard" && settings ? (
          <section className="stack">
            <div className="hero-card">
              <p className="eyebrow">{settings.displayName}</p>
              <h2>Accept a payment</h2>
              <p className="muted">Create a protocol payment request for SOL or USDT. Customers authorize offline; you verify on-chain.</p>
              <div className="balance-strip">
                <div>
                  <span>SOL</span>
                  <strong>{balances ? formatSol(balances.sol) : "—"}</strong>
                </div>
                <div>
                  <span>{balances?.usdt?.symbol ?? usdt?.symbol ?? "USDT-DEV"}</span>
                  <strong>
                    {balances?.usdt
                      ? balances.usdt.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })
                      : usdt
                        ? "0"
                        : "—"}
                  </strong>
                </div>
              </div>
              <p className="muted tiny">
                Receiving at {settings.recipient.slice(0, 4)}…{settings.recipient.slice(-4)}
                {balances?.usdt?.labeledTestToken ? " · USDT-DEV test mint" : ""}
              </p>
              <button type="button" className="primary" onClick={() => setView("create")}>
                New payment request
              </button>
            </div>

            <div className="list-head">
              <h3>Requests</h3>
              <button type="button" className="ghost" onClick={refresh}>
                Refresh
              </button>
            </div>

            {requests.length === 0 ? (
              <p className="muted">No payment requests yet.</p>
            ) : (
              <ul className="request-list">
                {requests.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="request-row"
                      onClick={() => {
                        setSelectedId(item.id)
                        setView("detail")
                      }}
                    >
                      <span>
                        <strong>{formatRequestAmount(item.request)}</strong>
                        <small>{new Date(item.createdAt).toLocaleString()}</small>
                      </span>
                      <em data-state={item.status}>
                        {item.status === "pending" ? "Awaiting payment" : labelForState(item.status)}
                      </em>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {view === "create" && settings ? (
          <section className="stack">
            <button type="button" className="ghost back" onClick={() => setView("dashboard")}>
              Back
            </button>
            <h2>New request</h2>
            <div className="asset-row" role="group" aria-label="Asset">
              <button type="button" className={asset === "sol" ? "active" : ""} onClick={() => { setAsset("sol"); setAmount("0.01") }}>
                SOL
              </button>
              <button
                type="button"
                className={asset === "usdt" ? "active" : ""}
                disabled={!usdt}
                onClick={() => { setAsset("usdt"); setAmount("1") }}
              >
                {usdt?.labeledTestToken ? "USDT-DEV" : "USDT"}
              </button>
            </div>
            {!usdt ? (
              <p className="muted">USDT requires `VITE_USDT_MINT`. Create a Devnet test mint with `npm run usdt:devnet`.</p>
            ) : usdt.labeledTestToken ? (
              <p className="muted">Using a labeled Devnet test mint — not official Tether USDT.</p>
            ) : null}
            <label>
              Amount ({asset === "sol" ? "SOL" : usdt?.symbol ?? "USDT"})
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
            </label>
            <label>
              Memo (optional)
              <input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Order #42" />
            </label>
            <p className="muted">Pays to {settings.recipient.slice(0, 4)}…{settings.recipient.slice(-4)}</p>
            {error ? <p className="error">{error}</p> : null}
            <button type="button" className="primary" onClick={createRequest}>
              Generate QR
            </button>
          </section>
        ) : null}

        {view === "detail" && selected ? (
          <section className="stack">
            <button type="button" className="ghost back" onClick={() => setView("dashboard")}>
              Back
            </button>
            <h2>{formatRequestAmount(selected.request)}</h2>
            <p className="status" data-state={selected.status}>
              {selected.status === "pending" ? "Awaiting payment" : labelForState(selected.status)}
            </p>
            {selected.note ? <p className="muted">{selected.note}</p> : null}
            {selected.request.memo ? <p className="muted">Memo: {selected.request.memo}</p> : null}
            {selected.request.asset.kind === "spl_token" && selected.request.asset.symbol !== "USDT" ? (
              <p className="muted">Test token mint: {selected.request.asset.mint}</p>
            ) : null}

            <div className="qr-wrap">
              <QrImage text={selected.payload} />
            </div>
            <p className="muted center">
              Customer scans this RPay payment request, signs locally, and a connected relay submits to Solana.
            </p>

            <details>
              <summary>Request payload</summary>
              <pre>{selected.payload}</pre>
            </details>

            <div className="actions">
              <button type="button" className="primary" disabled={busy} onClick={() => void scanAgain()}>
                {busy ? "Checking…" : "Check Solana for payment"}
              </button>
            </div>

            <label>
              Or paste transaction signature
              <input
                value={manualSignature}
                onChange={(event) => setManualSignature(event.target.value)}
                placeholder="Base58 signature"
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="button" className="ghost" disabled={busy} onClick={() => void verifyManual()}>
              Verify signature
            </button>

            {selected.signature ? (
              <a className="explorer" href={explorerTx(selected.signature)} target="_blank" rel="noreferrer">
                Open on Solana Explorer
              </a>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  )
}
