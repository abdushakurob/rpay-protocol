import { Keypair, Transaction } from "@solana/web3.js"
import type { ProtocolSigner } from "./wdk"

/** Default reference-wallet signer — Keypair stays in the host app. */
export function createKeypairSigner(keypair: Keypair): ProtocolSigner {
  return {
    publicKey: keypair.publicKey.toBase58(),
    async signTransaction(transaction: Transaction) {
      transaction.sign(keypair)
      return transaction
    },
  }
}
