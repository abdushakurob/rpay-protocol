const ACCOUNT_KEY = "rpay.merchant.account"
const SESSION_KEY = "rpay.merchant.session"

export type MerchantAccount = {
  shopName: string
  /** Hex PBKDF2 hash of password */
  passwordHash: string
  salt: string
  iterations: number
  createdAt: number
}

export type MerchantProfile = {
  shopName: string
  /** Solana address payments settle to — set after signup */
  payoutAddress: string | null
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function hashPassword(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    256,
  )
  return bytesToHex(new Uint8Array(bits))
}

export function loadAccount(): MerchantAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MerchantAccount
  } catch {
    return null
  }
}

export function hasAccount() {
  return Boolean(loadAccount())
}

export function loadProfile(): MerchantProfile | null {
  const account = loadAccount()
  if (!account) return null
  try {
    const payout = localStorage.getItem("rpay.merchant.payout")
    return {
      shopName: account.shopName,
      payoutAddress: payout && payout.length > 0 ? payout : null,
    }
  } catch {
    return { shopName: account.shopName, payoutAddress: null }
  }
}

export function savePayoutAddress(address: string) {
  localStorage.setItem("rpay.merchant.payout", address)
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function isLoggedIn() {
  const account = loadAccount()
  if (!account) return false
  try {
    const session = sessionStorage.getItem(SESSION_KEY)
    if (!session) return false
    const parsed = JSON.parse(session) as { shopName?: string }
    return parsed.shopName === account.shopName
  } catch {
    return false
  }
}

function openSession(shopName: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ shopName, at: Date.now() }))
}

export async function signUp(shopName: string, password: string) {
  const name = shopName.trim()
  if (name.length < 2) throw new Error("shop-name")
  if (password.length < 6) throw new Error("password-short")
  if (loadAccount()) throw new Error("exists")

  const iterations = 120_000
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const passwordHash = await hashPassword(password, salt, iterations)
  const account: MerchantAccount = {
    shopName: name,
    passwordHash,
    salt: bytesToHex(salt),
    iterations,
    createdAt: Date.now(),
  }
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account))
  openSession(name)
  return loadProfile()!
}

export async function logIn(shopName: string, password: string) {
  const account = loadAccount()
  if (!account) throw new Error("missing")
  if (account.shopName.toLowerCase() !== shopName.trim().toLowerCase()) throw new Error("shop")
  const salt = new Uint8Array(account.salt.match(/.{1,2}/g)!.map((h) => Number.parseInt(h, 16)))
  const passwordHash = await hashPassword(password, salt, account.iterations)
  if (passwordHash !== account.passwordHash) throw new Error("password")
  openSession(account.shopName)
  return loadProfile()!
}

export function logOut() {
  clearSession()
}
