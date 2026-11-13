export function toBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64")
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function fromBase64(value: string) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"))
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function toBase64Url(bytes: Uint8Array) {
  return toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "")
}

export function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4)
  return fromBase64(padded)
}

export function createExchangeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
