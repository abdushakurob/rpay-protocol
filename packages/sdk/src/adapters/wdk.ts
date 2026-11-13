import { Transaction } from "@solana/web3.js"

/**
 * Host-provided signer abstraction.
 * RPay never takes custody — adapters only sign locally.
 */
export type ProtocolSigner = {
  publicKey: string
  signTransaction: (transaction: Transaction) => Promise<Transaction>
}

/**
 * Minimal surface we expect from Tether WDK Solana accounts.
 * Kept structural so `@tetherto/wdk-wallet-solana` stays an optional host dependency.
 */
export type WdkSolanaAccountLike = {
  getAddress: () => Promise<string> | string
  signTransaction?: (transaction: Transaction) => Promise<Transaction> | Transaction
  sign?: (transaction: Transaction) => Promise<Transaction> | Transaction
}

/**
 * Wrap a Tether WDK Solana account as an RPay protocol signer.
 *
 * @example
 * ```ts
 * import WalletManagerSolana from "@tetherto/wdk-wallet-solana"
 * import { createWdkSigner } from "@rpay/protocol"
 *
 * const wallet = new WalletManagerSolana(seedPhrase, { provider: rpcUrl })
 * const account = await wallet.getAccount(0)
 * const signer = await createWdkSigner(account)
 * ```
 */
export async function createWdkSigner(account: WdkSolanaAccountLike): Promise<ProtocolSigner> {
  const publicKey = await account.getAddress()
  const sign = account.signTransaction ?? account.sign
  if (!sign) {
    throw new Error("WDK account does not expose transaction signing")
  }
  return {
    publicKey,
    async signTransaction(transaction: Transaction) {
      return sign.call(account, transaction)
    },
  }
}

export function isWdkAvailable() {
  return false
}
