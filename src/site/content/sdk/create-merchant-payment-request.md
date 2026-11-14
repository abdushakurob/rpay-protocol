# createMerchantPaymentRequest

Builds a `payment_request` message: who gets paid, how much, and which asset. The merchant (or your script) creates this; the payer reads it and signs a matching transfer.

## What you need

| Input | How you get it |
| --- | --- |
| `client` | [`RPayClient`](sdk-client.md) |
| `recipient` | Base58 Solana address that should receive funds. In the [Quickstart](quickstart.md) this is `merchant.publicKey.toBase58()` from `merchant.json`. Any wallet address works. |
| `amount` | Integer in **smallest units** (see below) |

## Amounts

| Asset | Unit | Example |
| --- | --- | --- |
| SOL | lamports (1 SOL = `1_000_000_000`) | `0.01 SOL` → `10_000_000` |
| SPL token | raw token amount using that mint’s `decimals` | USDT-style 6 decimals: `12.50` → `12_500_000` |

```ts
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

const amount = Math.round(0.01 * LAMPORTS_PER_SOL) // 10000000
```

For human decimal strings on SPL, use `parseTokenAmount("12.50", decimals)` from the package.

## Call (SOL)

```ts
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { RPayClient, serializeMessage } from "@rpay/protocol"

const client = new RPayClient({
  connection: new Connection("https://api.devnet.solana.com", "confirmed"),
  cluster: "devnet",
})

const recipient = "…" // merchant public key (base58)
const request = client.createMerchantPaymentRequest({
  recipient,
  amount: Math.round(0.01 * LAMPORTS_PER_SOL),
  memo: "Order #1042", // optional
})

const payload = serializeMessage(request)
// Show `payload` as QR / send to payer
```

## Signature

```ts
createMerchantPaymentRequest(options: {
  recipient: string
  amount: number
  asset?: AssetDescriptor
  memo?: string
  expiresAt?: number
}): PaymentRequestMessage
```

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `recipient` | `string` | — | Destination base58 address |
| `amount` | `number` | — | Smallest units; positive safe integer |
| `asset` | `AssetDescriptor` | `NATIVE_SOL` | Defaults to native SOL (`decimals: 9`) |
| `memo` | `string` | — | Optional string on the request |
| `expiresAt` | `number` | — | Optional unix ms when *this request* should be treated as stale (separate from blockhash expiry) |

Throws `INVALID_PAYMENT_REQUEST` if `recipient` is empty or `amount` is invalid.

## Return value (`PaymentRequestMessage`)

| Field | Description |
| --- | --- |
| `requestId` | Unique id for this request |
| `exchangeId` | Envelope correlation id |
| `recipient` / `amount` / `asset` | What the payer should pay |
| `memo` / `expiresAt` | Optional fields you passed |
| `cluster` | From the client |

The payer should use `request.recipient` and `request.amount` when calling `signSolTransfer` (or SPL equivalents), not hard-code a second copy.

## SPL / USDT-DEV (optional)

Native SOL is enough for the Quickstart. For an SPL request you need a **mint address** (the token’s mint on that cluster).

```ts
import { resolveUsdtAsset, parseTokenAmount } from "@rpay/protocol"

const mint = process.env.USDT_MINT // base58 mint you created or were given
const usdt = resolveUsdtAsset({ cluster: "devnet", mint })
if (!usdt) throw new Error("Set USDT_MINT to a Devnet mint address")

const raw = parseTokenAmount("12.50", usdt.decimals)
if (raw == null) throw new Error("bad amount")

const request = client.createMerchantPaymentRequest({
  recipient,
  amount: raw,
  asset: usdt,
})
```

`resolveUsdtAsset` returns `null` when no mint is provided on Devnet. Creating a test mint in this repo is documented under [Assets and USDT-DEV](09-tether-usdt.md) (`npm run usdt:devnet`). The payer must hold that token and use `signSplTransfer` instead of `signSolTransfer`.

## Parse on the payer

```ts
import { parseMessage } from "@rpay/protocol"

const message = parseMessage(payload) // string from QR / file
if (message.type !== "payment_request") throw new Error("expected payment_request")

console.log(message.recipient, message.amount, message.asset.symbol)
```

## Related

- [signSolTransfer](sdk-sign-sol-transfer.md)  
- [Assets and USDT-DEV](09-tether-usdt.md)
