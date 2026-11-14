import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  findMatchingIncomingTransfer,
  isSettledState,
  isValidAddress,
  labelForState,
  readMerchantBalances,
  requestPayload,
  verifySignatureState,
  type MerchantAsset,
} from "./lib/client"
import {
  cancelRequest,
  clearRequests,
  isPaidStatus,
  loadRequests,
  upsertRequest,
  type MerchantRequestRecord,
  type VolumeRange,
} from "./lib/store"
import { Charge } from "./views/Charge"
import { Overview } from "./views/Overview"
import { RequestDetail } from "./views/RequestDetail"
import { Settings } from "./views/Settings"
import { Transactions } from "./views/Transactions"

type Gate = "welcome" | "signup" | "login"
type Tab = "overview" | "transactions" | "settings"
type View = "wallet-setup" | Tab | "charge" | "request"

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
    if (!isLoggedIn()) return "overview"
    const current = loadProfile()
    return current?.payoutAddress ? "overview" : "wallet-setup"
  })
  const [requests, setRequests] = useState<MerchantRequestRecord[]>(() => loadRequests())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [networkHint, setNetworkHint] = useState<string | null>(null)
  const [range, setRange] = useState<VolumeRange>(7)

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

  const celebrated = useRef<Set<string>>(new Set())

  const selected = useMemo(
    () => requests.find((item) => item.id === selectedId) ?? null,
    [requests, selectedId],
  )
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
      setNetworkHint(null)
    } catch {
      setNetworkHint("Couldn’t refresh balances — check your connection.")
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
    if (!selected || isPaidStatus(selected.status)) return
    let cancelled = false
    async function poll() {
      if (!selected) return
      try {
        const match = await findMatchingIncomingTransfer({
          request: selected.request,
          createdAt: selected.createdAt,
        })
        if (cancelled || !match) return
        const next = {
          ...selected,
          signature: match.signature,
          status: match.state,
          note: match.settled
            ? "Payment received on Solana Devnet"
            : `Seen on-chain as ${labelForState(match.state)}`,
        }
        setRequests(upsertRequest(next))
        if (match.settled && !celebrated.current.has(selected.id)) {
          celebrated.current.add(selected.id)
          try {
            navigator.vibrate?.(40)
          } catch {
            // ignore
          }
        }
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
  }, [selected])

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
      setView(next.payoutAddress ? "overview" : "wallet-setup")
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
    setView("overview")
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
    setView("overview")
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
      if (match.settled) {
        try {
          navigator.vibrate?.(40)
        } catch {
          // ignore
        }
      }
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
      if (isSettledState(state)) {
        try {
          navigator.vibrate?.(40)
        } catch {
          // ignore
        }
      }
    } catch {
      setError("That signature couldn’t be verified on Devnet.")
    } finally {
      setBusy(false)
    }
  }

  function openRequest(id: string) {
    setSelectedId(id)
    setError("")
    setView("request")
  }

  // ——— Auth gates ———
  if (!loggedIn) {
    if (gate === "welcome") {
      return (
        <div className="merchant-shell merchant-shell--welcome">
          <div className="merchant-welcome-layout">
            <section className="merchant-welcome-copy">
              <div className="merchant-welcome-brand">
                <span>R</span>
                <strong>RPay Merchant</strong>
                <small>Solana Devnet</small>
              </div>
              <p className="merchant-welcome-kicker">PAYMENTS / CONNECTED</p>
              <h1>Get paid with confidence.</h1>
              <p>
                Create a payment request, show its QR code, and confirm the result on Solana. Your shop stays in control
                from the first charge to the final check.
              </p>
              <div className="merchant-welcome-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setError("")
                    setGate("signup")
                  }}
                >
                  Create your shop <span aria-hidden="true">↗</span>
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
              </div>
              <div className="merchant-welcome-foot">
                <span>PAYMENT REQUESTS</span>
                <span>ON-CHAIN VERIFICATION</span>
              </div>
            </section>
            <aside className="merchant-welcome-visual" aria-label="Merchant payment interface preview">
              <div className="merchant-preview-card">
                <div className="merchant-preview-head">
                  <span className="merchant-preview-mark">R</span>
                  <strong>New payment</strong>
                  <small>● Devnet</small>
                </div>
                <div className="merchant-preview-content">
                  <span>PAYMENT REQUEST</span>
                  <strong>
                    0.01 <small>SOL</small>
                  </strong>
                  <p>Show this code to your customer</p>
                  <div className="merchant-preview-qr" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="merchant-preview-pending">
                    <i /> Waiting for payment
                  </div>
                </div>
                <div className="merchant-preview-button">
                  Check Solana for payment <span>↗</span>
                </div>
              </div>
            </aside>
          </div>
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

  if (view === "wallet-setup" || !ready) {
    const walletUrl = import.meta.env.VITE_WALLET_URL || (import.meta.env.DEV ? "http://localhost:5173" : "https://wallet.rpay.space/")
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

  return (
    <div className="merchant-shell merchant-shell--dash">
      {view === "overview" && profile ? (
        <Overview
          profile={profile}
          requests={requests}
          balances={balances}
          networkHint={networkHint}
          range={range}
          usdtConfigured={Boolean(usdt)}
          onRangeChange={setRange}
          onCharge={() => {
            setError("")
            setView("charge")
          }}
          onOpenRequest={openRequest}
          onNavigate={(tab) => {
            refresh()
            setView(tab)
          }}
        />
      ) : null}

      {view === "transactions" ? (
        <Transactions
          requests={requests}
          onOpenRequest={openRequest}
          onNavigate={(tab) => {
            refresh()
            setView(tab)
          }}
        />
      ) : null}

      {view === "settings" && profile ? (
        <Settings
          profile={profile}
          chargeCount={requests.length}
          onChangeWallet={() => {
            setPayoutAddress(profile.payoutAddress ?? "")
            setView("wallet-setup")
          }}
          onClearHistory={() => {
            setRequests(clearRequests())
            setSelectedId(null)
          }}
          onLogOut={handleLogOut}
          onNavigate={(tab) => setView(tab)}
          onCharge={() => {
            setError("")
            setView("charge")
          }}
        />
      ) : null}

      {view === "charge" && profile?.payoutAddress ? (
        <Charge
          payoutAddress={profile.payoutAddress}
          asset={asset}
          amount={amount}
          memo={memo}
          usdt={usdt}
          error={error}
          onAsset={setAsset}
          onAmount={setAmount}
          onMemo={setMemo}
          onBack={() => {
            setError("")
            setView("overview")
          }}
          onSubmit={createCharge}
        />
      ) : null}

      {view === "request" && selected ? (
        <RequestDetail
          selected={selected}
          busy={busy}
          error={error}
          copied={copied}
          manualSignature={manualSignature}
          onManualSignature={setManualSignature}
          onBack={() => {
            setError("")
            setView("overview")
          }}
          onCheck={() => void checkPayment()}
          onVerifyManual={() => void verifyManual()}
          onCopy={() => {
            void navigator.clipboard.writeText(selected.payload).then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            })
          }}
          onCancel={() => {
            setRequests(cancelRequest(selected.id))
            setError("")
            setView("overview")
          }}
          onNewCharge={() => {
            setError("")
            setView("charge")
          }}
          onDone={() => {
            setError("")
            setView("overview")
          }}
        />
      ) : null}
    </div>
  )
}
