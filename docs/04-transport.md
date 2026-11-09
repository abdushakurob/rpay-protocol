# Transport and Message Exchange

## Purpose

The transport moves public network context and signed transaction bytes between a payer and a connected relay. It must not carry wallet recovery phrases or signing secrets.

## Prototype transport: QR

QR codes are convenient because camera-based exchange can work without pairing or internet on the payer device. Their practical capacity depends on error correction, scanner quality, display size and encoded data length. Serialized Solana transactions can be large; an interoperable protocol must specify maximum payload size, framing and optional chunking.

## Proposed transport envelope

A future stable envelope should include protocol identifier, version, message type, exchange identifier, target cluster, encoding and payload. It should also define byte-length limits, checksum or integrity checks for transport corruption, and expiry rules for exchange sessions.

**Do not confuse a transport checksum with authentication.** Only Solana signatures authenticate transaction authorization; relay-provided context and status messages may require additional authentication if the application claims their origin is trusted.

## QR sequence

1. Relay displays network context.
2. Payer scans and validates context.
3. Payer signs the reviewed transaction.
4. Payer displays encoded signed transaction.
5. Relay scans and submits it.
6. Relay optionally displays a status or signature for the payer to scan.

## Error handling

Reject invalid encodings, unsupported versions, incorrect clusters, unexpected message types, excessive payload sizes and mismatched exchange IDs. Do not silently interpret arbitrary QR content as a payment request. Never execute a transaction or sign a message merely because a QR code was scanned.

## Future transports

Bluetooth LE, local Wi-Fi and NFC may carry the same logical messages if their framing and security properties are specified. These are future possibilities, not implemented capabilities established by this documentation.

## Privacy

A signed transaction can expose payer and recipient addresses, amount and instructions. QR codes can be photographed or rescanned. Minimize additional metadata and avoid logging full payloads by default.
