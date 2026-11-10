# RPay Protocol Specification

**Status:** Proposed draft, version `0.1-draft`. This is a design contract, **not** a claim that the current application implements the schema below.

## 1. Conformance language

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** indicate requirements for a future conforming implementation. Until an implementation and conformance suite are published, this specification is provisional.

## 2. Roles

A **payer** authorizes a Solana transaction with a local signing key. A **relay** supplies connectivity and submits the signed transaction. A **verifier** checks on-chain status. A recipient may be any valid destination account.

## 3. Protocol invariants

1. A relay MUST NOT request or accept a payer's seed phrase or private key as part of a payment exchange.
2. A payer MUST display the destination, amount, fee payer and material instructions before signing.
3. A relay MUST submit the signed bytes without rewriting signed message fields.
4. A client MUST NOT treat a relay's receipt acknowledgement as settlement.
5. A new transaction message, including a replacement blockhash, MUST be signed again by the relevant signer(s).
6. Clients MUST reject unexpected cluster, unsupported protocol version and malformed serialized transactions.

## 4. Proposed exchange messages

All JSON below is **illustrative**, not an existing stable wire format. A final specification must choose canonical serialization, exact encodings, size limits, QR framing and test vectors.

### 4.1 Context response

```json
{
  "protocol": "rpay",
  "version": "0.1-draft",
  "type": "network_context",
  "exchangeId": "opaque-random-id",
  "cluster": "devnet",
  "recentBlockhash": "base58-blockhash",
  "lastValidBlockHeight": 123456,
  "feePayer": "base58-public-key"
}
```

The payer MUST verify that `cluster` matches its intended network. `lastValidBlockHeight` is a validity indicator associated with the fetched blockhash, not a timestamp. The payer SHOULD minimize delay before signing and relaying.

### 4.2 Signed transaction

```json
{
  "protocol": "rpay",
  "version": "0.1-draft",
  "type": "signed_transaction",
  "exchangeId": "opaque-random-id",
  "cluster": "devnet",
  "transactionEncoding": "base64",
  "transaction": "BASE64_SERIALIZED_SIGNED_SOLANA_TRANSACTION"
}
```

A relay MUST validate decoding and supported transaction format before submission. It SHOULD reject unexpected unsigned or partially signed transactions where full signatures are required.

### 4.3 Status response

```json
{
  "protocol": "rpay",
  "version": "0.1-draft",
  "type": "submission_status",
  "exchangeId": "opaque-random-id",
  "signature": "base58-transaction-signature",
  "state": "submitted",
  "observedCommitment": null,
  "error": null
}
```

Permitted conceptual states: `prepared`, `signed`, `transferred`, `submitted`, `confirmed`, `finalized`, `failed`, `expired`, `unknown`. Status fields are **claims made by the sender of the status message** until independently verified against the chain.

## 5. Exchange identification

`exchangeId` links context, transaction and status within a local interaction. It MUST NOT be treated as a blockchain replay-prevention primitive. Solana transaction semantics, signatures and blockhash validity govern actual on-chain processing.

## 6. Replay and idempotency

A relay MAY receive the same signed transaction more than once. It SHOULD deduplicate local submission attempts by transaction signature, but a duplicate relay submission is not equivalent to a second distinct authorized payment. The payer MUST NOT automatically sign a fresh transaction solely because the relay response is missing: first inspect the original transaction's chain status and expiry.

## 7. Versioning

Clients MUST reject unknown major versions once stable versioning exists. Before a stable `1.0` release, wire formats and state semantics may change. Implementers SHOULD pin a documented revision and use shared conformance fixtures.

## 8. Error handling

Recommended error categories: `UNSUPPORTED_VERSION`, `WRONG_CLUSTER`, `INVALID_CONTEXT`, `INVALID_TRANSACTION`, `INVALID_SIGNATURE`, `RPC_UNAVAILABLE`, `BLOCKHASH_EXPIRED`, `SUBMISSION_REJECTED`, `CONFIRMATION_TIMEOUT`, and `UNKNOWN_OUTCOME`. An `UNKNOWN_OUTCOME` is not a safe instruction to send a second payment.

## 9. Compatibility status

This document describes **proposed protocol-level behavior**. Before advertising RPay interoperability, publish: canonical payload schemas, byte-level examples, signing fixtures, QR chunking rules, implementation mappings and tests demonstrating two independent implementations can exchange a payment.
