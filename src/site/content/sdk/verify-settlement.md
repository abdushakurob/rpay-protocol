# verifySettlement

Looks up a transaction signature on your RPC (`getSignatureStatuses`) and maps it to a short status string. Use this after [`relaySubmit`](sdk-relay-submit.md), or anytime you have a signature and want to know if the payment landed.

## What you need

| Input | How you get it |
| --- | --- |
| `client` | [`RPayClient`](sdk-client.md) on the same cluster as the payment |
| `signature` | `submitted.signature` from `relaySubmit`, or from `UNKNOWN_OUTCOME` error `details`, or pasted from [Solana Explorer](https://explorer.solana.com/?cluster=devnet) |

No private keys required.

## Call

```ts
const state = await client.verifySettlement(submitted.signature)
console.log(state)
// "submitted" | "confirmed" | "finalized" | "failed" | "unknown"
```

## Signature

```ts
verifySettlement(signature: string): Promise<
  "submitted" | "confirmed" | "finalized" | "failed" | "unknown"
>
```

## How RPC maps to the return value

| RPC observation | Returned |
| --- | --- |
| No status yet | `"unknown"` |
| `err` present | `"failed"` |
| `confirmationStatus === "processed"` | `"submitted"` |
| `"confirmed"` | `"confirmed"` |
| `"finalized"` | `"finalized"` |
| RPC threw | `"unknown"` |

This method does **not** throw for “not found yet” — it returns `"unknown"`. Keep polling if you expect a confirmation.

## Treat as paid

```ts
import { isSettledState, labelForState } from "@rpay/protocol"

const state = await client.verifySettlement(signature)

if (isSettledState(state)) {
  // true only for "confirmed" or "finalized"
}

console.log(labelForState(state)) // short UI label
```

`isPreSettlementState` covers local/transport states that must not be shown as success.

## Poll until done

```ts
async function waitForSettlement(signature: string, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    const state = await client.verifySettlement(signature)
    if (state === "confirmed" || state === "finalized" || state === "failed") {
      return state
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return "unknown" as const
}

const state = await waitForSettlement(submitted.signature)
console.log(
  state,
  `https://explorer.solana.com/tx/${submitted.signature}?cluster=devnet`,
)
```

## After `UNKNOWN_OUTCOME`

If `relaySubmit` threw `UNKNOWN_OUTCOME`, the transaction may already be in flight. Read `signature` from `error.details` and poll as above before building a second payment for the same order. Details in [Errors](sdk-errors.md).

## Related

- [relaySubmit](sdk-relay-submit.md)  
- [Payment lifecycle](03-transaction-lifecycle.md)
