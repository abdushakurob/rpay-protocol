import { SystemProgram, Transaction, type PublicKey } from "@solana/web3.js"

export function buildTransfer(options: { from: PublicKey; to: PublicKey; lamports: number; blockhash: string }) {
  const tx = new Transaction()
  tx.feePayer = options.from
  tx.recentBlockhash = options.blockhash
  tx.add(
    SystemProgram.transfer({
      fromPubkey: options.from,
      toPubkey: options.to,
      lamports: options.lamports,
    }),
  )
  return tx
}
