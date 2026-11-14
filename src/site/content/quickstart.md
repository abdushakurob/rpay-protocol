# Quickstart

This walkthrough sets up Node, installs the SDK, creates Devnet wallets, funds the payer, and runs one SOL payment through `@rpay/protocol` so you can see how each step works.

## 1. Requirements

| Requirement | Notes |
| --- | --- |
| **Node.js 18+** | Check with `node -v`. Install from [nodejs.org](https://nodejs.org/) if needed. |
| **npm 9+** | Ships with Node (`npm -v`). |
| **Network** | Outbound HTTPS to a Solana Devnet RPC. |

You do not need the Solana CLI for this guide.

## 2. Create a project and install

```bash
mkdir rpay-quickstart && cd rpay-quickstart
npm init -y
npm install @rpay/protocol @solana/web3.js
npm install -D typescript tsx @types/node
```

`tsx` runs TypeScript without a separate compile step.

## 3. Create payer and merchant keypairs

RPay needs two addresses for a payment: the **payer** (signs and spends) and the **merchant** (receives). Generate them once and print the public keys.

Create `wallets.ts`:

```ts
import { Keypair } from "@solana/web3.js"
import { writeFileSync } from "node:fs"

const payer = Keypair.generate()
const merchant = Keypair.generate()

writeFileSync(
  "payer.json",
  JSON.stringify(Array.from(payer.secretKey)),
)
writeFileSync(
  "merchant.json",
  JSON.stringify(Array.from(merchant.secretKey)),
)

console.log("Payer:   ", payer.publicKey.toBase58())
console.log("Merchant:", merchant.publicKey.toBase58())
console.log("Secret keys written to payer.json and merchant.json — keep them local.")
```

```bash
npx tsx wallets.ts
```

Load them later with:

```ts
import { readFileSync } from "node:fs"
import { Keypair } from "@solana/web3.js"

const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync("payer.json", "utf8"))),
)
const merchant = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync("merchant.json", "utf8"))),
)
```

## 4. Fund the payer on Devnet

The payer needs Devnet SOL for the transfer **and** the transaction fee. The merchant only needs a public key (it does not sign).

**Recommended:** open [https://faucet.solana.com](https://faucet.solana.com), select **Devnet**, paste the **payer** address from step 3, and request SOL (1 SOL is enough for many test payments).

Public RPC `requestAirdrop` is often rate-limited or disabled. Prefer the web faucet. If you still want to try from code:

```ts
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"

const connection = new Connection("https://api.devnet.solana.com", "confirmed")
const sig = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL)
await connection.confirmTransaction(sig, "confirmed")
```

Confirm the balance:

```ts
const lamports = await connection.getBalance(payer.publicKey)
console.log(lamports / 1e9, "SOL")
```

You need enough for `amount + fee` (for a 0.01 SOL payment, ~0.02 SOL balance is comfortable).

## 5. Run one payment exchange

Create `pay.ts`. This script does the full protocol path on one machine: fetch context → create request → sign → submit → verify.

```ts
import { readFileSync } from "node:fs"
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { RPayClient } from "@rpay/protocol"

const connection = new Connection("https://api.devnet.solana.com", "confirmed")
const client = new RPayClient({ connection, cluster: "devnet" })

const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync("payer.json", "utf8"))),
)
const merchant = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync("merchant.json", "utf8"))),
)

const amount = Math.round(0.01 * LAMPORTS_PER_SOL) // 0.01 SOL

const balance = await connection.getBalance(payer.publicKey)
if (balance < amount + 5000) {
  throw new Error(
    `Payer needs Devnet SOL. Balance=${balance}. Fund ${payer.publicKey.toBase58()} at https://faucet.solana.com`,
  )
}

// --- 1. Network context (connected side) ---
// Pulls a fresh blockhash + lastValidBlockHeight. The payer must sign against this stamp.
const context = await client.fetchNetworkContext()
console.log("exchangeId", context.exchangeId)
console.log("blockhash", context.recentBlockhash)
console.log("expiresAt", new Date(context.expiresAt).toISOString())

// --- 2. Payment request (merchant) ---
// Declares who gets paid and how much. In production this is often a QR; here we keep the object.
const request = client.createMerchantPaymentRequest({
  recipient: merchant.publicKey.toBase58(),
  amount,
})
console.log("request", request.recipient, request.amount, request.asset.symbol)

// --- 3. Sign (payer) ---
// Builds a System Program transfer and signs locally. Only the payer key is used.
const signed = client.signSolTransfer({
  keypair: payer,
  to: request.recipient,
  lamports: request.amount,
  blockhash: context.recentBlockhash,
  exchangeId: context.exchangeId,
})

// --- 4. Submit (relay / online device) ---
// Sends exact signed bytes. Default waits for "confirmed" within the blockhash window.
const submitted = await client.relaySubmit({
  serialized: signed.transaction.serialize(),
  blockhash: context.recentBlockhash,
  lastValidBlockHeight: context.lastValidBlockHeight,
  exchangeId: context.exchangeId,
})
console.log("signature", submitted.signature)
console.log("submit state", submitted.state)

// --- 5. Observe settlement ---
// Independent of the relay claim: read signature status from the chain.
const state = await client.verifySettlement(submitted.signature)
console.log("settlement", state)
console.log(
  `https://explorer.solana.com/tx/${submitted.signature}?cluster=devnet`,
)
```

```bash
npx tsx pay.ts
```

Expected output ends with a signature, a settlement state (`confirmed` or `finalized`), and an explorer URL. Open the URL to confirm the transfer on Devnet.

## 6. What just happened

| Step | API | Role |
| --- | --- | --- |
| Context | `fetchNetworkContext` | Online peer stamps a blockhash the payer will use |
| Request | `createMerchantPaymentRequest` | Merchant names recipient + amount (lamports for SOL) |
| Sign | `signSolTransfer` | Payer authorizes a transfer offline-capable; key never goes to the relay |
| Submit | `relaySubmit` | Online peer broadcasts the signed bytes unchanged |
| Verify | `verifySettlement` | Anyone with the signature checks Solana status |

In the reference wallet/merchant apps these steps are split across devices and QRs (`encodeNetworkContextQr`, `serializeMessage(request)`, `signed.messageJson`). The script above keeps them in one process so you can learn the API without scanning.

If the blockhash expires before submit, fetch a new context and sign again. If submit returns `UNKNOWN_OUTCOME`, look up the signature before sending a second payment — see [Errors](sdk-errors.md).

## Next

- [Create a client](sdk-client.md) — connection options and helpers
- [fetchNetworkContext](sdk-fetch-network-context.md) — expiry and QR encoding
- [createMerchantPaymentRequest](sdk-create-merchant-payment-request.md) — SOL vs SPL amounts
- [signSolTransfer](sdk-sign-sol-transfer.md) — SPL / WDK signers
