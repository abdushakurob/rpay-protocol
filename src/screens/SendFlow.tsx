import { useCallback, useEffect, useState } from "react"
import { useSession } from "../account/session"
import { findName, refreshNames, saveName, type NameEntry } from "../directory/directory"
import { canonicalAddress, formatSol, isAlias, shortAddress, solToLamports } from "../format"
import { decodeBlockhash, decodeIdentity } from "../protocol/codes"
import { canReachNetwork } from "../lib/online"
import { readBalance, receiptUrl, savePayment, sendOnline, signTransfer } from "../solana/chain"
import { IconBack } from "../ui/Icons"
import { Keypad } from "../ui/Keypad"
import { QrImage } from "../ui/QrImage"
import { Scanner } from "../ui/Scanner"

type Payee = { alias: string; publicKey: string }
type Step = "amount" | "who" | "scanRecipient" | "review" | "scan" | "show" | "done"

export function SendFlow({ onClose }: { onClose: () => void }) {
  const session = useSession()
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
  const [online, setOnline] = useState<boolean | null>(null)
  const lamports = solToLamports(amount)
  const me = session.status === "unlocked" ? session.publicKey : ""
  const myName = session.status === "unlocked" ? session.alias : ""

  useEffect(() => {
    void refreshNames().then(setSaved)
    if (me) void readBalance(me).then(setBalance).catch(() => undefined)
  }, [me])

  useEffect(() => {
    if (step !== "review") return
    void canReachNetwork().then(setOnline)
  }, [step])

  const choose = useCallback(async (value: string) => {
    setError("")
    const text = value.trim()
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
  }, [me, myName, saved])

  async function submit() {
    if (!payee || !lamports || session.status !== "unlocked") return
    setError("")
    setBusy(true)
    try {
      const current = balance ?? await readBalance(session.publicKey)
      const result = await sendOnline({
        keypair: session.getKeypair(),
        to: payee.publicKey,
        lamports,
        balance: current,
      })
      setSignature(result)
      await savePayment({
        id: result,
        signature: result,
        direction: "out",
        name: payee.alias || shortAddress(payee.publicKey),
        counterparty: payee.publicKey,
        lamports,
        status: "delivered",
        at: Date.now(),
      })
      setStep("done")
    } catch (error) {
      if (error instanceof Error && error.message === "funds") {
        setError("You don't have enough SOL.")
        return
      }
      const reachable = await canReachNetwork()
      if (!reachable) {
        setStep("scan")
        return
      }
      setError("Couldn't send that.")
    } finally {
      setBusy(false)
    }
  }

  function signFromCode(value: string) {
    if (!payee || !lamports || session.status !== "unlocked") return
    const fresh = decodeBlockhash(value.trim())
    if (!fresh) {
      setError("That isn't a code we can use.")
      return
    }
    const signed = signTransfer({
      keypair: session.getKeypair(),
      to: payee.publicKey,
      lamports,
      blockhash: fresh.blockhash,
    })
    setCode(signed.code)
    setSignature(signed.signature)
    void savePayment({
      id: signed.signature,
      signature: signed.signature,
      direction: "out",
      name: payee.alias || shortAddress(payee.publicKey),
      counterparty: payee.publicKey,
      lamports,
      status: "waiting",
      at: Date.now(),
    })
    setStep("show")
  }

  const label = payee?.alias || (payee ? shortAddress(payee.publicKey) : "")

  return (
    <main className="wallet-shell wallet-shell--solo">
      <div className="wallet-main wallet-main--flow">
      <section className="wallet-page wallet-page--flow">
        <div className="topbar">
          <button className="back" type="button" aria-label="Back" onClick={() => {
            if (step === "amount") onClose()
            else if (step === "who") setStep("amount")
            else if (step === "scanRecipient") setStep("who")
            else if (step === "review") setStep("who")
            else onClose()
          }}><IconBack /></button>
          <h1>Send</h1>
          <span />
        </div>
        {step === "amount" ? (
          <>
            <div className="sheet">
              <p className="amount" aria-live="polite">{amount || "0"}</p>
              <p className="hint">SOL on devnet</p>
              <p className="hint">Balance {balance === null ? "—" : `${formatSol(balance)} SOL`}</p>
              <Keypad value={amount} onChange={setAmount} />
              <button className="primary send-continue" type="button" disabled={!lamports} onClick={() => setStep("who")}>Continue</button>
            </div>
          </>
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
            <h2>Send {formatSol(lamports ?? 0)} SOL to {label}?</h2>
            <p className="hint">A small fee comes from your balance.</p>
            <p className="quiet">Devnet</p>
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
            <h2>Someone nearby needs internet. Scan the code on their phone.</h2>
            {error ? <p className="error">{error}</p> : null}
            <Scanner onCode={signFromCode} />
          </div>
        ) : null}
        {step === "show" ? (
          <div className="sheet center">
            <h2>Show this code to the person with internet.</h2>
            <QrImage text={code} />
            <p className="hint">Waiting for them</p>
            <button className="primary" type="button" onClick={onClose}>Done</button>
          </div>
        ) : null}
        {step === "done" ? (
          <div className="sheet stack">
            <h2>Delivered</h2>
            <p className="hint">{formatSol(lamports ?? 0)} SOL to {label}</p>
            <a className="primary" href={receiptUrl(signature)} target="_blank" rel="noreferrer">View receipt</a>
            <button className="ghost" type="button" onClick={onClose}>Done</button>
          </div>
        ) : null}
      </section>
      </div>
    </main>
  )
}
