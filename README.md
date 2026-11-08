# RPay

**One connection. Everyone can transact.**

RPay is a self-custodial wallet for [Solana](https://solana.com) that works when *your* phone does not have internet. You approve the payment on your device; a nearby phone with a connection can relay that signed transfer to the network. When you are online, RPay behaves like a normal devnet wallet—send by username or wallet address in one flow.

| | |
| --- | --- |
| **Live app** | [rpay-seven.vercel.app](https://rpay-seven.vercel.app) |
| **Source** | [github.com/abdushakurob/RPay](https://github.com/abdushakurob/RPay) |
| **Network today** | Solana **Devnet** (test SOL; Mainnet is labeled “coming later” in the app) |
| **Stack** | React 19, TypeScript, Vite, PWA, `@solana/web3.js`, IndexedDB vault |

---

## What problem this solves

On-chain wallets usually assume your device can reach an RPC endpoint. In practice, the payer is often offline while someone else—a friend, shop, or shared hotspot—has signal. RPay separates **authorization** (always on the payer’s phone) from **network access** (optional, on a relay device). The relay never gets your password or keys; it only submits a transfer you already signed.

---

## How it works (high level)

```text
Online send
  You → amount + recipient → Solana devnet → receipt in Activity

Offline send (relay)
  Payer (offline)     Relay (online)        Solana
       │                    │                  │
       ├─ scan relay QR ───►│                  │
       ├─ sign payment      │                  │
       └─ show payment QR ─►├─ verify + submit ─►│
```

1. **Initiate** — Enter amount and recipient (RPay username, saved name, or wallet address).
2. **Connect** — If the payer has no RPC access, they scan the relay device’s short-lived connection QR.
3. **Authorize** — The payer signs the transfer locally. Amount and recipient are fixed in the signed payload.
4. **Settle** — The relay phone submits to devnet. **View receipt** opens the transaction on Solana Explorer.

Usernames are looked up through a small directory service (`alias` → `publicKey` only). Keys and the recovery phrase never leave the device vault.

---

## Try the live app

1. Open [rpay-seven.vercel.app](https://rpay-seven.vercel.app).
2. Choose **Launch RPay** (marketing site) or go straight to **Create** / **Unlock**.
3. Use **Devnet** and **Fund** when you need test SOL (public faucets are often busy; retry or fund manually via explorer if needed).

**Camera and QR:** Browsers only expose the camera on **HTTPS** or **localhost**. Plain `http://` on a LAN IP will not work for scan steps.

---

## Product walkthrough

### Marketing site (`/`)

The landing page explains shared connectivity, the four-step flow, and use cases. **Launch RPay** opens the wallet entry point (create, unlock, or home depending on this device).

### Create a wallet (`/create`)

1. Pick a **username** (3–20 letters or numbers).
2. Set a **password** (8+ characters) to encrypt the vault on this device.
3. Write down the **12-word recovery phrase** and pass the short word check.
4. If you are online, the username is registered in the directory when possible.

The password unlocks this device. The phrase restores the wallet anywhere (see **Unlock** → **Use recovery phrase**).

### Unlock (`/unlock`)

- **Password** — Daily unlock for a wallet already on this device.
- **Recovery phrase** — Restore on a new device or reset the password after verifying the 12 words.

### Wallet home (`/wallet`)

Desktop uses a sidebar; mobile uses bottom tabs. The home screen shows:

- Devnet **SOL balance** (refresh manually).
- **Fund** — Request test SOL from the devnet faucet (may fail when the faucet is saturated).
- **Send** / **Receive** — Payment flows.
- **Relay** — Help another person submit a signed offline payment.
- **Recent activity** — Latest sent, received, and relayed payments.

### Send (`/send`)

| Step | What you do |
| --- | --- |
| Amount | Enter SOL on devnet (keypad + slide to confirm). |
| Recipient | Type `@username` or paste a Solana address; pick a saved name; or scan a receive QR. |
| Review | App checks connectivity. **With internet:** payment submits immediately. **Without:** you scan the relay’s connection QR, then show your signed payment QR. |

### Receive (`/receive`)

Shows your `@username`, a QR containing your identity payload, and a **Copy address** button for your public key.

### Relay (`/relay`)

For the **connected** device (formerly “Help someone pay”):

1. **Connect** — Display a rotating connection QR for the offline sender to scan.
2. **Verify** — Scan the sender’s signed payment QR; review amount and recipient (read-only).
3. **Relay payment** — Submit to devnet and open the explorer receipt.

### Activity (`/activity`)

Lists payments with direction (sent / received / relayed), status, and **View receipt** links when a signature exists.

### Settings (`/settings`)

Username, **Devnet** vs **Mainnet** (mainnet not enabled yet), **Fund from devnet**, and **Lock wallet**.

---

## Run locally

**Requirements:** Node.js 20+ (22 recommended), npm.

```bash
git clone https://github.com/abdushakurob/RPay.git
cd RPay
npm install --legacy-peer-deps
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server + local `/api/directory` (writes `data/directory.json`) |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally (port 4173) |
| `npm test` | Vitest: payment encoding, verification, vault helpers |
| `npm run devnet` | Scripted devnet session (see `scripts/`) |
| `npm run send-devnet` | Send devnet SOL from a wallet derived from `RPAY_PHRASE` |

**Username lookup in dev:** The Vite plugin serves `GET/POST /api/directory`. In production on Vercel, the same route uses Redis when `KV_REST_*` or `UPSTASH_REDIS_*` env vars are set; otherwise GET returns `{}` and POST may return 503— the wallet still works, but global username lookup needs Redis.

---

## Deploy to Vercel

```bash
npm install --legacy-peer-deps
npx vercel link          # once, if not linked
npx vercel deploy --prod
```

1. In the Vercel project, add **Redis** (e.g. Upstash via Marketplace) and link env vars for the directory API.
2. Production URL is assigned by Vercel (this project: [rpay-seven.vercel.app](https://rpay-seven.vercel.app)).

Install on mobile: use **Add to Home Screen**; the PWA manifest is generated at build time.

---

## Verify on devnet

A confirmed transfer from development (signature may vary over time):

[View on Solana Explorer (devnet)](https://explorer.solana.com/tx/2zGjaGop9iUEWTFPoi1FfM9UetG9qfBH8hvpdBrvgKUXMAnkY9JND3ZUpYauRuqzr4R6B4z5stSGeVZPEGMMjUHE?cluster=devnet)

For scripted sends, set `RPAY_PHRASE` (12 words) and optional `RPAY_TO`, `RPAY_SOL`, `RPC_URL`, then run `npm run send-devnet`. Local run artifacts under `data/` are gitignored.

---

## Security notes

- **Self-custody** — Recovery phrase and private key material live in an encrypted IndexedDB vault on your device.
- **Relay trust model** — The relay sees a signed transaction and network metadata, not your password or seed. It cannot change amount or recipient after signing.
- **Devnet only for production UI today** — Do not send real funds until Mainnet is explicitly enabled in the product.

---

## Repository layout

```text
src/
  account/     Vault, session, BIP39 phrase, encryption
  protocol/    QR payloads, signing, verification
  solana/      RPC, balances, online send, devnet funding
  directory/   Username directory client
  screens/     Landing, wallet, send, receive, relay, activity
  ui/          Navigation, keypad, scanner, QR display
api/           Vercel serverless directory (Redis)
scripts/       Node devnet utilities
```

---

## License and contributions

This repository is the reference implementation for the RPay hackathon project. Issues and PRs are welcome on GitHub.
