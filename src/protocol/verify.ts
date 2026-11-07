import { SystemProgram, Transaction } from "@solana/web3.js"

export type CheckedTransfer =
  | { ok: true; from: string; to: string; lamports: number; blockhash: string }
  | { ok: false; reason: "signature" | "shape" | "old" }

function readTransfer(tx: Transaction) {
  if (tx.instructions.length !== 1) return null
  const instruction = tx.instructions[0]
  if (!instruction.programId.equals(SystemProgram.programId) || instruction.keys.length < 2) return null
  const data = Uint8Array.from(instruction.data)
  if (data.length < 12) return null
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (view.getUint32(0, true) !== 2) return null
  const lamports = Number(view.getBigUint64(4, true))
  const from = instruction.keys[0].pubkey
  const to = instruction.keys[1].pubkey
  if (!Number.isSafeInteger(lamports) || lamports <= 0) return null
  if (!tx.feePayer?.equals(from) || from.equals(to)) return null
  return { from: from.toBase58(), to: to.toBase58(), lamports }
}

export function verifyTransfer(tx: Transaction, recentBlockhashes: string[]): CheckedTransfer {
  try {
    if (!tx.verifySignatures()) return { ok: false, reason: "signature" }
  } catch {
    return { ok: false, reason: "signature" }
  }
  const transfer = readTransfer(tx)
  if (!transfer) return { ok: false, reason: "shape" }
  const blockhash = tx.recentBlockhash ?? ""
  if (!recentBlockhashes.includes(blockhash)) return { ok: false, reason: "old" }
  return { ok: true, ...transfer, blockhash }
}
