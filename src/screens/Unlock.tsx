import { useState } from "react"
import { useSession } from "../account/session"
import { resetVaultPassword } from "../account/vault"
import { phraseIsValid } from "../account/phrase"

export function Unlock() {
  const session = useSession()
  const [mode, setMode] = useState<"password" | "words">("password")
  const [password, setPassword] = useState("")
  const [phrase, setPhrase] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const alias = session.status === "locked" ? session.alias : ""

  if (mode === "password") {
    return (
      <form
        className="auth-form stack"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError("")
          try {
            await session.unlock(password)
          } catch {
            setError("That password doesn't open this wallet.")
          } finally {
            setBusy(false)
          }
        }}
      >
        <h1>Welcome back</h1>
        <p className="auth-alias">{alias}</p>
        <label className="field">
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="pill accent wide" type="submit" disabled={busy}>{busy ? "Opening…" : "Unlock"}</button>
        <button className="pill ghost wide" type="button" onClick={() => { setMode("words"); setError(""); setPassword("") }}>
          Use your 12 words instead
        </button>
      </form>
    )
  }

  return (
    <form
      className="auth-form stack"
      onSubmit={async (event) => {
        event.preventDefault()
        setError("")
        if (!phraseIsValid(phrase)) {
          setError("Enter all 12 words, separated by spaces.")
          return
        }
        if (newPassword.length < 8) {
          setError("Use at least 8 characters for the new password.")
          return
        }
        if (newPassword !== confirm) {
          setError("Those passwords don't match.")
          return
        }
        setBusy(true)
        try {
          await resetVaultPassword(phrase, newPassword)
          await session.unlock(newPassword)
        } catch (err) {
          setError(err instanceof Error && err.message === "phrase"
            ? "Those words don't match this wallet."
            : "Couldn't open this wallet. Check the words and try again.")
        } finally {
          setBusy(false)
        }
      }}
    >
      <h1>Your 12 words</h1>
      <p className="muted">Paste or type them in order. You can set a new password.</p>
      <p className="auth-alias">{alias}</p>
      <label className="field">
        Recovery phrase
        <textarea
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          rows={4}
          autoCapitalize="off"
          spellCheck={false}
          required
        />
      </label>
      <label className="field">
        New password
        <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
      </label>
      <label className="field">
        Confirm password
        <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="pill accent wide" type="submit" disabled={busy}>{busy ? "Opening…" : "Unlock"}</button>
      <button className="pill ghost wide" type="button" onClick={() => { setMode("password"); setError(""); setPhrase(""); setNewPassword(""); setConfirm("") }}>
        Back to password
      </button>
    </form>
  )
}
