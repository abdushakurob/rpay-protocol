import { Buffer } from "buffer"
import { Keypair, Transaction } from "@solana/web3.js"
import { getBase64EncodedWireTransaction } from "@solana/transactions"
import { WalletAccountSolana } from "@tetherto/wdk-wallet-solana"
import { toBase64 } from "@rpay/protocol"

const WDK_RPC = import.meta.env.VITE_RPC_URL || "https://api.devnet.solana.com"

/**
 * Tether WDK Solana account for the unlocked reference wallet.
 * Uses the same secret key as the vault Keypair so addresses stay stable.
 * Provider is configured so WDK allows signTransaction; signing serialized
 * bytes does not require a live RPC round-trip (needed for offline authorize).
 */
export function createWdkAccountFromKeypair(keypair: Keypair) {
  return WalletAccountSolana.fromPrivateKey(keypair.secretKey, {
    provider: WDK_RPC,
    commitment: "confirmed",
  })
}

/**
 * Sign an RPay-built @solana/web3.js transaction with Tether WDK.
 * Returns a web3.js Transaction suitable for legacy QR + relay submit.
 */
export async function signTransactionWithWdk(keypair: Keypair, transaction: Transaction) {
  const account = createWdkAccountFromKeypair(keypair)
  try {
    const unsigned = toBase64(transaction.serialize({ requireAllSignatures: false, verifySignatures: false }))
    const signed = await account.signTransaction(unsigned)
    // WDK FullySignedTransaction brands collide across @solana/transactions copies; runtime shape matches wire encoder.
    const wire = getBase64EncodedWireTransaction(
      signed as unknown as Parameters<typeof getBase64EncodedWireTransaction>[0],
    )
    return Transaction.from(Buffer.from(wire, "base64"))
  } finally {
    account.dispose()
  }
}
