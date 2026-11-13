/**
 * Devnet USDT-DEV faucet: mint from the configured mint-authority wallet.
 *
 * Env (server only — never VITE_ for the phrase):
 *   FAUCET_PHRASE  — 12 words for the mint authority (your funded RPay wallet)
 *   USDT_MINT or VITE_USDT_MINT — mint address
 *   RPC_URL — optional
 *   FAUCET_AMOUNT — UI amount to mint (default 100)
 */
import { mnemonicToSeedSync } from "@scure/bip39"
import { hmac } from "@noble/hashes/hmac"
import { sha512 } from "@noble/hashes/sha2"
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from "@solana/web3.js"
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token"

const HARDENED = 0x80000000
const DECIMALS = 6
const COOLDOWN_MS = 30 * 60 * 1000
const recent = new Map()

function slip10(seed) {
  let node = hmac(sha512, new TextEncoder().encode("ed25519 seed"), seed)
  let key = node.slice(0, 32)
  let chain = node.slice(32)
  for (const index of [44, 501, 0, 0]) {
    const data = new Uint8Array(37)
    data[0] = 0
    data.set(key, 1)
    new DataView(data.buffer).setUint32(33, HARDENED + index, false)
    node = hmac(sha512, chain, data)
    key = node.slice(0, 32)
    chain = node.slice(32)
  }
  return key
}

function keypairFromPhrase(phrase) {
  const seed = mnemonicToSeedSync(phrase.trim().toLowerCase().replace(/\s+/g, " "))
  return Keypair.fromSeed(slip10(seed))
}

export function faucetConfigured() {
  const phrase = (process.env.FAUCET_PHRASE || "").trim()
  const mint = (process.env.USDT_MINT || process.env.VITE_USDT_MINT || "").trim()
  return Boolean(phrase && mint)
}

export async function dispenseUsdtDev(recipientBase58) {
  const phrase = (process.env.FAUCET_PHRASE || "").trim()
  const mintAddress = (process.env.USDT_MINT || process.env.VITE_USDT_MINT || "").trim()
  if (!phrase || !mintAddress) {
    return { ok: false, status: 503, error: "faucet-unconfigured" }
  }

  let recipient
  try {
    recipient = new PublicKey(recipientBase58)
    if (recipient.toBase58() !== recipientBase58) throw new Error("normalize")
  } catch {
    return { ok: false, status: 400, error: "invalid-recipient" }
  }

  const last = recent.get(recipientBase58) ?? 0
  if (Date.now() - last < COOLDOWN_MS) {
    return {
      ok: false,
      status: 429,
      error: "cooldown",
      retryAfterSec: Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000),
    }
  }

  const authority = keypairFromPhrase(phrase)
  const mint = new PublicKey(mintAddress)
  const uiAmount = Number(process.env.FAUCET_AMOUNT || "100")
  const raw = BigInt(Math.round(uiAmount * 10 ** DECIMALS))
  const connection = new Connection(process.env.RPC_URL || clusterApiUrl("devnet"), "confirmed")
  const ata = getAssociatedTokenAddressSync(mint, recipient)

  const balance = await connection.getBalance(authority.publicKey, "confirmed")
  if (balance < 5_000_000) {
    return { ok: false, status: 503, error: "faucet-unfunded" }
  }

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(authority.publicKey, ata, recipient, mint),
    createMintToInstruction(mint, ata, authority.publicKey, raw),
  )

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [authority], {
      commitment: "confirmed",
    })
    recent.set(recipientBase58, Date.now())
    return {
      ok: true,
      status: 200,
      signature,
      amount: uiAmount,
      symbol: "USDT-DEV",
      mint: mintAddress,
      recipient: recipientBase58,
      authority: authority.publicKey.toBase58(),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "mint-failed"
    // Likely wrong mint authority if phrase ≠ creator wallet.
    return { ok: false, status: 500, error: "mint-failed", detail: message }
  }
}
