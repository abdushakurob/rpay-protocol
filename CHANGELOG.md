# Changelog

All notable documented changes to RPay Protocol should be recorded here. Dates refer to documentation releases, not claims about previously shipped application features.

## [Unreleased]

### Added

- `@rpay/protocol` SDK (`packages/sdk`): versioned envelopes, lifecycle helpers, error codes, SOL transfer/verify/submit, legacy QR codecs, and `RPayClient`.
- Wallet integration: `src/protocol/*` and relay submit path consume the SDK.
- RPay Merchant app (`apps/merchant`): payment-request QR, local request history, and on-chain settlement verification via the SDK.
- Wallet can scan merchant `payment_request` envelopes and prefill amount/recipient.
- SPL / USDT path in the SDK (`buildSplTransfer`, verify, balances) with wallet + merchant asset selection.
- Devnet test-mint helper (`npm run usdt:devnet`) and Tether WDK signer path for reference-wallet USDT (`createWdkSigner` + `signTransactionWithWdk`).
- Clear labeling: Devnet mints are `USDT-DEV` unless they match the official mainnet USDT mint.
- Absolute `expiresAt` / `fetchedAt` on `network_context` with live countdown in wallet + relay UI; relays re-check chain height before submit.
- Initial draft protocol documentation: architecture, proposed exchange format, lifecycle, transport, security model, Solana integration, limitations and roadmap.
- Draft improvement-proposal process.

### Notes

The `0.1-draft` protocol designation tracks the SDK and docs together. A stable `1.0` wire standard still requires conformance fixtures and a second independent implementation.
