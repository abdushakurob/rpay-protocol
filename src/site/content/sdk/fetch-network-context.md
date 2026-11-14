# fetchNetworkContext

Asks your RPC for the latest blockhash and wraps it in a `network_context` message. Every payment signature in this exchange must use that blockhash. Submit must happen before Solana invalidates it.

## What you need

| Input | How you get it |
| --- | --- |
| `client` | [`RPayClient`](sdk-client.md) pointed at Devnet (or your cluster) |
| Working RPC | Same as Quickstart — public Devnet URL or `RPC_URL` |

No wallet keys are required for this call. Only network access.

## Call

```ts
import { Connection } from "@solana/web3.js"
import { RPayClient } from "@rpay/protocol"

const client = new RPayClient({
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
  cluster: "devnet",
})

const context = await client.fetchNetworkContext()
// Optional: fetchNetworkContext(exchangeId, feePayer)
```

| Param | Type | Description |
| --- | --- | --- |
| `exchangeId` | `string` | Optional id shared across context → sign → submit. Auto-generated if omitted. |
| `feePayer` | `string` | Optional base58 pubkey when the fee payer is not the signer. Rare for simple SOL transfers. |

On RPC failure the method throws `ProtocolError` with code `RPC_UNAVAILABLE`.

## Return value (`NetworkContextMessage`)

| Field | Type | Use for |
| --- | --- | --- |
| `recentBlockhash` | `string` | `signSolTransfer({ blockhash })` |
| `lastValidBlockHeight` | `number` | `relaySubmit({ lastValidBlockHeight })` |
| `exchangeId` | `string` | Pass through on sign + submit so messages correlate |
| `expiresAt` | `number` | Unix ms — UI countdown only |
| `fetchedAt` | `number` | Unix ms when the stamp was taken |
| `currentBlockHeight` | `number` | Height at fetch time |
| `slotMs` | `number` | `400` — used to derive `expiresAt` |
| `cluster` / `version` / `protocol` | | Envelope metadata |
| `feePayer` | `string?` | Echo of the optional argument |

## Expiry

Solana drops a blockhash once chain height exceeds `lastValidBlockHeight`. `expiresAt` is a wall-clock estimate (`remaining slots × 400ms`) for UIs. Clocks can drift — before broadcasting, re-check the chain:

```ts
try {
  await client.assertContextStillValid(context)
} catch (err) {
  // ProtocolError BLOCKHASH_EXPIRED → fetchNetworkContext() again, payer must re-sign
  throw err
}

const { remainingMs, expired, label } = client.contextExpiry(context)
console.log(label) // e.g. "1:12 left" or "Expired"
```

## Hand the context to another device

```ts
const payload = client.encodeNetworkContextQr(context)
// Show `payload` as a QR, or write it to a file / HTTP body

// On the device that scans / receives it:
const scanned = client.decodeScannedPayload(payload)
if (scanned?.kind === "envelope" && scanned.message.type === "network_context") {
  const remoteContext = scanned.message
  // use remoteContext.recentBlockhash when signing
}
```

`encodeNetworkContextQr` is `serializeMessage(context)` — a JSON string. Legacy compact QR formats are also accepted by `decodeScannedPayload`.

## Related

- [signSolTransfer](sdk-sign-sol-transfer.md) — consumes `recentBlockhash`  
- [relaySubmit](sdk-relay-submit.md) — consumes `lastValidBlockHeight`
