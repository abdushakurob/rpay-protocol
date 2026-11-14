# TypeScript SDK

`@rpay/protocol` is a TypeScript library for RPay payment exchanges on Solana. You use it to build versioned JSON messages, sign transfers, submit signed bytes, and read confirmation status.

| | |
| --- | --- |
| Package | `@rpay/protocol` |
| Peer dependency | `@solana/web3.js` (^1.98) |
| Default cluster | `devnet` |
| Protocol version | `0.1-draft` |

If you do not already have a Node project with wallets and Devnet SOL, start with the [Quickstart](quickstart.md). The rest of these pages assume that setup (or equivalent) is done.

## Payment flow

An exchange is five calls. Roles can live on different devices; in the Quickstart they run in one script.

| Step | Method | Runs on |
| --- | --- | --- |
| Get a fresh blockhash stamp | [`fetchNetworkContext`](sdk-fetch-network-context.md) | Any online process with RPC |
| Declare amount + recipient | [`createMerchantPaymentRequest`](sdk-create-merchant-payment-request.md) | Merchant app |
| Sign the transfer | [`signSolTransfer`](sdk-sign-sol-transfer.md) (or `signSplTransfer`) | Payer wallet |
| Broadcast signed bytes | [`relaySubmit`](sdk-relay-submit.md) | Online process (“relay”) |
| Read chain status | [`verifySettlement`](sdk-verify-settlement.md) | Merchant, payer, or anyone with the signature |

**Relay** here means whatever online peer submits the transaction — a phone hotspot helper, your backend, or the same script that signed. It does not rewrite the signed transaction.

Between devices, messages travel as JSON strings (QR, clipboard, NFC, HTTP). Encode/decode with `serializeMessage` / `parseMessage`.

## Install

```bash
npm install @rpay/protocol @solana/web3.js
```

Requires **Node.js 18+**. Full project setup (TypeScript runner, keypairs, faucet) is in the [Quickstart](quickstart.md).

```ts
import { Connection } from "@solana/web3.js"
import { RPayClient } from "@rpay/protocol"

const client = new RPayClient({
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
  cluster: "devnet",
})
```

## Behavior worth knowing once

- You inject `Connection` — choose RPC URL and commitment yourself.
- Signing methods take a `Keypair` or `ProtocolSigner`; the client does not store keys.
- `relaySubmit` sends the serialized transaction as-is.
- After submit, call `verifySettlement(signature)` to see what the chain reports. The `submission_status` object from submit is what that submit call observed; treat chain status as source of truth for “paid.”

## Pages

1. [Quickstart](quickstart.md) — install, fund, run end-to-end  
2. [Create a client](sdk-client.md)  
3. Method pages in the sidebar (parameters, returns, examples)  
4. [Errors](sdk-errors.md) · [Package exports](sdk-exports.md)
