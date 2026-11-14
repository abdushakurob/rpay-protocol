import { useCallback, useEffect, useMemo, useState } from "react"
import { QrImage } from "./components/QrImage"
import {
  hasAccount,
  isLoggedIn,
  loadProfile,
  logIn,
  logOut,
  savePayoutAddress,
  signUp,
  type MerchantProfile,
} from "./lib/auth"
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
import { loadRequests, upsertRequest, type MerchantRequestRecord } from "./lib/store"

type Gate = "welcome" | "signup" | "login"
type View = "wallet-setup" | "home" | "charge" | "request" | "settings"

function shortAddr(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

function statusLabel(status: MerchantRequestRecord["status"]) {
  if (status === "pending") return "Waiting"
  if (status === "confirmed" || status === "finalized") return "Paid"
  if (status === "failed") return "Failed"
  return labelForState(status)
}

function authErrorMessage(code: string) {
  if (code === "shop-name") return "Enter a shop name (at least 2 characters)."
  if (code === "password-short") return "Password must be at least 6 characters."
  if (code === "exists") return "A shop is already set up on this device. Log in instead."
  if (code === "missing") return "No shop found on this device. Create one first."
  if (code === "shop") return "Shop name doesn’t match this device."
  if (code === "password") return "Wrong password."
  return "Something went wrong. Try again."
}

export function App() {
  const usdt = useMemo(() => configuredUsdt(), [])
  const [profile, setProfile] = useState<MerchantProfile | null>(() =>
    isLoggedIn() ? loadProfile() : null,
  )
  const [gate, setGate] = useState<Gate>(() => (hasAccount() ? "login" : "welcome"))
  const [view, setView] = useState<View>(() => {
    if (!isLoggedIn()) return "home"
    const current = loadProfile()
    return current?.payoutAddress ? "home" : "wallet-setup"
  })
  const [requests, setRequests] = useState<MerchantRequestRecord[]>(() => loadRequests())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const [shopName, setShopName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [payoutAddress, setPayoutAddress] = useState("")
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
  const paid = !!selected && selected.status !== "pending" && isSettledState(selected.status)
  const loggedIn = Boolean(profile)
  const ready = Boolean(profile?.payoutAddress)

  const refreshBalances = useCallback(async () => {
    const address = loadProfile()?.payoutAddress
    if (!address) {
      setBalances(null)
      return
    }
    try {
      setBalances(await readMerchantBalances(address))
    } catch {
      // Keep last known balances on RPC blips.
    }
  }, [])

  const refresh = useCallback(() => {
    setRequests(loadRequests())
    setProfile(loadProfile())
    void refreshBalances()
  }, [refreshBalances])

  useEffect(() => {
    if (!ready) return
    void refreshBalances()
    const timer = window.setInterval(() => void refreshBalances(), 12_000)
    return () => window.clearInterval(timer)
  }, [refreshBalances, ready, profile?.payoutAddress])

  useEffect(() => {
    if (!selected || paid) return
    let cancelled = false
    async function poll() {
      if (!selected) return
      try {
        const match = await findMatchingIncomingTransfer({
          request: selected.request,
          createdAt: selected.createdAt,
        })
        if (cancelled || !match) return
        setRequests(
          upsertRequest({
            ...selected,
            signature: match.signature,
            status: match.state,
            note: match.settled
              ? "Payment received on Solana Devnet"
              : `Seen on-chain as ${labelForState(match.state)}`,
          }),
        )
      } catch {
        // Keep waiting.
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 8_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [selected, paid])

  async function handleSignUp() {
    setError("")
    setBusy(true)
    try {
      if (password !== confirmPassword) {
        setError("Passwords don’t match.")
        return
      }
      const next = await signUp(shopName, password)
      setProfile(next)
      setPassword("")
      setConfirmPassword("")
      setView("wallet-setup")
    } catch (err) {
      setError(authErrorMessage(err instanceof Error ? err.message : ""))
    } finally {
      setBusy(false)
    }
  }

  async function handleLogIn() {
    setError("")
    setBusy(true)
    try {
      const next = await logIn(shopName, password)
      setProfile(next)
      setPassword("")
      setView(next.payoutAddress ? "home" : "wallet-setup")
      if (next.payoutAddress) setPayoutAddress(next.payoutAddress)
    } catch (err) {
      setError(authErrorMessage(err instanceof Error ? err.message : ""))
    } finally {
      setBusy(false)
    }
  }

  function handleLogOut() {
    logOut()
    setProfile(null)
    setGate(hasAccount() ? "login" : "welcome")
    setView("home")
    setError("")
  }

  function saveWallet() {
    setError("")
    const address = payoutAddress.trim()
    if (!isValidAddress(address)) {
      setError("Paste a valid Solana address from your RPay wallet.")
      return
    }
    savePayoutAddress(address)
    setProfile(loadProfile())
    setView("home")
  }

  function createCharge() {
    if (!profile?.payoutAddress) return
    setError("")
    if (asset === "usdt" && !usdt) {
      setError("USDT-DEV isn’t configured on this build.")
      return
    }
    const request = createPaymentRequestForAsset({
      recipient: profile.payoutAddress,
      amountInput: amount,
      asset,
      memo: memo.trim() || undefined,
    })
    if (!request) {
      setError(asset === "sol" ? "Enter a valid SOL amount." : "Enter a valid amount.")
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
    setView("request")
    setAmount(asset === "sol" ? "0.01" : "1")
    setMemo("")
  }

  async function checkPayment() {
    if (!selected) return
    setBusy(true)
    setError("")
    try {
      const match = await findMatchingIncomingTransfer({
        request: selected.request,
        createdAt: selected.createdAt,
      })
      if (!match) {
        setError("No matching payment on Solana yet. Ask the customer to finish sending.")
        return
      }
      setRequests(
        upsertRequest({
          ...selected,
          signature: match.signature,
          status: match.state,
          note: match.settled
            ? "Payment received on Solana Devnet"
            : `Seen on-chain as ${labelForState(match.state)}`,
        }),
      )
    } catch {
      setError("Couldn’t reach Devnet. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function verifyManual() {
    if (!selected) return
    setError("")
    setBusy(true)
    try {
      const signature = manualSignature.trim()
      if (!signature) {
        setError("Paste the transaction signature from the customer.")
        return
      }
      const state = await verifySignatureState(signature)
      setRequests(
        upsertRequest({
          ...selected,
          signature,
          status: state,
          note: isSettledState(state)
            ? "Payment received on Solana Devnet"
            : `Chain status: ${labelForState(state)} — not settled yet`,
        }),
      )
      setManualSignature("")
    } catch {
      setError("That signature couldn’t be verified on Devnet.")
    } finally {
      setBusy(false)
    }
  }

  // ——— Auth gates ———
  if (!loggedIn) {
    if (gate === "welcome") {
      return (
        <div className="merchant-shell">
          <section className="sheet setup-card">
            <p className="flow-kicker">RPay Merchant</p>
            <h2>Your shop till on Solana.</h2>
            <p className="muted">
              Create a shop account on this phone, then connect the wallet where customer payments should land.
            </p>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setError("")
                setGate("signup")
              }}
            >
              Create shop
            </button>
            {hasAccount() ? (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setError("")
                  setGate("login")
                }}
              >
                Log in
              </button>
            ) : null}
          </section>
        </div>
      )
    }

    if (gate === "signup") {
      return (
        <div className="merchant-shell">
          <section className="sheet setup-card">
            <p className="flow-kicker">Create shop</p>
            <h2>Sign up</h2>
            <p className="muted">Just a shop name and password — same idea as any app account.</p>
            <label>
              Shop name
              <input
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
                placeholder="e.g. Green Market"
                autoComplete="organization"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="button" className="primary" disabled={busy} onClick={() => void handleSignUp()}>
              {busy ? "Creating…" : "Create account"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setError("")
                setGate(hasAccount() ? "login" : "welcome")
              }}
            >
              Back
            </button>
          </section>
        </div>
      )
    }

    return (
      <div className="merchant-shell">
        <section className="sheet setup-card">
          <p className="flow-kicker">Welcome back</p>
          <h2>Log in</h2>
          <p className="muted">Unlock your shop on this device.</p>
          <label>
            Shop name
            <input
              value={shopName}
              onChange={(event) => setShopName(event.target.value)}
              placeholder="Your shop name"
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="button" className="primary" disabled={busy} onClick={() => void handleLogIn()}>
            {busy ? "Logging in…" : "Log in"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setError("")
              setGate("welcome")
            }}
          >
            Back
          </button>
        </section>
      </div>
    )
  }

  // ——— Wallet setup (after login) ———
  if (view === "wallet-setup" || !ready) {
    const walletUrl = import.meta.env.VITE_WALLET_URL || "http://localhost:5173"
    return (
      <div className="merchant-shell">
        <section className="sheet setup-card">
          <p className="flow-kicker">Step 2 · Payout wallet</p>
          <h2>Create your RPay wallet.</h2>
          <p className="muted">
            You’re signed in as <strong style={{ color: "#f2faf4" }}>{profile?.shopName}</strong>. Customer payments need
            a wallet address — create that in the RPay wallet app, then paste it here.
          </p>
          <a className="primary link-btn" href={walletUrl} target="_blank" rel="noreferrer">
            Open RPay wallet <span>→</span>
          </a>
          <p className="hint">In the wallet: create or unlock your account → Receive → copy address → come back here.</p>
          <label>
            Paste your RPay address
            <input
              value={payoutAddress}
              onChange={(event) => setPayoutAddress(event.target.value)}
              placeholder="Solana address from Receive"
              spellCheck={false}
              autoCapitalize="off"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="button" className="primary" onClick={saveWallet}>
            Save and open till
          </button>
          <button type="button" className="ghost" onClick={handleLogOut}>
            Log out
          </button>
        </section>
      </div>
    )
  }

  if (view === "settings" && profile) {
    return (
      <div className="merchant-shell">
        <section className="flow-page">
          <div className="topbar">
            <button className="back" type="button" aria-label="Back" onClick={() => setView("home")}>
              ←
            </button>
            <h1>Settings</h1>
            <span />
          </div>
          <div className="sheet">
            <p className="flow-kicker">Shop</p>
            <h2>{profile.shopName}</h2>
            <p className="hint">Payout wallet: {shortAddr(profile.payoutAddress!)}</p>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setPayoutAddress(profile.payoutAddress ?? "")
                setView("wallet-setup")
              }}
            >
              Change payout wallet
            </button>
            <button type="button" className="ghost" onClick={handleLogOut}>
              Log out
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (view === "charge" && profile?.payoutAddress) {
    return (
      <div className="merchant-shell">
        <section className="flow-page">
          <div className="topbar">
            <button className="back" type="button" aria-label="Back" onClick={() => setView("home")}>
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
                  setAsset("sol")
                  setAmount("0.01")
                }}
              >
                SOL
              </button>
              <button
                type="button"
                className={asset === "usdt" ? "active" : ""}
                disabled={!usdt}
                onClick={() => {
                  setAsset("usdt")
                  setAmount("1")
                }}
              >
                {usdt?.labeledTestToken ? "USDT-DEV" : "USDT"}
              </button>
            </div>
            <label>
              Amount
              <input
                className="amount-input"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
              />
            </label>
            <label>
              Note (optional)
              <input
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="Order #42 / Table 3"
              />
            </label>
            <p className="hint">Money goes to {shortAddr(profile.payoutAddress)}</p>
            {usdt?.labeledTestToken && asset === "usdt" ? (
              <p className="hint">Devnet test token — not official Tether USDT.</p>
            ) : null}
            {error ? <p className="error">{error}</p> : null}
            <button type="button" className="primary" onClick={createCharge}>
              Show payment QR
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (view === "request" && selected) {
    return (
      <div className="merchant-shell">
        <section className="flow-page">
          <div className="topbar">
            <button className="back" type="button" aria-label="Back" onClick={() => setView("home")}>
              ←
            </button>
            <h1>Payment</h1>
            <span />
          </div>
          <div className="sheet">
            <p className="flow-kicker">{paid ? "Settled" : "Show to customer"}</p>
            <h2>{formatRequestAmount(selected.request)}</h2>
            {selected.request.memo ? <p className="hint">{selected.request.memo}</p> : null}
            {paid ? (
              <div className="paid-banner">Paid — funds are on your payout wallet.</div>
            ) : (
              <div className="waiting-pulse">
                <i /> Waiting for customer to pay
              </div>
            )}
            <div className="qr-stage">
              <QrImage text={selected.payload} />
              <p className="muted" style={{ color: "#5b6b64", textAlign: "center", margin: 0 }}>
                Customer: RPay → Send → Scan merchant request
              </p>
            </div>
            <button type="button" className="primary" disabled={busy || paid} onClick={() => void checkPayment()}>
              {busy ? "Checking Solana…" : paid ? "Payment confirmed" : "Check for payment"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(selected.payload).then(() => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1600)
                })
              }}
            >
              {copied ? "Request copied" : "Copy request code"}
            </button>
            {!paid ? (
              <>
                <label>
                  Or paste their transaction signature
                  <input
                    value={manualSignature}
                    onChange={(event) => setManualSignature(event.target.value)}
                    placeholder="Base58 signature"
                    spellCheck={false}
                  />
                </label>
                <button type="button" className="ghost" disabled={busy} onClick={() => void verifyManual()}>
                  Verify signature
                </button>
              </>
            ) : null}
            {error ? <p className="error">{error}</p> : null}
            {selected.note ? <p className="hint">{selected.note}</p> : null}
            {selected.signature ? (
              <a className="explorer-link" href={explorerTx(selected.signature)} target="_blank" rel="noreferrer">
                View on Solana Explorer
              </a>
            ) : null}
            <button type="button" className="ghost" onClick={() => setView("charge")}>
              New charge
            </button>
          </div>
        </section>
      </div>
    )
  }

  const shop = profile!.shopName
  const initial = shop.slice(0, 1).toUpperCase()

  return (
    <div className="merchant-shell">
      <header className="merchant-head">
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
        <button className="text-btn" type="button" onClick={() => setView("settings")}>
          Settings
        </button>
      </header>

      <section className="merchant-balance-card">
        <div className={`wallet-balances${usdt ? " wallet-balances--dual" : ""}`}>
          <div className="wallet-balance-tile">
            <div className="wallet-token">
              <span className="sol-mark" aria-hidden="true">
                S
              </span>
              <span>
                SOL <small>Devnet</small>
              </span>
            </div>
            <p className="balance-display">
              {balances ? formatSol(balances.sol) : "—"} <small>SOL</small>
            </p>
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
              <p className="balance-display">
                {balances?.usdt
                  ? balances.usdt.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })
                  : "0"}{" "}
                <small>{usdt.symbol}</small>
              </p>
            </div>
          ) : null}
        </div>
        <p className="receive-meta">Payments land at {shortAddr(profile!.payoutAddress!)}</p>
        <button className="charge-btn" type="button" onClick={() => setView("charge")}>
          Charge customer <span>→</span>
        </button>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Recent charges</h2>
          <button className="text-btn" type="button" onClick={refresh}>
            Refresh
          </button>
        </div>
        {requests.length === 0 ? (
          <div className="empty-state">
            <strong>No charges yet</strong>
            <p className="muted">Tap Charge customer, show the QR, then confirm when Solana settles.</p>
          </div>
        ) : (
          <ul className="request-list">
            {requests.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="request-row"
                  onClick={() => {
                    setSelectedId(item.id)
                    setView("request")
                  }}
                >
                  <span>
                    <strong>{formatRequestAmount(item.request)}</strong>
                    <small>
                      {item.request.memo ? `${item.request.memo} · ` : ""}
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
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
