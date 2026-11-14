# signSolTransfer

Builds a native SOL System Program transfer, signs it with a `Keypair`, and returns both a web3.js `Transaction` and a `signed_transaction` JSON envelope for transport.

## What you need

| Input | How you get it |
| --- | --- |
| `keypair` | Payer secret key — from [Quickstart](quickstart.md) `payer.json`, or `Keypair.fromSecretKey(...)` |
| `to` | Merchant address — usually `request.recipient` from [`createMerchantPaymentRequest`](sdk-create-merchant-payment-request.md) |
| `lamports` | Usually `request.amount` (lamports) |
| `blockhash` | `context.recentBlockhash` from [`fetchNetworkContext`](sdk-fetch-network-context.md) |
| Funded payer | Devnet SOL for `lamports` + fee — [faucet.solana.com](https://faucet.solana.com) |

The payer key stays in your process. You only send the *signed* transaction (or its JSON envelope) to whatever will call `relaySubmit`.

## Call

```ts
import { readFileSync } from "node:fs"
import { Connection, Keypair } from "@solana/web3.js"
import { RPayClient } from "@rpay/protocol"

const client = new RPayClient({
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
  cluster: "devnet",
})

const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync("payer.json", "utf8"))),
)

// context + request from earlier steps (or decode from QR)
const signed = client.signSolTransfer({
  keypair: payer,
  to: request.recipient,
  lamports: request.amount,
  blockhash: context.recentBlockhash,
  exchangeId: context.exchangeId,
})
```

## Signature

```ts
signSolTransfer(options: {
  keypair: Keypair
  to: string
  lamports: number
  blockhash: string
  exchangeId?: string
}): {
  transaction: Transaction
  message: SignedTransactionMessage
  messageJson: string
  legacyQr: string
}
```

| Param | Type | Description |
| --- | --- | --- |
| `keypair` | `Keypair` | Fee payer and sole signer |
| `to` | `string` | Recipient base58 |
| `lamports` | `number` | Transfer amount |
| `blockhash` | `string` | From network context |
| `exchangeId` | `string` | Prefer `context.exchangeId` |

## Return value

| Field | Use for |
| --- | --- |
| `transaction` | `transaction.serialize()` → `relaySubmit({ serialized })` |
| `messageJson` | QR / clipboard to another device that will submit |
| `message` | Typed envelope (`type: "signed_transaction"`, base64 tx) |
| `legacyQr` | Older compact QR format; `decodeScannedPayload` still accepts it |

The transaction contains one System Program transfer: from `keypair.publicKey` to `to`, with `recentBlockhash` set from context.

## Hand off to a relay

```ts
// Same process:
await client.relaySubmit({
  serialized: signed.transaction.serialize(),
  blockhash: context.recentBlockhash,
  lastValidBlockHeight: context.lastValidBlockHeight,
  exchangeId: context.exchangeId,
})

// Or another device scans messageJson:
const decoded = client.decodeSignedTransactionBytes(signed.messageJson)
await client.relaySubmit({
  serialized: decoded.serialize(),
  blockhash: context.recentBlockhash,
  lastValidBlockHeight: context.lastValidBlockHeight,
})
```

The submitting device still needs the context’s `blockhash` / `lastValidBlockHeight` (from the original context QR or a shared `exchangeId` lookup). In the single-process Quickstart both are in memory.

## Optional: check locally before submit

```ts
const checked = client.verifySolTransfer(signed.transaction, [context.recentBlockhash])
if (!checked.ok) {
  // "signature" | "shape" | "old"
  throw new Error(checked.reason)
}
```

## SPL tokens

When `request.asset.kind === "spl_token"` (and `request.asset.mint` is set):

```ts
const signed = client.signSplTransfer({
  keypair: payer,
  to: request.recipient,
  mint: request.asset.mint!,
  amount: request.amount,
  decimals: request.asset.decimals,
  blockhash: context.recentBlockhash,
  exchangeId: context.exchangeId,
})
```

Same return shape. The payer must hold the token; the destination ATA is created idempotently if missing (payer pays rent). See [Assets and USDT-DEV](09-tether-usdt.md) for mint setup.

## Optional: WDK / custom signer

`signSolTransfer` takes a web3.js `Keypair`. For Tether WDK (or hardware), build an unsigned tx and use `signWithSigner`:

```ts
import { PublicKey } from "@solana/web3.js"
import { createWdkSigner, createKeypairSigner } from "@rpay/protocol"

const unsigned = client.prepareSolTransfer({
  from: payer.publicKey,
  to: new PublicKey(request.recipient),
  lamports: request.amount,
  blockhash: context.recentBlockhash,
})

// Keypair adapter (equivalent power to signSolTransfer):
const signer = createKeypairSigner(payer)

// Or WDK — install `@tetherto/wdk-wallet-solana` in your app, obtain an account, then:
// const signer = await createWdkSigner(wdkAccount)

const signed = await client.signWithSigner({
  signer,
  transaction: unsigned,
  exchangeId: context.exchangeId,
})
```

WDK is an optional host dependency; the SDK only needs an object with `getAddress` and `signTransaction` / `sign`.

## Related

- [relaySubmit](sdk-relay-submit.md)  
- [fetchNetworkContext](sdk-fetch-network-context.md)
