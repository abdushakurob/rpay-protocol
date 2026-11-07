import { dbAll, dbGet, dbSet } from "../db"
import { isAlias } from "../format"

export type NameEntry = {
  alias: string
  publicKey: string
}

export async function saveName(entry: NameEntry) {
  await dbSet("directory", entry.alias, entry)
}

export async function names() {
  return dbAll<NameEntry>("directory")
}

export async function nameFor(alias: string) {
  return dbGet<NameEntry>("directory", alias)
}

export async function nameForAddress(publicKey: string) {
  const all = await names()
  return all.find((entry) => entry.publicKey === publicKey)
}

export async function publishName(entry: NameEntry) {
  if (!isAlias(entry.alias)) return { published: false as const }
  await saveName(entry)
  if (!navigator.onLine) return { published: false as const }
  try {
    const response = await fetch("/api/directory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alias: entry.alias, publicKey: entry.publicKey }),
    })
    if (response.status === 409) return { published: false as const, taken: true as const }
    if (!response.ok) return { published: false as const }
    return { published: true as const }
  } catch {
    return { published: false as const }
  }
}

export async function findName(alias: string) {
  const local = await nameFor(alias)
  if (local) return local
  if (!navigator.onLine) return undefined
  try {
    const response = await fetch(`/api/directory?alias=${encodeURIComponent(alias)}`)
    if (!response.ok) return undefined
    const entry = (await response.json()) as NameEntry
    if (!entry?.alias || !entry.publicKey) return undefined
    await saveName(entry)
    return entry
  } catch {
    return undefined
  }
}

export async function refreshNames() {
  if (!navigator.onLine) return names()
  try {
    const response = await fetch("/api/directory")
    if (!response.ok) return names()
    const book = (await response.json()) as Record<string, NameEntry>
    await Promise.all(Object.values(book).map((entry) => saveName(entry)))
  } catch {
    // The names already on this phone stay usable.
  }
  return names()
}
