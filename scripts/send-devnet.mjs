import { mnemonicToSeedSync } from "@scure/bip39"
import { hmac } from "@noble/hashes/hmac"
import { sha512 } from "@noble/hashes/sha2"
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js"
import { mkdirSync, writeFileSync } from "node:fs"

const RPC = process.env.RPC_URL || "https://api.devnet.solana.com"
const phrase = (process.env.RPAY_PHRASE || "").trim().toLowerCase()
const to = process.env.RPAY_TO || "HngYaP2dm7s8c5p2GBGy1vrgW1rzsVhyaMhKK26h1QPZ"
const sol = Number(process.env.RPAY_SOL || "0.01")

if (!phrase) {
  console.error("Set RPAY_PHRASE to the wallet's 12 words.")
  process.exit(1)
}

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

const seed = mnemonicToSeedSync(phrase)
const payer = Keypair.fromSeed(slip10(seed))
const connection = new Connection(RPC, "confirmed")
const lamports = Math.round(sol * LAMPORTS_PER_SOL)

const latest = await connection.getLatestBlockhash("confirmed")
const tx = new Transaction({
  feePayer: payer.publicKey,
  recentBlockhash: latest.blockhash,
}).add(
  SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: new PublicKey(to),
    lamports,
  }),
)
tx.sign(payer)
const signature = await connection.sendRawTransaction(tx.serialize())
await connection.confirmTransaction(
  { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
  "confirmed",
)
const receipt = `https://explorer.solana.com/tx/${signature}?cluster=devnet`
mkdirSync("data", { recursive: true })
writeFileSync("data/last-devnet-tx.txt", `${signature}\n${receipt}\nfrom ${payer.publicKey.toBase58()}\nto ${to}\n`)
console.log(signature)
console.log(receipt)
