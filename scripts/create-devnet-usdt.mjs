#!/usr/bin/env node
/**
 * Create a Devnet SPL mint labeled for RPay USDT-DEV and mint supply to a wallet.
 * Official Tether USDT is not assumed on Devnet — this produces a clearly labeled test mint.
 *
 * Public RPC faucets are closed, so this pays from your funded Devnet wallet via RPAY_PHRASE
 * (same derivation as the RPay wallet: m/44'/501'/0'/0').
 *
 * Usage (PowerShell):
 *   $env:RPAY_PHRASE="your twelve words here"
 *   npm run usdt:devnet -- <RECIPIENT_PUBKEY>
 *
 * If RECIPIENT_PUBKEY is omitted, tokens go to the same wallet that pays.
 * Prints VITE_USDT_MINT=... and writes .env.local.usdt
 */
import { mnemonicToSeedSync } from "@scure/bip39"
import { hmac } from "@noble/hashes/hmac"
import { sha512 } from "@noble/hashes/sha2"
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from "@solana/web3.js"
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token"
import { writeFileSync } from "node:fs"

const HARDENED = 0x80000000

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

const phrase = (process.env.RPAY_PHRASE || "").trim().toLowerCase().replace(/\s+/g, " ")
if (!phrase) {
  console.error("Set RPAY_PHRASE to your RPay wallet's 12 words (Devnet SOL must already be on that wallet).")
  console.error('PowerShell:  $env:RPAY_PHRASE="word1 word2 ... word12"')
  console.error("Then:        npm run usdt:devnet -- <RECIPIENT_PUBKEY>")
  process.exit(1)
}

const payer = Keypair.fromSeed(slip10(mnemonicToSeedSync(phrase)))
const recipientArg = process.argv[2]
const recipient = recipientArg ? new PublicKey(recipientArg) : payer.publicKey
const connection = new Connection(process.env.RPC_URL || clusterApiUrl("devnet"), "confirmed")
const mint = Keypair.generate()
const decimals = 6
const amount = 1_000_000_000_000n // 1,000,000 USDT-DEV

const balance = await connection.getBalance(payer.publicKey, "confirmed")
if (balance < 20_000_000) {
  console.error(
    `Payer ${payer.publicKey.toBase58()} has ${balance} lamports. Need Devnet SOL (~0.02+) for rent + fees.`,
  )
  console.error("Fund that address at https://faucet.solana.com (cluster: Devnet), then retry.")
  process.exit(1)
}

console.log(`Paying from ${payer.publicKey.toBase58()} (${balance} lamports)`)
console.log(`Minting USDT-DEV to ${recipient.toBase58()}`)

const lamports = await getMinimumBalanceForRentExemptMint(connection)
const ata = getAssociatedTokenAddressSync(mint.publicKey, recipient)

const tx = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports,
    programId: TOKEN_PROGRAM_ID,
  }),
  createInitializeMint2Instruction(mint.publicKey, decimals, payer.publicKey, null),
  createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, ata, recipient, mint.publicKey),
  createMintToInstruction(mint.publicKey, ata, payer.publicKey, amount),
)

const signature = await sendAndConfirmTransaction(connection, tx, [payer, mint])
const line = `VITE_USDT_MINT=${mint.publicKey.toBase58()}`
writeFileSync(".env.local.usdt", `${line}\n`, "utf8")

console.log("Created Devnet test USDT mint (NOT official Tether USDT).")
console.log(`mint:      ${mint.publicKey.toBase58()}`)
console.log(`recipient: ${recipient.toBase58()}`)
console.log(`ata:       ${ata.toBase58()}`)
console.log(`amount:    ${amount.toString()} (raw, 6 decimals)`)
console.log(`tx:        ${signature}`)
console.log(`Wrote ${line} to .env.local.usdt — copy into .env.local for wallet/merchant.`)
