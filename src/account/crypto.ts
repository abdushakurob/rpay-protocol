const DEFAULT_ITERATIONS = 210_000

export type Cipher = {
  ciphertext: string
  salt: string
  iv: string
  iterations: number
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

export async function encryptSecret(password: string, secret: string, iterations = DEFAULT_ITERATIONS): Promise<Cipher> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, iterations)
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(secret))
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    iterations,
  }
}

export async function decryptSecret(password: string, cipher: Cipher) {
  const key = await deriveKey(password, base64ToBytes(cipher.salt), cipher.iterations)
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(cipher.iv) as BufferSource },
    key,
    base64ToBytes(cipher.ciphertext) as BufferSource,
  )
  return new TextDecoder().decode(plain)
}
