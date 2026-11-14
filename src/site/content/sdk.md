# Integrate RPay

Use `@rpay/protocol` to add RPay payment messages and Solana transaction helpers to your own application. The current implementation targets Solana Devnet.

## Install

```bash
npm install @rpay/protocol @solana/web3.js
```

You need a Devnet RPC connection. For a complete payment, the payer needs a funded Devnet wallet and the merchant needs a Solana recipient address.

## Create a client

```ts
import { Connection } from "@solana/web3.js"
import { RPayClient } from "@rpay/protocol"

const client = new RPayClient({
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
  cluster: "devnet",
})
```

The client exposes payer, relay, and merchant helpers. Keep wallet keys in your host application; the relay does not need them.

## Start a payment exchange

The connected participant fetches fresh transaction context. The current RPay apps pass this context through a QR code.

```ts
const context = await client.fetchNetworkContext()
const contextQr = client.encodeNetworkContextQr(context)
```

Show `contextQr` to the payer. The context has a limited lifetime. If it expires, fetch new context and have the payer sign again.

## Create a merchant request

Merchants can supply the destination and amount as a protocol payment request. The amount below is `0.1 SOL` in lamports.

```ts
import { serializeMessage } from "@rpay/protocol"

const request = client.createMerchantPaymentRequest({
  recipient: merchantPubkey,
  amount: 100_000_000,
})
const requestPayload = serializeMessage(request)
```

The merchant app presents `requestPayload` as a QR code. The payer must still review the payment before signing.

## Sign on the payer device

The payer signs the supported SOL transfer locally. `keypair` is controlled by the wallet; `recipient` is the intended Solana address.

```ts
const signed = client.signSolTransfer({
  keypair,
  to: recipient,
  lamports: 100_000_000,
  blockhash: context.recentBlockhash,
  exchangeId: context.exchangeId,
})
```

The signed transaction can be transported to a connected relay. The current applications use QR codes; QR is the current transport, not the protocol itself.

## Submit and verify

The relay submits the signed bytes. The application then checks Solana for the result.

```ts
const submitted = await client.relaySubmit({
  serialized: signed.transaction.serialize(),
  blockhash: context.recentBlockhash,
  lastValidBlockHeight: context.lastValidBlockHeight,
  exchangeId: context.exchangeId,
})

const settled = await client.verifySettlement(submitted.signature)
```

A relay response is not proof that a payment settled. Treat uncertain or expired outcomes according to the [payment lifecycle](03-transaction-lifecycle.md), and check the [security model](05-security-model.md) before building a user-facing flow.

## Assets and status

The SDK supports native SOL transfers and implemented SPL transfer helpers. RPay Wallet and Merchant also support a configured Devnet test mint labeled **USDT-DEV**. This is not official Tether USDT. See [asset support](09-tether-usdt.md).

The protocol version is currently `0.1-draft`. Message formats can change, and the implementation has no independent audit or mainnet readiness claim. Read [limitations and maturity](07-limitations.md).
