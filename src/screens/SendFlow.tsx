import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getExpirySnapshot,
  parseMessage,
  parseTokenAmount,
  type NetworkContextMessage,
} from "@rpay/protocol"
import { useSession } from "../account/session"
import { findName, refreshNames, saveName, type NameEntry } from "../directory/directory"
import { canonicalAddress, formatSol, isAlias, shortAddress, solToLamports } from "../format"
import { decodeBlockhash, decodeIdentity } from "../protocol/codes"
import { canReachNetwork } from "../lib/online"
import { configuredUsdt, usdtEnabled, type PayAsset } from "../solana/assets"
import {
  readBalance,
  readUsdtBalance,
  receiptUrl,
  savePayment,
  sendOnline,
  sendUsdtOnline,
  signTransfer,
  signUsdtTransfer,
} from "../solana/chain"
import { ExpiryCountdown } from "../ui/ExpiryCountdown"
import { IconBack } from "../ui/Icons"
import { Keypad } from "../ui/Keypad"
import { QrImage } from "../ui/QrImage"
import { Scanner } from "../ui/Scanner"

type Payee = { alias: string; publicKey: string }
type Step = "amount" | "who" | "scanRecipient" | "scanMerchant" | "review" | "scan" | "show" | "done"

type RelayStamp = {
  blockhash: string
  lastValidBlockHeight: number
  expiresAt: number
  fetchedAt: number
}

function parseRelayStamp(raw: string): RelayStamp | null {
  const text = raw.trim()
  if (text.startsWith("{")) {
    try {
      const message = parseMessage(text)
      if (message.type !== "network_context") return null
      const context = message as NetworkContextMessage
      return {
        blockhash: context.recentBlockhash,
        lastValidBlockHeight: context.lastValidBlockHeight,
        expiresAt: context.expiresAt,
        fetchedAt: context.fetchedAt,
      }
    } catch {
      return null
    }
  }
  const legacy = decodeBlockhash(text)
  if (!legacy) return null
  const fetchedAt = Date.now()
  return {
    blockhash: legacy.blockhash,
    lastValidBlockHeight: legacy.lastValidBlockHeight,
    // Legacy codes have no wall-clock stamp — treat as already needing a refresh.
    expiresAt: fetchedAt,
    fetchedAt,
  }
}

