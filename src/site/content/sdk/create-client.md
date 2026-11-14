# Create a client

`RPayClient` holds a Solana RPC `Connection` and a `cluster` label. Create one client per RPC endpoint and reuse it for context, payment requests, signing helpers, and submit.

## Minimal setup (Node)

```ts
import { Connection } from "@solana/web3.js"
import { RPayClient } from "@rpay/protocol"

const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com"

const connection = new Connection(RPC_URL, "confirmed")
const client = new RPayClient({
  connection,
  cluster: "devnet",
})
```

- `Connection` is from `@solana/web3.js`. The first argument is the RPC URL; the second is the default commitment for reads (`"confirmed"` matches what this SDK uses when fetching blockhashes and confirming submits).
- `cluster` is written into every JSON envelope (`network_context`, `payment_request`, …). Keep it aligned with the RPC you point at (`devnet` → Devnet RPC).
- Override the URL with `RPC_URL` when you use a private provider; the public Devnet endpoint is fine for learning.

If you have not installed packages or created wallets yet, follow the [Quickstart](quickstart.md) first.

## Constructor

```ts
new RPayClient(options: RPayClientOptions)
```

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `connection` | `Connection` | — | Required. |
| `cluster` | `"devnet" \| "mainnet-beta" \| "testnet"` | `"devnet"` | Stamped on outgoing messages. |

### Instance fields

| Field | Type |
| --- | --- |
| `client.connection` | The `Connection` you passed in |
| `client.cluster` | Resolved cluster string |

## Helper methods

These live on the same instance:

| Method | What it does |
| --- | --- |
| `encodeNetworkContextQr(context)` | JSON-stringifies a context for QR / clipboard (`serializeMessage`) |
| `contextExpiry(context, now?)` | `{ remainingMs, expired, label, expiresAt, fetchedAt }` for countdowns |
| `assertContextStillValid(context)` | Fetches current height; throws `BLOCKHASH_EXPIRED` if the stamp is dead |
| `decodeScannedPayload(raw)` | Parses a scanned string into an envelope or legacy QR payload |
| `decodeSignedTransactionBytes(raw)` | Envelope or legacy QR → `Transaction` |
| `prepareSolTransfer` / `prepareSplTransfer` | Build unsigned transactions |
| `signWithSigner({ signer, transaction })` | Sign with any `ProtocolSigner` |
| `readTokenBalance(owner, mint)` | SPL token balance for an owner |
| `verifySolTransfer` / `verifySplTransfer` | Local signature + shape checks before broadcast |

## Browser / Vite note

In a Vite app you might read `import.meta.env.VITE_RPC_URL`. That is app config, not an SDK requirement. In Node use `process.env.RPC_URL` (or a hard-coded Devnet URL) as above.

## Next

- [fetchNetworkContext](sdk-fetch-network-context.md) — first call in an exchange  
- [Quickstart](quickstart.md) — full runnable script
