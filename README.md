# RPay

RPay is a wallet for paying someone nearby. The person paying can be offline. A nearby phone with internet passes the payment on.

Devnet is on. Mainnet is coming later.

## Try it

```bash
npm install
npm run dev
```

Open the URL Vite prints, or use the deployed HTTPS URL (see **Deploy** below). Cameras need HTTPS or localhost — not plain `http://` on a LAN IP.

## Deploy (Vercel)

```bash
npm install --legacy-peer-deps
npx vercel link
npx vercel deploy --prod
```

In the Vercel project, add a **Redis** storage integration (Marketplace) so `/api/directory` can save names across devices. Until Redis env vars exist, the wallet still works; alias lookup online may be empty.

Confirmed devnet receipt: `data/last-devnet-tx.txt` or [explorer](https://explorer.solana.com/tx/2zGjaGop9iUEWTFPoi1FfM9UetG9qfBH8hvpdBrvgKUXMAnkY9JND3ZUpYauRuqzr4R6B4z5stSGeVZPEGMMjUHE?cluster=devnet).

1. Create an account with a name and a password, then save the 12 words.
2. In Settings, Devnet is selected. Mainnet says it is coming later.
3. Tap **Fund from devnet** or the **Fund** button. That asks devnet for 1 SOL.
4. Send to another RPay name, or paste any wallet address.
5. If this phone is offline, scan the code on a phone that has internet, then show them your code.
6. On the phone with internet, open **Help**, scan that code, and pass the payment on.
7. **View receipt** opens the payment on devnet.

`npm test` checks the payment codes. `npm run devnet` sends 0.01 SOL between two fresh devnet wallets and writes the receipt to `data/last-devnet-tx.txt`.
