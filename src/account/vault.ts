import { dbGet, dbSet } from "../db"
import { decryptSecret, encryptSecret } from "./crypto"
import { keypairFromPhrase } from "./phrase"

export type VaultRecord = {
  alias: string
  publicKey: string
  ciphertext: string
  salt: string
  iv: string
  iterations: number
  published: boolean
}

const KEY = "account"

export function readVault() {
  return dbGet<VaultRecord>("vault", KEY)
}

export async function writeVault(alias: string, phrase: string, password: string) {
  const keypair = keypairFromPhrase(phrase)
  const cipher = await encryptSecret(password, phrase.trim().toLowerCase())
  const record: VaultRecord = {
    alias,
    publicKey: keypair.publicKey.toBase58(),
    published: false,
    ...cipher,
  }
  await dbSet("vault", KEY, record)
  return { record, secretKey: keypair.secretKey }
}

export async function openVault(password: string) {
  const record = await readVault()
  if (!record) throw new Error("missing")
  let phrase = ""
  try {
    phrase = await decryptSecret(password, record)
    const keypair = keypairFromPhrase(phrase)
    if (keypair.publicKey.toBase58() !== record.publicKey) throw new Error("mismatch")
    return { record, secretKey: keypair.secretKey }
  } catch (error) {
    if (error instanceof Error && error.message === "mismatch") throw error
    throw new Error("password")
  } finally {
    phrase = ""
  }
}

export async function markPublished() {
  const record = await readVault()
  if (!record) return
  record.published = true
  await dbSet("vault", KEY, record)
}

export async function resetVaultPassword(phrase: string, newPassword: string) {
  const record = await readVault()
  if (!record) throw new Error("missing")
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ")
  const keypair = keypairFromPhrase(normalized)
  if (keypair.publicKey.toBase58() !== record.publicKey) throw new Error("phrase")
  const cipher = await encryptSecret(newPassword, normalized)
  const next: VaultRecord = { ...record, ...cipher }
  await dbSet("vault", KEY, next)
  keypair.secretKey.fill(0)
  return next
}
