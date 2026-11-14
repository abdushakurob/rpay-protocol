# RPay Protocol — Technical Whitepaper

**Subtitle:** Connectivity delegation for non-custodial Solana payments  
**Edition:** Draft 0.1 · November 2026  
**Status:** Research and prototype design; not an audited protocol specification

## Abstract

Blockchain transfers require two separable capabilities: authority to spend and access to a network that can process the transaction. Many wallets bundle both on one device. RPay proposes a connectivity-delegation pattern in which an offline payer signs a transaction locally and an online peer broadcasts it. The peer provides communication, not spending authority. Solana remains the settlement system. The prototype uses QR codes and Solana Devnet. This paper describes the problem, mechanism, security boundaries, implementation challenges, and steps necessary to turn a working Devnet implementation into an interoperable protocol.

## 1. Problem statement

In intermittent-connectivity environments, a payer may possess valid signing keys and sufficient funds yet be unable to reach a blockchain RPC endpoint. Conventional online wallet flows make connectivity a precondition of payment initiation. Shared connectivity can reduce this dependency, provided that the connected intermediary cannot change what the payer authorized or obtain signing secrets.

The problem is **access to transaction submission**, not creation of an alternative consensus or settlement system. The network still needs to be reachable by at least one participant, and the payer must receive fresh chain context to construct an expiring Solana transaction.

## 2. Design objectives

- Enable local authorization on a payer device without direct internet access.
- Let an independent connected peer broadcast an already-authorized transaction.
- Keep recovery phrases and private keys outside relay messages.
- Make submitted bytes and transaction outcomes inspectable and verifiable.
- Support intermittent connectivity without misrepresenting pending payments as final.
- Define a transport-agnostic exchange that could later work over QR, Bluetooth or local networking.

Non-goals include offline consensus, offline finality, guaranteed relay availability, irreversible point-of-sale acceptance without chain verification, and a native RPay token.

## 3. Participants and assumptions

**Payer:** Controls a Solana signing key, selects payment details, and approves a transaction locally.  
**Relay:** Has access to a Solana RPC endpoint, supplies fresh network context, accepts signed bytes, and attempts submission.  
**Recipient:** Controls the destination address; need not participate in transaction submission.  
**Solana network:** Verifies signatures, enforces transaction semantics and determines settlement.

Assumptions: the payer's signing environment is not compromised; the payer can verify the intended recipient and amount; the relay has network access at submission time; the transaction is valid and sufficiently fresh; and the underlying Solana network and RPC services behave according to their published semantics.

## 4. Mechanism

### 4.1 Context acquisition

A connected relay obtains a recent blockhash and associated validity information from Solana and conveys it to the payer. The payer must not treat relay-supplied data as intrinsically trustworthy: the relay can provide stale or incorrect context, leading to failure. The client should validate format, cluster identity, and freshness where possible.

### 4.2 Local construction and signing

The payer creates the transfer instruction and transaction message, checks recipient, amount, fee payer, recent blockhash and any additional instructions, then signs locally. The signed message cryptographically commits to its included fields. A relay cannot replace the blockhash, destination, or amount without invalidating the relevant signature.

### 4.3 Transfer and submission

The payer transfers the serialized signed transaction to the relay, initially by QR. The relay validates the envelope and submits the transaction to Solana. The relay may return a transaction signature and a network-observed status. Neither a relay acknowledgement nor a transaction signature alone establishes finality.

### 4.4 Verification

A connected participant independently checks transaction status and error fields using a trusted RPC source. A recipient who is offline can inspect the updated chain state after reconnecting. If validity expires before inclusion, the payer must obtain new context and **sign a new transaction**; the relay cannot repair the expired signed message.

## 5. Security properties

RPay's non-custodial property follows from a narrow claim: the relay is never given signing authority and cannot forge the payer's signature. This does not prevent the relay from censoring, delaying, duplicating submission attempts, observing transaction details, or misleading the payer about the result. A compromised payer interface can still trick a user into authorizing a malicious transaction. A signed transaction must therefore be reviewed before signing and independently verified after submission.

## 6. Why Solana

Solana provides signature-verified transaction processing and relatively low-cost transfer operations, making it a suitable network for experimenting with connectivity delegation. Its recent-blockhash validity model creates a real constraint for disconnected signing: the payer must sign using a valid blockhash and the transaction must reach the network within its validity window. Durable nonce transactions are a distinct mechanism with additional account and authorization considerations; they are not assumed by the current prototype.

## 7. Protocol boundaries

RPay is currently an **application-layer coordination pattern**. It does not require a new Solana program for a basic signed SOL transfer and does not alter Solana consensus. An interoperable RPay protocol would additionally require stable message schemas, version negotiation, transport framing, relay error codes, conformance tests and a documented compatibility policy. Those are design work, not accomplished merely by naming the project a protocol.

## 8. Threats and trade-offs

A connected relay is an availability dependency and a potential privacy observer. QR transfer exposes transaction data to anyone able to scan the code. Malicious network context can cause denial of service. Phishing, malicious recipient addresses, transaction simulation differences, fee changes and weak key storage remain risks. The architecture reduces one dependency—payer-side internet access—while introducing a relay exchange and associated user-experience and security costs.

## 9. Adoption scenarios

Candidate settings include market stalls with a shared connected phone, intermittent-connectivity community payments, event environments and educational Devnet pilots. These are hypotheses requiring field testing. The system must not advertise an unconfirmed transfer as a completed merchant payment; goods release should be tied to independently verified settlement and an explicit risk policy.

## 10. Development direction

The path from prototype to protocol requires: verified reference behavior; normative wire format; cross-implementation compatibility tests; security review; resilient relay discovery; transport alternatives; and controlled real-world pilots. Mainnet deployment should follow, not precede, those gates.

## 11. Conclusion

RPay's core contribution is a clean division of responsibility: **the payer authorizes, the relay connects, and Solana settles**. This division may broaden access to blockchain payment submission where connectivity is uneven, without granting an intermediary custody. Its limits—transaction expiry, relay availability and settlement verification—are part of the design, not details to conceal.

## References

- [Solana transaction documentation](https://solana.com/docs/core/transactions)
- [Solana confirmation and expiration guidance](https://solana.com/developers/guides/advanced/confirmation)
- [RPay source repository](https://github.com/abdushakurob/rpay-protocol)
