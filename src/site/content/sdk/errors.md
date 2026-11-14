# Errors

Methods throw `ProtocolError` when something fails hard. The class has `code` (stable string), `message`, and optional `details`.

```ts
import { ProtocolError, ProtocolErrorCode, isUnsafeToRetry } from "@rpay/protocol"
```

## Catch pattern

```ts
try {
  await client.relaySubmit({
    serialized,
    blockhash: context.recentBlockhash,
    lastValidBlockHeight: context.lastValidBlockHeight,
  })
} catch (err) {
  if (!(err instanceof ProtocolError)) throw err

  if (err.code === ProtocolErrorCode.BLOCKHASH_EXPIRED) {
    const context = await client.fetchNetworkContext()
    // payer must sign again with context.recentBlockhash
    return
  }

  if (err.code === ProtocolErrorCode.SUBMISSION_REJECTED) {
    console.error(err.message, err.details)
    return
  }

  if (isUnsafeToRetry(err.code)) {
    const signature = (err.details as { signature?: string } | undefined)?.signature
    if (signature) {
      const state = await client.verifySettlement(signature)
      console.log("possible in-flight tx", signature, state)
    }
    return
  }

  throw err
}
```

## Codes

| Code | Thrown by | Meaning | Recovery |
| --- | --- | --- | --- |
| `RPC_UNAVAILABLE` | `fetchNetworkContext` | Blockhash/height RPC failed | Check URL / network; retry |
| `BLOCKHASH_EXPIRED` | `assertContextStillValid` | Stamp no longer valid | New `fetchNetworkContext` + re-sign |
| `SUBMISSION_REJECTED` | `relaySubmit` | `sendRawTransaction` failed | Fix funds, tx shape, or RPC; read `details` |
| `UNKNOWN_OUTCOME` | `relaySubmit` | Sent but confirm unclear | `details.signature` → `verifySettlement` / explorer before a second pay |
| `CONFIRMATION_TIMEOUT` | reserved | Same retry caution as unknown | `isUnsafeToRetry` is true |
| `INVALID_TRANSACTION` | decode / package helpers | Bad bytes or wrong message type | Re-scan / re-sign |
| `INVALID_PAYMENT_REQUEST` | `createPaymentRequest` | Empty recipient or bad amount | Fix inputs |
| `INVALID_CONTEXT` | `createNetworkContext` | Missing blockhash/height fields | Fix inputs |
| `MALFORMED_ENVELOPE` | `parseMessage` | Not valid RPay JSON | Check transport payload |
| `UNSUPPORTED_VERSION` | `parseMessage` | `version` ≠ `0.1-draft` | Upgrade SDK or sender |
| `WRONG_CLUSTER` | `parseMessage` | Cluster not supported | Align client + message cluster |
| `INVALID_SIGNATURE` | reserved | Signature verification failed | Reject payload |

## `isUnsafeToRetry`

```ts
isUnsafeToRetry(code)
// true for UNKNOWN_OUTCOME | CONFIRMATION_TIMEOUT
```

When true, a second signed payment for the same order can double-charge if the first tx later lands. Always resolve the signature first.

## `protocol_error` messages

Hosts can also put failures on the wire as JSON envelopes with `type: "protocol_error"` (`code` + `message`). Those are for cross-device signaling (e.g. show an error QR). `RPayClient` methods throw `ProtocolError` in-process; they do not auto-emit those envelopes.
