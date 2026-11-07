import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js"
import { writeFileSync, mkdirSync } from "node:fs"

const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", "confirmed")
const sender = Keypair.generate()
const recipient = Keypair.generate()

async function airdrop() {
  let lastError = "Devnet did not fund the sender."
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const signature = await connection.requestAirdrop(sender.publicKey, LAMPORTS_PER_SOL)
      const started = Date.now()
      while (Date.now() - started < 40_000) {
        const status = await connection.getSignatureStatuses([signature])
        const value = status.value[0]
        if (value?.err) throw new Error("Airdrop failed")
        if (value?.confirmationStatus === "confirmed" || value?.confirmationStatus === "finalized") break
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      const balance = await connection.getBalance(sender.publicKey, "confirmed")
      if (balance > 0) return
      lastError = "Airdrop confirmed without a balance."
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }
  throw new Error(lastError)
}

const funded = await airdrop()
void funded
const latest = await connection.getLatestBlockhash("confirmed")
const tx = new Transaction({
  feePayer: sender.publicKey,
  recentBlockhash: latest.blockhash,
}).add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: recipient.publicKey,
    lamports: 10_000_000,
  }),
)
tx.sign(sender)
const signature = await connection.sendRawTransaction(tx.serialize())
await connection.confirmTransaction(
  { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
  "confirmed",
)
const receipt = `https://explorer.solana.com/tx/${signature}?cluster=devnet`
mkdirSync("data", { recursive: true })
writeFileSync("data/last-devnet-tx.txt", `${signature}\n${receipt}\n`)
console.log(signature)
console.log(receipt)
