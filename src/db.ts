function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("rpay", 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("vault")) db.createObjectStore("vault")
      if (!db.objectStoreNames.contains("directory")) db.createObjectStore("directory")
      if (!db.objectStoreNames.contains("activity")) db.createObjectStore("activity", { keyPath: "id" })
      if (!db.objectStoreNames.contains("balance-cache")) db.createObjectStore("balance-cache")
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function done<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function dbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase()
  const result = await done(db.transaction(store).objectStore(store).get(key))
  db.close()
  return result as T | undefined
}

export async function dbSet(store: string, key: IDBValidKey, value: unknown) {
  const db = await openDatabase()
  await done(db.transaction(store, "readwrite").objectStore(store).put(value, key))
  db.close()
}

export async function dbPut(store: string, value: unknown) {
  const db = await openDatabase()
  await done(db.transaction(store, "readwrite").objectStore(store).put(value))
  db.close()
}

export async function dbAll<T>(store: string): Promise<T[]> {
  const db = await openDatabase()
  const result = await done(db.transaction(store).objectStore(store).getAll())
  db.close()
  return result as T[]
}

export type CachedBalance = {
  lamports: number
  updatedAt: number
}

export function getCachedBalance(publicKey: string) {
  return dbGet<CachedBalance>("balance-cache", publicKey)
}

export function setCachedBalance(publicKey: string, balance: CachedBalance) {
  return dbSet("balance-cache", publicKey, balance)
}
