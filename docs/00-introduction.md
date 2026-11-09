# Introduction

## Purpose

RPay Protocol explores how a device without direct internet access can authorize a Solana payment and rely on a separate connected peer for submission. The goal is connectivity sharing without sharing signing authority.

## Terminology

- **Payer:** Wallet owner authorizing a transfer.
- **Recipient:** Destination account for the transfer.
- **Relay:** Peer that provides network context and broadcasts signed transaction bytes.
- **Authorization:** User approval and cryptographic signing of a specific transaction message.
- **Submission:** Attempt to deliver signed bytes to a Solana RPC endpoint.
- **Confirmation:** Network-observed processing at a specified commitment level.
- **Finalization:** Solana's stronger finalized commitment; distinct from a relay's acknowledgement.
- **Exchange:** The set of messages between payer and relay for one payment attempt.
- **Envelope:** Proposed versioned application-layer wrapper around context, signed bytes or status.

## Scope

The initial use case is a simple Solana transfer on Devnet. The broader idea can apply to other transaction types, but instruction allowlisting, simulation and fee-payer semantics require separate evaluation. A relay is not a settlement network and is not automatically a trusted payment processor.

## Architecture at a glance

1. Connected relay acquires chain context.
2. Payer receives that context through a local transport.
3. Payer constructs and reviews the exact transaction.
4. Payer signs on-device.
5. Relay receives signed bytes and submits them.
6. Participants verify the on-chain result.

## Design invariants

- No signing secret is required by the relay.
- Relays do not alter an already-signed transaction.
- Only a Solana network outcome can establish settlement.
- Expired transactions require renewed authorization.
- Every user-facing status must distinguish local, submitted, confirmed, finalized and failed states.

## Maturity

The repository hosts a Devnet prototype. Documentation under `docs/02-protocol-specification.md` proposes a compatibility contract and must be checked against implementation code before claiming compliance.
