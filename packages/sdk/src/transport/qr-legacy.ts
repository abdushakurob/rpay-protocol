import { Transaction } from "@solana/web3.js"
import { fromBase64Url, toBase64Url } from "./encoding"

/**
 * Compact QR wire format used by the reference wallet.
 * Kept for backward compatibility alongside versioned JSON envelopes.
 *
 * Formats:
 * - rpay:bh:1:devnet:<blockhash>:<lastValidBlockHeight>
 * - rpay:tx:1:<base64url-serialized-tx>
 * - rpay:id:1:<alias>:<publicKey>
 */
const BLOCKHASH = "rpay:bh:1:devnet:"
const SIGNED = "rpay:tx:1:"
const IDENTITY = "rpay:id:1:"

export function encodeBlockhash(blockhash: string, lastValidBlockHeight: number) {
  return `${BLOCKHASH}${blockhash}:${lastValidBlockHeight}`
}

export function decodeBlockhash(payload: string) {
  if (!payload.startsWith(BLOCKHASH)) return null
  const rest = payload.slice(BLOCKHASH.length)
  const split = rest.lastIndexOf(":")
  if (split <= 0) return null
  const blockhash = rest.slice(0, split)
  const lastValidBlockHeight = Number(rest.slice(split + 1))
  if (!blockhash || !Number.isInteger(lastValidBlockHeight)) return null
  return { blockhash, lastValidBlockHeight }
}

export function encodeSignedTx(tx: Transaction) {
  return `${SIGNED}${toBase64Url(tx.serialize())}`
}

export function decodeSignedTx(payload: string) {
  if (!payload.startsWith(SIGNED)) return null
  try {
    return Transaction.from(fromBase64Url(payload.slice(SIGNED.length)))
  } catch {
    return null
  }
}

export function encodeIdentity(alias: string, publicKey: string) {
  return `${IDENTITY}${alias}:${publicKey}`
}

export function decodeIdentity(payload: string) {
  if (!payload.startsWith(IDENTITY)) return null
  const rest = payload.slice(IDENTITY.length)
  const split = rest.indexOf(":")
  if (split <= 0) return null
  const alias = rest.slice(0, split)
  const publicKey = rest.slice(split + 1)
  if (!alias || !publicKey) return null
  return { alias, publicKey }
}

export function isLegacyQrPayload(payload: string) {
  return payload.startsWith(BLOCKHASH) || payload.startsWith(SIGNED) || payload.startsWith(IDENTITY)
}
