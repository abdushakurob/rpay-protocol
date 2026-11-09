# Architecture

## Layers

**Authorization layer:** Payer UI, wallet/key storage, transaction builder and local signer. This is the only layer allowed to use the payer's private signing key.

**Exchange layer:** A local channel, initially QR, that carries chain context toward the payer and signed transaction bytes toward the relay. It must preserve payload integrity and reject malformed or mismatched exchanges.

**Connectivity layer:** The relay, which fetches chain context, accepts signed transactions, submits to RPC and reports observed outcomes.

**Settlement layer:** Solana, which validates the transaction and updates on-chain state.

## Trust boundaries

```text
+------------------------+     untrusted exchange     +-----------------------+
| PAYER DEVICE           | <-----------------------> | RELAY DEVICE          |
| key material           |                            | internet access       |
| transaction review     |                            | RPC client            |
| local signature        |                            | no payer secret       |
+------------------------+                            +-----------+-----------+
                                                                 |
                                                            untrusted RPC
                                                                 |
                                                                 v
                                                        +------------------+
                                                        | SOLANA NETWORK   |
                                                        +------------------+
```

The exchange and relay are untrusted. Signature verification protects message integrity, but does not guarantee delivery, privacy or truthful relay status reporting. RPC endpoints may disagree temporarily; commitment and block-height checks are needed for meaningful status.

## Data ownership

Payer device holds private keys and local wallet metadata. The relay only needs public addresses, signed transaction bytes and exchange metadata required for submission. Sensitive wallet recovery information must never be serialized into exchange messages or relay logs.

## Typical flow

```text
Relay -> Payer: context (cluster, blockhash, validity data)
Payer -> Payer: review and sign transfer
Payer -> Relay: signed transaction bytes
Relay -> Solana: sendRawTransaction(...)
Solana -> Relay: transaction signature / RPC response
Relay -> Payer: observed submission status
Verifier -> Solana: query confirmation independently
```

## Failure domains

- **Payer failure:** Key unavailable, rejected signature, malformed transfer, or expired context.
- **Exchange failure:** Unreadable QR, truncated payload, stale session or replayed envelope.
- **Relay failure:** Offline, malicious, overloaded or incorrectly configured RPC endpoint.
- **Chain failure:** Invalid signature, insufficient funds, fees, blockhash expiration or transaction execution error.
- **Verification failure:** No independent connection, misleading relay status or premature assumption of finality.

## Extensibility

A future relay network could support Bluetooth, local Wi-Fi or NFC without changing the fundamental authorization model. However, interoperable transport negotiation and relay discovery are not established features of the current prototype.
