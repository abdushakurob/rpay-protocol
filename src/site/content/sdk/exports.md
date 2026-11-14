# Package exports

All of these import from `@rpay/protocol`. Day-to-day payment flow uses the first block; the rest are helpers.

```ts
import {
  RPayClient,
  serializeMessage,
  parseMessage,
  ProtocolError,
  ProtocolErrorCode,
  NATIVE_SOL,
  PROTOCOL_VERSION,
} from "@rpay/protocol"
```

## Client

| Export | Description |
| --- | --- |
| `RPayClient` | Main API — context, request, sign, submit, verify |
| `RPayClientOptions` | `{ connection, cluster? }` |

## Messages

| Export | Description |
| --- | --- |
| `serializeMessage` / `parseMessage` / `validateMessage` | JSON envelope encode/decode |
| `createNetworkContext` | Build a context object without calling RPC (tests / advanced) |
| `createPaymentRequest` | Same fields as the client helper, without an instance |
| `createSignedTransactionMessage` | Wrap base64 tx bytes in an envelope |
| `createSubmissionStatus` | Build a status envelope |
| `statusIsClaimOnly` | Helper when interpreting status messages |
| Types | `NetworkContextMessage`, `PaymentRequestMessage`, `SignedTransactionMessage`, `SubmissionStatusMessage`, `SettlementReceiptMessage`, `ProtocolMessage`, `AssetDescriptor`, … |

## Assets

| Export | Description |
| --- | --- |
| `NATIVE_SOL` | SOL asset descriptor (`decimals: 9`) |
| `USDT_MAINNET_MINT` | Official Tether mint on mainnet-beta |
| `usdtAsset` / `resolveUsdtAsset` / `isOfficialUsdtMint` | Build / resolve USDT or Devnet test mint descriptors |
| `parseTokenAmount` / `formatAmount` / `formatTokenAmount` | Decimal string ↔ raw amount |

For creating a Devnet test mint, see [Assets and USDT-DEV](09-tether-usdt.md) — not required for SOL Quickstart.

## Signing

| Export | Description |
| --- | --- |
| `createKeypairSigner` | Wrap a `Keypair` as `ProtocolSigner` |
| `createWdkSigner` | Wrap a Tether WDK Solana account (`@tetherto/wdk-wallet-solana` stays in your app) |
| `buildSolTransfer` / `buildSplTransfer` | Unsigned transaction builders |
| `signSplTransfer` | Sign SPL transfer with a `Keypair` (also on the client) |
| `associatedTokenAddress` / `readTokenBalance` | ATA address + balance |
| `verifyTransfer` / `verifySplTransfer` | Local verification helpers |

## Submit / observe

| Export | Description |
| --- | --- |
| `submitSignedTransaction` | Low-level send + optional confirm (used by `relaySubmit`) |
| `observeSignature` | Same status mapping as `verifySettlement` |
| `SubmitResult` | `{ signature, state }` type |

## Transport

| Export | Description |
| --- | --- |
| `toBase64` / `fromBase64` / `toBase64Url` / `fromBase64Url` | Byte encoding |
| `createExchangeId` | Random correlation id |
| `encodeSignedTx` / `decodeSignedTx` / `encodeBlockhash` / `decodeBlockhash` / … | Legacy compact QR codecs |
| `isLegacyQrPayload` | Detect legacy vs JSON |

## Lifecycle & expiry

| Export | Description |
| --- | --- |
| `canTransition` / `assertTransition` | Conceptual state machine |
| `isSettledState` / `isPreSettlementState` / `labelForState` | UI helpers (`isSettledState` ⇒ confirmed \| finalized) |
| `getExpirySnapshot` / `formatRemaining` / `formatExpiryClock` / `isContextExpired` / `deriveExpiresAt` | Context timers |
| `SOLANA_SLOT_MS` | `400` |

## Errors & version

| Export | Description |
| --- | --- |
| `ProtocolError` / `ProtocolErrorCode` / `isUnsafeToRetry` | See [Errors](sdk-errors.md) |
| `PROTOCOL_ID` / `PROTOCOL_VERSION` / `DEFAULT_CLUSTER` / `SUPPORTED_CLUSTERS` | Constants (`PROTOCOL_VERSION` is `0.1-draft`) |
