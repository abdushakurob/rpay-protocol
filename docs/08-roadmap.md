# Roadmap

This is a proposed technical roadmap, not a promise of dates or shipping commitments.

## Phase 0 — Demonstrate the mechanism

- [x] Establish the Devnet reference-application concept.
- [x] Document the local-signing and connected-relay architecture.
- [ ] Audit the current code paths and publish an implementation inventory.
- [ ] Verify that the application handles expiry and ambiguous submission outcomes correctly.

## Phase 1 — Specify interoperability

- [ ] Freeze canonical message envelope and binary/JSON encodings.
- [ ] Publish byte-level transaction and QR test vectors.
- [ ] Define session identifiers, QR chunking and error codes.
- [ ] Add protocol-version negotiation and compatibility policy.
- [ ] Build a reference relay CLI independent of the UI.

## Phase 2 — Harden security

- [ ] Perform signing, vault and transport threat-model review.
- [ ] Add malformed-payload, replay, stale-blockhash and wrong-cluster tests.
- [ ] Add independent on-chain status verification.
- [ ] Review dependencies and commission an independent audit.

## Phase 3 — Validate real-world operation

- [ ] Test poor camera, low-end phone and intermittent-connectivity conditions.
- [ ] Measure exchange time, QR scan success and transaction-expiry rate.
- [ ] Test multiple relays and fallback routing.
- [ ] Conduct consent-based user research with merchants and payers.

## Phase 4 — Expand transports and integrations

- [ ] Evaluate Bluetooth LE and local Wi-Fi transport adapters.
- [ ] Define relay discovery and optional fee sponsorship safely.
- [ ] Assess SPL token transfers and wallet integrations.
- [ ] Publish independent implementation conformance results.

## Phase 5 — Mainnet readiness review

Proceed only after security review, verified confirmation semantics, recovery flows, clear risk disclosures and sustained operational testing. A Devnet demo is not sufficient grounds for mainnet launch.

## Success metrics

Measure successful submissions, independently confirmed settlements, median time from context exchange to submission, expiry rate, retry-related duplicate-payment incidents, and percentage of users able to complete the flow without direct internet.