export function SendFlow({ onClose }: { onClose: () => void }) {
  const session = useSession()
  const usdt = useMemo(() => configuredUsdt(), [])
  const [asset, setAsset] = useState<PayAsset>("sol")
  const [step, setStep] = useState<Step>("amount")
  const [amount, setAmount] = useState("")
  const [typed, setTyped] = useState("")
  const [payee, setPayee] = useState<Payee | null>(null)
  const [saved, setSaved] = useState<NameEntry[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState("")
  const [signature, setSignature] = useState("")
  const [balance, setBalance] = useState<number | null>(null)
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)
  const [online, setOnline] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const [relayStamp, setRelayStamp] = useState<RelayStamp | null>(null)

  const lamports = asset === "sol" ? solToLamports(amount) : null
  const tokenAmount = asset === "usdt" && usdt ? parseTokenAmount(amount, usdt.decimals) : null
  const rawAmount = asset === "sol" ? lamports : tokenAmount
  const assetLabel = asset === "sol" ? "SOL" : usdt?.symbol ?? "USDT"
  const me = session.status === "unlocked" ? session.publicKey : ""
  const myName = session.status === "unlocked" ? session.alias : ""

  useEffect(() => {
    void refreshNames().then(setSaved)
    if (!me) return
    void readBalance(me).then(setBalance).catch(() => undefined)
    if (usdtEnabled()) {
      void readUsdtBalance(me).then((value) => setTokenBalance(value?.amount ?? 0)).catch(() => setTokenBalance(0))
    }
  }, [me])

  useEffect(() => {
    if (step !== "review") return
    void canReachNetwork().then(setOnline)
  }, [step])

  const applyMerchantRequest = useCallback((text: string) => {
    try {
      const message = parseMessage(text)
      if (message.type !== "payment_request") return false
      if (message.expiresAt && message.expiresAt < Date.now()) {
        setError("This merchant request has expired.")
        return true
      }
      if (!canonicalAddress(message.recipient)) {
        setError("Merchant request has an invalid recipient.")
        return true
      }
      if (message.recipient === me) {
        setError("That's you.")
        return true
      }

      if (message.asset.kind === "native_sol") {
        setAsset("sol")
        setAmount(String(message.amount / 1_000_000_000))
      } else if (message.asset.kind === "spl_token") {
        if (!usdt?.mint || message.asset.mint !== usdt.mint) {
          setError("This merchant request uses an unsupported token mint.")
          return true
        }
        setAsset("usdt")
        setAmount(String(message.amount / 10 ** message.asset.decimals))
      } else {
        setError("This merchant request uses an unsupported asset.")
        return true
      }

      setPayee({ alias: "", publicKey: message.recipient })
      setStep("review")
      return true
    } catch {
      return false
    }
  }, [me, usdt])

  const choose = useCallback(async (value: string) => {
    setError("")
    const text = value.trim()
    if (applyMerchantRequest(text)) return

    const identity = decodeIdentity(text)
    if (identity && isAlias(identity.alias) && canonicalAddress(identity.publicKey)) {
      const next = { alias: identity.alias, publicKey: identity.publicKey }
      await saveName(next)
      if (next.publicKey === me) {
        setError("That's you.")
        return
      }
      setPayee(next)
      setStep("review")
      return
    }
    const address = canonicalAddress(text)
    if (address) {
      if (address === me) {
        setError("That's you.")
        return
      }
      const known = saved.find((entry) => entry.publicKey === address)
      setPayee({ alias: known?.alias ?? "", publicKey: address })
      setStep("review")
      return
    }
    const alias = text.toLowerCase()
    if (!isAlias(alias)) {
      setError("Enter a username or wallet address.")
      return
    }
    if (alias === myName) {
      setError("That's you.")
      return
    }
    const found = await findName(alias)
    if (!found) {
      setError(navigator.onLine ? "No RPay account uses that name." : "That name isn't saved on this phone.")
      return
    }
    setPayee(found)
    setStep("review")
  }, [applyMerchantRequest, me, myName, saved])

  async function submit() {
    if (!payee || !rawAmount || session.status !== "unlocked") return
    setError("")
    setBusy(true)
    try {
      const solBal = balance ?? await readBalance(session.publicKey)
      let result: string
      if (asset === "sol") {
        result = await sendOnline({
          keypair: session.getKeypair(),
          to: payee.publicKey,
          lamports: rawAmount,
          balance: solBal,
        })
      } else {
        const tokenBal = tokenBalance ?? (await readUsdtBalance(session.publicKey))?.amount ?? 0
        result = await sendUsdtOnline({
          keypair: session.getKeypair(),
          to: payee.publicKey,
          amount: rawAmount,
          tokenBalance: tokenBal,
          solBalance: solBal,
        })
      }
      setSignature(result)
      await savePayment({
        id: result,
        signature: result,
        direction: "out",
        name: payee.alias || shortAddress(payee.publicKey),
        counterparty: payee.publicKey,
        asset:
          asset === "sol"
            ? { kind: "sol", lamports: rawAmount }
            : {
                kind: "spl",
                amount: rawAmount,
                decimals: usdt!.decimals,
                symbol: usdt!.symbol,
                mint: usdt!.mint!,
              },
        status: "delivered",
        at: Date.now(),
      })
      setStep("done")
    } catch (error) {
      if (error instanceof Error && error.message === "funds") {
        setError(asset === "sol" ? "You don't have enough SOL." : `You don't have enough ${assetLabel}.`)
        return
      }
      if (error instanceof Error && error.message === "fee") {
        setError("You need a little SOL for fees.")
        return
      }
      if (error instanceof Error && error.message === "usdt-config") {
        setError("USDT mint is not configured on this build.")
        return
      }
      if (error instanceof Error && (error.message === "expired" || error.message.includes("expired"))) {
        setError("That connection stamp expired. Ask them for a fresh code, then try again.")
        return
      }
      const reachable = await canReachNetwork()
      if (!reachable) {
        setRelayStamp(null)
        setStep("scan")
        return
      }
      setError("Couldn't send that.")
    } finally {
      setBusy(false)
    }
  }

  async function signFromCode(value: string) {
    if (!payee || !rawAmount || session.status !== "unlocked" || busy) return
    setError("")
    const stamp = parseRelayStamp(value)
    if (!stamp) {
      setError("That isn't a connection code we can use.")
      return
    }
    setRelayStamp(stamp)
    if (getExpirySnapshot({ expiresAt: stamp.expiresAt, fetchedAt: stamp.fetchedAt }).expired) {
      setError("This connection stamp expired. Ask them to refresh, then scan again.")
      return
    }
    setBusy(true)
    try {
      const signed =
        asset === "sol"
          ? signTransfer({
              keypair: session.getKeypair(),
              to: payee.publicKey,
              lamports: rawAmount,
              blockhash: stamp.blockhash,
            })
          : await signUsdtTransfer({
              keypair: session.getKeypair(),
              to: payee.publicKey,
              amount: rawAmount,
              blockhash: stamp.blockhash,
            })
      setCode(signed.code)
      setSignature(signed.signature)
      void savePayment({
        id: signed.signature,
        signature: signed.signature,
        direction: "out",
        name: payee.alias || shortAddress(payee.publicKey),
        counterparty: payee.publicKey,
        asset:
          asset === "sol"
            ? { kind: "sol", lamports: rawAmount }
            : {
                kind: "spl",
                amount: rawAmount,
                decimals: usdt!.decimals,
                symbol: usdt!.symbol,
                mint: usdt!.mint!,
              },
        status: "waiting",
        at: Date.now(),
      })
      setStep("show")
    } catch {
      setError("Couldn't authorize that payment. Get a fresh connection code and try again.")
    } finally {
      setBusy(false)
    }
  }

  const label = payee?.alias || (payee ? shortAddress(payee.publicKey) : "")
  const amountText =
    asset === "sol"
      ? `${formatSol(lamports ?? 0)} SOL`
      : `${amount || "0"} ${assetLabel}`

  return (
    <div className="wallet-shell wallet-shell--solo">
      <div className="wallet-main wallet-main--flow">
      <section className="wallet-page wallet-page--flow">
        <div className="topbar">
          <button className="back" type="button" aria-label="Back" onClick={() => {
            if (step === "amount") onClose()
            else if (step === "who") setStep("amount")
            else if (step === "scanRecipient") setStep("who")
            else if (step === "scanMerchant") setStep("amount")
            else if (step === "review") setStep("who")
            else onClose()
          }}><IconBack /></button>
          <h1>Send</h1>
          <span />
        </div>
        {step === "amount" ? (
          <>
            <div className="sheet send-amount">
              {usdtEnabled() ? (
                <div className="asset-toggle" role="group" aria-label="Asset">
                  <button type="button" className={asset === "sol" ? "active" : ""} onClick={() => setAsset("sol")}>SOL</button>
                  <button type="button" className={asset === "usdt" ? "active" : ""} onClick={() => setAsset("usdt")}>
                    {usdt?.labeledTestToken ? "USDT-DEV" : "USDT"}
                  </button>
                </div>
              ) : null}
              <p className="amount" aria-live="polite">{amount || "0"}</p>
              <p className="hint">{assetLabel} on Devnet{usdt?.labeledTestToken && asset === "usdt" ? " · test token" : ""}</p>
              <p className="hint">
                Balance{" "}
                {asset === "sol"
                  ? balance === null ? "—" : `${formatSol(balance)} SOL`
                  : tokenBalance === null
                    ? "—"
                    : `${tokenBalance / 10 ** (usdt?.decimals ?? 6)} ${assetLabel}`}
              </p>
              <Keypad value={amount} onChange={setAmount} />
              <button className="primary send-continue" type="button" disabled={!rawAmount} onClick={() => setStep("who")}>Continue</button>
              <button className="scan-trigger" type="button" onClick={() => setStep("scanMerchant")}>Scan merchant request <span>↗</span></button>
            </div>
          </>
        ) : null}
        {step === "scanMerchant" ? (
          <div className="sheet stack camera-screen">
            <p className="flow-kicker">Merchant request</p>
            <h2>Scan the RPay Merchant QR.</h2>
            <p className="hint">This fills in the asset, amount, and recipient from the protocol payment request.</p>
            {error ? <p className="error" role="alert">{error}</p> : null}
            <Scanner onCode={(value) => void choose(value)} />
            <button className="ghost" type="button" onClick={() => setStep("amount")}>Enter amount instead</button>
          </div>
        ) : null}
        {step === "who" ? (
          <form className="sheet stack send-who" onSubmit={(event) => { event.preventDefault(); void choose(typed) }}>
            <p className="flow-kicker">Step 2 of 3 · Recipient</p>
            <h2>Where should this go?</h2>
            <p className="muted">Enter an RPay username or wallet address. Scan only when you have a code in front of you.</p>
            <label className="field">
              Username or address
              <input value={typed} onChange={(event) => setTyped(event.target.value.replace(/^@/, ""))} autoCapitalize="off" spellCheck={false} placeholder="e.g. @mina" />
            </label>
            {saved.filter((entry) => entry.publicKey !== me).map((entry) => (
              <button className="choice" type="button" key={entry.alias} onClick={() => void choose(entry.alias)}>
              <strong>@{entry.alias}</strong>
                <span className="hint">{shortAddress(entry.publicKey)}</span>
              </button>
            ))}
            {error ? <p className="error">{error}</p> : null}
            <button className="primary" type="submit">Continue</button>
            <button className="scan-trigger" type="button" onClick={() => setStep("scanRecipient")}>Scan a recipient code <span>↗</span></button>
          </form>
        ) : null}
        {step === "scanRecipient" ? (
          <div className="sheet stack camera-screen">
            <p className="flow-kicker">Step 2 of 3 · Scan recipient</p>
            <h2>Point your camera at their RPay code.</h2>
            <p className="hint">The camera only opens for this step. Nothing is sent when you scan.</p>
            {error ? <p className="error" role="alert">{error}</p> : null}
            <Scanner onCode={(value) => void choose(value)} />
            <button className="ghost" type="button" onClick={() => setStep("who")}>Enter details instead</button>
          </div>
        ) : null}
        {step === "review" && payee ? (
          <div className="sheet stack">
            <p className="flow-kicker">Step 3 of 3 · Review</p>
            <h2>Send {amountText} to {label}?</h2>
            <p className="hint">Network fees are paid in SOL from your balance.</p>
            {asset === "usdt" && usdt?.labeledTestToken ? (
              <p className="quiet">Devnet test token — not official Tether USDT.</p>
            ) : (
              <p className="quiet">Devnet</p>
            )}
            <p className="status-pill" data-online={online === null ? "" : online ? "yes" : "no"}>
              {online === null ? "Checking connection…" : online ? "You have internet — this sends now." : "No internet — you'll scan someone nearby next."}
            </p>
            {error ? <p className="error">{error}</p> : null}
            <button className="primary" type="button" disabled={busy} onClick={() => void submit()}>{busy ? "Sending…" : "Send"}</button>
          </div>
        ) : null}
        {step === "scan" ? (
          <div className="sheet stack">
            <p className="flow-kicker">Offline relay</p>
            <h2>Finish the payment on this phone, then scan their connection code.</h2>
            <p className="hint">
              Their code includes the exact expiry time. If it expires, ask them to refresh before you scan again.
            </p>
            {relayStamp ? (
              <ExpiryCountdown
                expiresAt={relayStamp.expiresAt}
                fetchedAt={relayStamp.fetchedAt}
                onExpired={() =>
                  setError("This connection stamp expired. Ask them to refresh, then scan again.")
                }
              />
            ) : null}
            {error ? <p className="error">{error}</p> : null}
            <Scanner onCode={(value) => void signFromCode(value)} />
          </div>
        ) : null}
        {step === "show" ? (
          <div className="sheet center">
            <h2>Show this code to the person with internet.</h2>
            <QrImage text={code} />
            <p className="hint">They can scan this code, or paste the copied code in Relay mode.</p>
            <button className="copy-code" type="button" onClick={() => { void navigator.clipboard.writeText(code).then(() => setCopied(true)) }}>{copied ? "Code copied" : "Copy signed payment code"}</button>
            <button className="primary" type="button" onClick={onClose}>Done</button>
          </div>
        ) : null}
        {step === "done" ? (
          <div className="sheet stack">
            <h2>Delivered</h2>
            <p className="hint">{amountText} to {label}</p>
            <a className="primary" href={receiptUrl(signature)} target="_blank" rel="noreferrer">View receipt</a>
            <button className="ghost" type="button" onClick={onClose}>Done</button>
          </div>
        ) : null}
      </section>
      </div>
    </div>
  )
}
