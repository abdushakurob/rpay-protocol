import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  decodeTransferCheckedInstruction,
} from "@solana/spl-token"
import { Connection, PublicKey, Transaction, type Keypair } from "@solana/web3.js"
import type { AssetDescriptor } from "../types"

export type CheckedSplTransfer =
  | {
      ok: true
      authority: string
      sourceAta: string
      destinationAta: string
      mint: string
      amount: number
      decimals: number
      blockhash: string
    }
  | { ok: false; reason: "signature" | "shape" | "old" | "mint" }

export function associatedTokenAddress(owner: PublicKey, mint: PublicKey) {
  return getAssociatedTokenAddressSync(mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
}

export async function readTokenBalance(connection: Connection, owner: string, mint: string) {
  const ata = associatedTokenAddress(new PublicKey(owner), new PublicKey(mint))
  try {
    const balance = await connection.getTokenAccountBalance(ata, "confirmed")
    return {
      ata: ata.toBase58(),
      amount: Number(balance.value.amount),
      decimals: balance.value.decimals,
      uiAmount: balance.value.uiAmount ?? 0,
    }
  } catch {
    return { ata: ata.toBase58(), amount: 0, decimals: 6, uiAmount: 0 }
  }
}

/**
 * Build an SPL transfer-checked transaction.
 * Creates the destination ATA idempotently when missing (payer = fee payer / sender).
 */
export function buildSplTransfer(options: {
  from: PublicKey
  to: PublicKey
  mint: PublicKey
  amount: number
  decimals: number
  blockhash: string
  createDestinationAta?: boolean
}) {
  const source = associatedTokenAddress(options.from, options.mint)
  const destination = associatedTokenAddress(options.to, options.mint)
  const tx = new Transaction()
  tx.feePayer = options.from
  tx.recentBlockhash = options.blockhash

  if (options.createDestinationAta !== false) {
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        options.from,
        destination,
        options.to,
        options.mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    )
  }

  tx.add(
    createTransferCheckedInstruction(
      source,
      options.mint,
      destination,
      options.from,
      BigInt(options.amount),
      options.decimals,
      [],
      TOKEN_PROGRAM_ID,
    ),
  )
  return tx
}

export function signSplTransfer(options: {
  keypair: Keypair
  to: string
  mint: string
  amount: number
  decimals: number
  blockhash: string
}) {
  const tx = buildSplTransfer({
    from: options.keypair.publicKey,
    to: new PublicKey(options.to),
    mint: new PublicKey(options.mint),
    amount: options.amount,
    decimals: options.decimals,
    blockhash: options.blockhash,
  })
  tx.sign(options.keypair)
  return tx
}

export function verifySplTransfer(
  tx: Transaction,
  recentBlockhashes: string[],
  expected?: Pick<AssetDescriptor, "mint" | "decimals"> & { amount?: number },
): CheckedSplTransfer {
  try {
    if (!tx.verifySignatures()) return { ok: false, reason: "signature" }
  } catch {
    return { ok: false, reason: "signature" }
  }

  const blockhash = tx.recentBlockhash ?? ""
  if (!recentBlockhashes.includes(blockhash)) return { ok: false, reason: "old" }

  const transferIx = [...tx.instructions].reverse().find((instruction) => {
    try {
      decodeTransferCheckedInstruction(instruction, TOKEN_PROGRAM_ID)
      return true
    } catch {
      return false
    }
  })
  if (!transferIx) return { ok: false, reason: "shape" }

  let decoded
  try {
    decoded = decodeTransferCheckedInstruction(transferIx, TOKEN_PROGRAM_ID)
  } catch {
    return { ok: false, reason: "shape" }
  }

  const mint = decoded.keys.mint.pubkey.toBase58()
  const amount = Number(decoded.data.amount)
  const decimals = decoded.data.decimals
  if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, reason: "shape" }
  if (expected?.mint && expected.mint !== mint) return { ok: false, reason: "mint" }
  if (expected?.decimals !== undefined && expected.decimals !== decimals) return { ok: false, reason: "mint" }
  if (expected?.amount !== undefined && expected.amount !== amount) return { ok: false, reason: "shape" }

  return {
    ok: true,
    authority: decoded.keys.owner.pubkey.toBase58(),
    sourceAta: decoded.keys.source.pubkey.toBase58(),
    destinationAta: decoded.keys.destination.pubkey.toBase58(),
    mint,
    amount,
    decimals,
    blockhash,
  }
}
