# Security Model

**Status:** Design analysis; not an independent security audit.

## Assets to protect

Private signing keys, recovery phrases, intended recipient and amount, transaction integrity, transaction outcome, user privacy and availability of submission.

## Adversaries

A malicious relay can supply stale context, refuse service, delay submission, return fabricated status, observe payment details or replay already-signed bytes. A malicious QR presenter can inject unexpected context or payment instructions. A compromised payer app or device can alter the displayed recipient or exfiltrate keys. A malicious RPC endpoint can return misleading information or censor submission.

## Guarantees and non-guarantees

| Property | Status |
| --- | --- |
| Relay cannot forge payer signature without key | Guaranteed by signature security, assuming uncompromised keys and correct implementation |
| Relay cannot modify signed message fields undetectably | Enforced by signature validation |
| Relay cannot see transaction metadata | **Not guaranteed** |
| Relay must submit promptly | **Not guaranteed** |
| Relay report proves settlement | **False** |
| Payer can sign without internet after receiving fresh context | Possible within blockhash validity and transaction requirements |
| Entire payment settles offline | **False** |

## Threats and mitigations

### Malicious or stale blockhash

**Impact:** Failed or expired transactions. **Mitigation:** Cluster validation, freshness checks, short exchange time, and explicit expiry reporting. Do not assume a relay's block-height claims are independently verified.

### Transaction substitution

**Impact:** Signing an unintended payment. **Mitigation:** Render and inspect decoded transaction instructions, recipient, amount, fee payer and cluster before signing; never trust QR-supplied display strings alone.

### Key compromise

**Impact:** Unauthorized spending. **Mitigation:** Keep secrets on the payer device, encrypt local storage, use strong key-derivation parameters, restrict logging, and prefer audited signing environments where available. A password-protected browser vault does not automatically provide hardware-wallet-grade security.

### False settlement acknowledgement

**Impact:** Merchant delivers goods without payment. **Mitigation:** Independently verify the signature, status error and commitment through a trusted RPC endpoint before acceptance.

### Withholding and censorship

**Impact:** Payer believes a payment was attempted but it never reaches Solana. **Mitigation:** Permit alternative relays, show unresolved states and check the chain before replacement. Availability cannot be cryptographically guaranteed by the signed transaction alone.

### Duplicate payment from retries

**Impact:** Payer signs a second distinct transfer while the first is pending. **Mitigation:** Track the original signature and validity window; do not automatically create replacement transactions without status checks and renewed user consent.

### Privacy leakage

**Impact:** Relay or observer learns addresses and payment metadata. **Mitigation:** Limit envelope metadata, avoid analytics tied to wallet addresses, redact logs and clearly disclose that ordinary Solana transactions are publicly observable.

## Security release gate

Before mainnet: complete threat-model review, independent audit of signing and vault code, negative-path testing, test vectors, dependency review, confirmation/expiration correctness tests, and clear incident-response procedures.

## Reporting vulnerabilities

See the repository root [SECURITY.md](../SECURITY.md). Do not post exploit details or user secrets in public issues.
