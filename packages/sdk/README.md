# `@rpay/protocol`

Protocol-grade TypeScript SDK for **RPay** — noncustodial Solana payment connectivity.

Separates **authorization** (payer signs locally) from **connectivity** (relay submits) and **settlement** (Solana validates). Aligns with `docs/02-protocol-specification.md` and `docs/03-transaction-lifecycle.md`.

## Install (workspace)

This package lives at `packages/sdk` in the RPay Protocol monorepo. The wallet app resolves it as `@rpay/protocol`.

```ts
import {
  RPayClient,
  createPaymentRequest,
  createNetworkContext,
  parseMessage,
  NATIVE_SOL,
  PROTOCOL_VERSION,
} from "@rpay/protocol"
```

## What it provides

| Area | Surface |
| --- | --- |
| Versioned envelopes | `network_context`, `signed_transaction`, `submission_status`, `payment_request`, … |
| Lifecycle | State transitions; settlement vs pre-settlement labels |
| Errors | `UNSUPPORTED_VERSION`, `WRONG_CLUSTER`, `UNKNOWN_OUTCOME`, … |
| Solana | SOL transfer build/verify/submit; injectable `Connection` |
| Transport | JSON envelopes + legacy compact QR (`rpay:bh:1:…`, `rpay:tx:1:…`) |
| Client | `RPayClient` for payer / relay / merchant flows |

## Invariants

1. Relays never receive seed phrases or private keys.
2. Relays must not rewrite signed message fields.
3. Relay acknowledgements are not settlement.
4. Expired blockhashes require a new signature.
5. `UNKNOWN_OUTCOME` is not permission to authorize a second payment blindly.

## Quick flow

```ts
import { Connection } from "@solana/web3.js"
import { RPayClient, serializeMessage } from "@rpay/protocol"

const client = new RPayClient({
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
  cluster: "devnet",
})

// Relay → payer
const context = await client.fetchNetworkContext()
const contextQr = client.encodeNetworkContextQr(context)

// Merchant request (JSON envelope for QR / future transports)
const request = client.createMerchantPaymentRequest({
  recipient: merchantPubkey,
  amount: 100_000_000, // lamports
})
const requestPayload = serializeMessage(request)

// Payer signs locally
const signed = client.signSolTransfer({
  keypair,
  to: request.recipient,
  lamports: request.amount,
  blockhash: context.recentBlockhash,
  exchangeId: context.exchangeId,
})

// Relay submits exact bytes, then merchant verifies independently
const submitted = await client.relaySubmit({
  serialized: signed.transaction.serialize(),
  blockhash: context.recentBlockhash,
  lastValidBlockHeight: context.lastValidBlockHeight,
  exchangeId: context.exchangeId,
})
const settled = await client.verifySettlement(submitted.signature)
```

## USDT / SPL tokens

```ts
import { resolveUsdtAsset, buildSplTransfer, createWdkSigner } from "@rpay/protocol"

const usdt = resolveUsdtAsset({ cluster: "devnet", mint: process.env.VITE_USDT_MINT })
// On Devnet, mints other than the official mainnet USDT mint are labeled USDT-DEV.
```

- Official Tether USDT mint (mainnet-beta): exported as `USDT_MAINNET_MINT`
- Devnet USDT-DEV: create a labeled test mint with `npm run usdt:devnet <RECIPIENT>` and set `VITE_USDT_MINT`
- Tether WDK adapter: wrap a WDK Solana account with `createWdkSigner(account)` — WDK stays a host dependency; the reference wallet requires it for USDT
- Network context includes absolute `expiresAt` / `fetchedAt`; use `client.contextExpiry(context)` or `getExpirySnapshot` for UI countdowns

## Version

`PROTOCOL_VERSION` is currently `0.1-draft`. Wire formats may change before `1.0`.

## Tests

From the repo root:

```bash
npm test
```
