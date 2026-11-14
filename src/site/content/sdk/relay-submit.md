# relaySubmit

Sends signed transaction bytes to Solana with `sendRawTransaction`. By default it also waits until the transaction is `"confirmed"` (or fails) within the blockhash validity window.

## What you need

| Input | How you get it |
| --- | --- |
| `serialized` | `signed.transaction.serialize()` after [`signSolTransfer`](sdk-sign-sol-transfer.md), or decode `messageJson` with `decodeSignedTransactionBytes` then `.serialize()` |
| `blockhash` | Same `context.recentBlockhash` the payer signed with |
| `lastValidBlockHeight` | From the same [`fetchNetworkContext`](sdk-fetch-network-context.md) result |
| Online RPC | This call requires network — it is the “relay” step |

If context may be stale (payer signed offline a while ago):

```ts
await client.assertContextStillValid(context)
// throws BLOCKHASH_EXPIRED → new context + new signature required
```

## Call

```ts
const submitted = await client.relaySubmit({
  serialized: signed.transaction.serialize(),
  blockhash: context.recentBlockhash,
  lastValidBlockHeight: context.lastValidBlockHeight,
  exchangeId: context.exchangeId,
})

console.log(submitted.signature, submitted.state)
console.log(
  `https://explorer.solana.com/tx/${submitted.signature}?cluster=devnet`,
)
```

## Signature

```ts
relaySubmit(options: {
  serialized: Uint8Array
  blockhash: string
  lastValidBlockHeight: number
  exchangeId?: string
  confirm?: boolean
}): Promise<SubmitResult & { statusMessage: SubmissionStatusMessage }>
```

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `serialized` | `Uint8Array` | — | Exact signed bytes |
| `blockhash` | `string` | — | Blockhash used at sign time |
| `lastValidBlockHeight` | `number` | — | From network context |
| `exchangeId` | `string` | — | Copied into `statusMessage` |
| `confirm` | `boolean` | `true` | `true`: wait for `"confirmed"`. `false`: return after send with `state: "submitted"` |

The method does not modify instruction data or signatures.

## Return value

| Field | Description |
| --- | --- |
| `signature` | Base58 transaction id |
| `state` | `"submitted" \| "confirmed" \| "finalized" \| "failed" \| "unknown"` for this call |
| `statusMessage` | Protocol `submission_status` envelope (signature, state, observedCommitment) |

With `confirm: true` (default):

| Outcome | Result |
| --- | --- |
| Chain reports err | `{ state: "failed", signature }` |
| Confirmed OK | `{ state: "confirmed", signature }` |
| Send OK but confirm unclear / timed out | throws `UNKNOWN_OUTCOME` — `details` often has `{ signature }` |

With `confirm: false`, poll [`verifySettlement`](sdk-verify-settlement.md) yourself.

## From a scanned QR

```ts
const tx = client.decodeSignedTransactionBytes(scannedString)
const submitted = await client.relaySubmit({
  serialized: tx.serialize(),
  blockhash: context.recentBlockhash,
  lastValidBlockHeight: context.lastValidBlockHeight,
})
```

You still need the matching network context (second QR, or same process as the Quickstart).

## Errors

| Code | Meaning | What to do |
| --- | --- | --- |
| `SUBMISSION_REJECTED` | RPC rejected `sendRawTransaction` | Read `err.message`; fix tx / funds / RPC |
| `UNKNOWN_OUTCOME` | Likely sent; confirm failed | Take `signature` from `err.details`, call `verifySettlement` or open explorer — do not sign a second payment yet |

```ts
import { ProtocolError, isUnsafeToRetry } from "@rpay/protocol"

try {
  await client.relaySubmit({ /* … */ })
} catch (err) {
  if (err instanceof ProtocolError && isUnsafeToRetry(err.code)) {
    const signature = (err.details as { signature?: string } | undefined)?.signature
    if (signature) {
      const state = await client.verifySettlement(signature)
      console.log(state, `https://explorer.solana.com/tx/${signature}?cluster=devnet`)
    }
  }
  throw err
}
```

## Related

- [verifySettlement](sdk-verify-settlement.md)  
- [Errors](sdk-errors.md)
