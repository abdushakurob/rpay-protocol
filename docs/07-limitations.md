# Limitations and Assumptions

RPay is an experimental Devnet reference application. The following boundaries should be visible to developers, judges, partners and users.

## Connectivity

The payer can authorize without its own internet connection **after receiving appropriate network context**, but at least one connected participant must reach Solana for settlement. QR transfer is local communication, not offline blockchain consensus.

## Time sensitivity

A conventional Solana transaction's recent blockhash expires. Delays between fetching context, signing, scanning and broadcasting can make a transaction invalid. Expired messages require fresh signing.

## Trust and availability

A relay cannot forge a correctly signed payer transaction, but it can refuse to forward it, delay it, return false status information or inspect its contents. RPay does not guarantee that a relay is honest, available or private.

## Merchant finality

An offline recipient or merchant cannot independently verify settlement without access to a trustworthy source of chain state. A signed QR is an authorization artifact, not a final payment receipt.

## Scope of interoperability

The repository demonstrates a concept, not yet a published, stable, independently implemented wire standard. Proposed message envelopes in `docs/02-protocol-specification.md` must not be advertised as implemented until validated in code and tests.

## Security and readiness

No independent audit or production-hardening claim is made. Devnet testing cannot establish mainnet security. Browser-based key storage has different risks from hardware signing.

## Economic model

There is no necessary RPay token, staking system or relay incentive model in the core concept. Relay compensation, if later introduced, must be separately designed and evaluated for abuse, censorship and fee manipulation.

## Supported payments

Do not assume all Solana instructions, SPL token transfers, sponsored transactions or programmable-payment use cases work merely because native SOL transfer relaying is possible. Each transaction family requires implementation-specific validation.
