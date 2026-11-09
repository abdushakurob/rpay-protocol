# Transaction Lifecycle

## States

```text
DRAFT -> CONTEXT_READY -> PREPARED -> SIGNED -> TRANSFERRED
                                               |
                                               v
                                           SUBMITTED
                                          /    |    \
                                   CONFIRMED  FAILED  UNKNOWN
                                       |
                                       v
                                   FINALIZED
```

`EXPIRED` may occur if a transaction is not accepted before its blockhash validity window closes. An apparently timed-out submission may still have landed; query the chain before authorizing a replacement.

## Step 1: Obtain context

The connected relay requests a recent blockhash and its `lastValidBlockHeight` from the intended Solana cluster. It passes this context to the payer. The payer checks the cluster and does not treat an untrusted relay's claim of freshness as a guarantee.

## Step 2: Construct

The payer creates a transfer instruction and transaction message, chooses the correct fee payer, and checks all required signatures. The UI displays recipient, asset, amount, transaction instructions and estimated fees. The prototype's precise transaction types must be verified in source before a fixed interoperable instruction set is declared.

## Step 3: Authorize

The payer signs locally. The serialized signed transaction commits to the message including the blockhash and transfer details. No private key or recovery phrase is passed to the relay.

## Step 4: Transport

The payer sends signed bytes through a local transport, initially QR. The relay decodes and validates the payload. An acknowledgement here means only that the relay received bytes.

## Step 5: Submit

The relay sends the exact signed transaction bytes to a Solana RPC endpoint. An RPC submission response typically returns a transaction signature, but this alone is not proof that the transaction executed successfully or reached finality.

## Step 6: Observe

A verifier queries transaction status, including error and commitment information. User-facing states should distinguish `submitted`, `confirmed` and `finalized`. For higher-assurance acceptance, verify finalized status or follow a documented risk policy.

## Step 7: Expiration or uncertainty

A recent-blockhash transaction is bounded by its blockhash validity. Once expired, it cannot be repaired by changing the blockhash in the relay. The payer must construct and sign a replacement. Before replacement, check whether the original signature landed to avoid accidental duplicate payments from two different signed transactions.

## Merchant acceptance rule

**Never release goods solely on QR scan, relay acknowledgement, or signature display.** Require an independently verified chain result at an appropriate commitment level. Offline merchants cannot obtain that assurance until they or a trusted verifier reconnect.

## Example sequence

```text
Payer                    Relay                     Solana
  |                        |                          |
  |<--- fresh context -----|<--- getLatestBlockhash --|
  |                        |                          |
  | construct + inspect    |                          |
  | sign locally           |                          |
  |--- signed bytes ------>|                          |
  |                        |--- sendRawTransaction --->|
  |                        |<--- signature / error ----|
  |<--- relay report ------|                          |
  |                        |--- getSignatureStatuses ->|
  |                        |<--- status + err ---------|
  |<--- observed status ---|                          |
```
