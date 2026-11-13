import { SystemProgram, Transaction, type PublicKey } from "@solana/web3.js"

export function buildSolTransfer(options: {
  from: PublicKey
  to: PublicKey
  lamports: number
  blockhash: string
}) {
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

/** @deprecated Prefer buildSolTransfer — kept for wallet migration. */
export const buildTransfer = buildSolTransfer
