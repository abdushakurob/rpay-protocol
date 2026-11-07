import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Keypair } from "@solana/web3.js"
import { markPublished, openVault, readVault } from "./vault"

type Locked = { status: "loading" | "none" }
type Known = { status: "locked" | "unlocked"; alias: string; publicKey: string; published: boolean }
type SessionState = Locked | Known

type SessionValue = SessionState & {
  unlock: (password: string) => Promise<void>
  lock: () => void
  getKeypair: () => Keypair
  notePublished: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" })
  const secretRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    readVault()
      .then((record) => {
        if (!record) setState({ status: "none" })
        else setState({ status: "locked", alias: record.alias, publicKey: record.publicKey, published: record.published })
      })
      .catch(() => setState({ status: "none" }))
  }, [])

  const unlock = useCallback(async (password: string) => {
    const opened = await openVault(password)
    secretRef.current = opened.secretKey
    setState({
      status: "unlocked",
      alias: opened.record.alias,
      publicKey: opened.record.publicKey,
      published: opened.record.published,
    })
  }, [])

  const lock = useCallback(() => {
    secretRef.current?.fill(0)
    secretRef.current = null
    setState((current) => (current.status === "unlocked" ? { ...current, status: "locked" } : current))
  }, [])

  const getKeypair = useCallback(() => {
    if (!secretRef.current) throw new Error("locked")
    return Keypair.fromSecretKey(secretRef.current)
  }, [])

  const notePublished = useCallback(async () => {
    await markPublished()
    setState((current) => (current.status === "locked" || current.status === "unlocked" ? { ...current, published: true } : current))
  }, [])

  const value = useMemo<SessionValue>(
    () => ({ ...state, unlock, lock, getKeypair, notePublished }),
    [state, unlock, lock, getKeypair, notePublished],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error("session")
  return value
}
