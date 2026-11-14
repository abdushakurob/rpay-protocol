# Tether USDT and WDK Integration

**Status:** Implemented for Solana Devnet with a labeled test mint path; official USDT mint identity is defined for mainnet-beta. Reference wallet USDT signing goes through Tether WDK.

## Goals

- Support stablecoin payment requests through the same RPay authorization → relay → settlement model used for SOL.
- Keep signing noncustodial.
- Use Tether WDK for USDT authorization in the reference wallet (sponsor track requirement). Protocol core still exposes a structural WDK adapter so hosts can plug in their own account.

## Assets

| Environment | Mint source | Symbol shown |
| --- | --- | --- |
| Devnet | `VITE_USDT_MINT` (create via `npm run usdt:devnet`) | `USDT-DEV` |
| Mainnet-beta | Official mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` (`USDT_MAINNET_MINT`) | `USDT` |

Do **not** present a custom Devnet mint as official Tether USDT.

## Protocol surface

- `payment_request.asset.kind = "spl_token"` with `mint`, `symbol`, `decimals`
- SPL transfers use `transferChecked` and may include idempotent destination ATA creation
- Relays still submit exact signed bytes; merchants verify on-chain token transfers independently
- Network context QR includes `expiresAt` / `fetchedAt` so payers countdown from absolute time; relays re-check chain height before submit

## WDK path (reference wallet)

```ts
import { createWdkSigner } from "@rpay/protocol"
// Host installs @tetherto/wdk-wallet-solana and supplies an account:
const signer = await createWdkSigner(wdkAccount)
await client.signWithSigner({ signer, transaction })
```

In this repo’s wallet app, USDT transfers are prepared with `@rpay/protocol` (`prepareSplTransfer`) and signed with `@tetherto/wdk-wallet-solana` (`signTransactionWithWdk`). SOL can still use the local Keypair path. The SDK package does not hard-depend on WDK at runtime — hosts install it.

## Devnet checklist

1. Create Devnet mint and fund a payer ATA (`$env:RPAY_PHRASE="…" ; npm run usdt:devnet -- <PUBKEY>` — uses your funded wallet; public RPC airdrops are closed).
2. Set `VITE_USDT_MINT` for wallet and merchant.
3. Optional faucet UI: set server-only `FAUCET_PHRASE` to the **mint authority** wallet (same phrase that created the mint) in `.env.local` / Vercel env. Users tap **Request USDT-DEV** → `POST /api/usdt-faucet` mints test tokens to their address (30m cooldown). Never expose `FAUCET_PHRASE` as `VITE_*`.
4. Merchant creates a USDT/USDT-DEV request QR.
5. Wallet scans the request, signs locally (online or offline relay with connection-code expiry countdown).
6. Merchant verifies the token transfer on Solana Devnet / Explorer.
