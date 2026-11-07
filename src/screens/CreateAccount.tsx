import { useMemo, useState, type FormEvent } from "react"
import { findName, publishName } from "../directory/directory"
import { isAlias } from "../format"
import { createPhrase, phraseIsValid } from "../account/phrase"
import { useSession } from "../account/session"
import { writeVault } from "../account/vault"

export function CreateAccount() {
  const session = useSession()
  const [step, setStep] = useState<"form" | "words">("form")
  const [alias, setAlias] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [phrase, setPhrase] = useState("")
  const [checks, setChecks] = useState<number[]>([])
  const [answers, setAnswers] = useState(["", ""])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const words = phrase.split(" ")

  const quiz = useMemo(() => checks, [checks])

  async function start(event: FormEvent) {
    event.preventDefault()
    setError("")
    const name = alias.trim().toLowerCase()
    if (!isAlias(name)) {
      setError("Use 3 to 20 letters or numbers.")
      return
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Those passwords don't match.")
      return
    }
    if (navigator.onLine) {
      const existing = await findName(name)
      if (existing && existing.alias === name) {
        setError("That name is already used.")
        return
      }
    }
    const next = createPhrase()
    const indexes = new Set<number>()
    while (indexes.size < 2) indexes.add(Math.floor(Math.random() * 12))
    setPhrase(next)
    setChecks([...indexes])
    setAnswers(["", ""])
    setStep("words")
  }

  async function finish(event: FormEvent) {
    event.preventDefault()
    if (!phraseIsValid(phrase)) return
    const ok = quiz.every((index, position) => answers[position].trim().toLowerCase() === words[index])
    if (!ok) {
      setError("Those words don't match. Check the list and try again.")
      return
    }
    setBusy(true)
    try {
      const { record, secretKey } = await writeVault(alias.trim().toLowerCase(), phrase, password)
      secretKey.fill(0)
      const published = await publishName({ alias: record.alias, publicKey: record.publicKey })
      if ("taken" in published && published.taken) {
        setError("That name is already used.")
      }
      await session.unlock(password)
    } catch {
      setError("Couldn't save this account. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (step === "words") {
    return (
      <form className="auth-form stack" onSubmit={finish}>
        <h1>Save these 12 words</h1>
        <p className="muted">Write them down. RPay can't show them again.</p>
        <ol className="words">
          {words.map((word, index) => (
            <li key={`${word}-${index}`}><span>{index + 1}</span>{word}</li>
          ))}
        </ol>
        {quiz.map((index, position) => (
          <label className="field" key={index}>
            Word {index + 1}
            <input value={answers[position]} onChange={(event) => {
              const next = [...answers]
              next[position] = event.target.value
              setAnswers(next)
            }} autoCapitalize="off" spellCheck={false} />
          </label>
        ))}
        {error ? <p className="error">{error}</p> : null}
        <button className="pill accent wide" type="submit" disabled={busy}>I've saved them</button>
      </form>
    )
  }

  return (
    <form className="auth-form stack" onSubmit={start}>
      <h1>Create your account</h1>
      <p className="muted">Your name is how other people pay you on RPay.</p>
      <label className="field">
        Your name
        <input value={alias} onChange={(event) => setAlias(event.target.value.toLowerCase())} autoCapitalize="off" spellCheck={false} required />
      </label>
      <label className="field">
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      <label className="field">
        Confirm password
        <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="pill accent wide" type="submit">Continue</button>
    </form>
  )
}
