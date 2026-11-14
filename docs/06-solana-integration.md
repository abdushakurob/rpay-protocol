# Solana Integration

## Scope

RPay currently targets Solana Devnet and uses the `@solana/web3.js` ecosystem. The relay pattern does not require a new on-chain program for a basic native SOL transfer.

## Recent blockhashes

Solana transactions normally include a recent blockhash. The connected participant can obtain it using `getLatestBlockhash`, which returns a `blockhash` and `lastValidBlockHeight`. The payer must sign a transaction message that includes the selected blockhash. The transaction must be processed before its validity expires. RPay also publishes wall-clock `expiresAt` / `fetchedAt` on `network_context` (derived from remaining slots × ~400ms) so scanners can countdown; relays still re-check block height before `sendRawTransaction`.

**Critical:** A relay cannot take a fully signed transaction, insert a different blockhash and retain a valid payer signature. Any message mutation requires a new signature from each affected required signer.

## Fee payer

The transaction message specifies a fee payer. If the payer is also the fee payer, it needs enough SOL for the transfer and fees. A third-party fee payer changes the required signer set and therefore requires a separately designed multi-signature exchange. Do not assume that a relay can sponsor fees merely by broadcasting.

## Submission

A relay can call `sendRawTransaction` with serialized signed bytes. A returned signature indicates a submission attempt was accepted by the RPC interface; it is not a finalized payment receipt. Retry policies must account for blockhash expiration and duplicate submissions.

## Confirmation

Query transaction signature status and inspect `err` and confirmation status. For an accurate expiration check, use the block height against the `lastValidBlockHeight` associated with the transaction's blockhash. An RPC timeout is not definitive proof of failure. When risk warrants it, wait for finalized commitment.

## Account state and offline recipients

A recipient does not need to sign or be online to receive a conventional SOL transfer to an existing valid destination address. They will only learn the authoritative updated balance when a connected verifier queries the chain.

## Durable nonce considerations

Solana supports durable nonce transactions under distinct rules. They can change the freshness model but introduce nonce-account management and additional instructions/authorization requirements. RPay does not claim durable nonce support unless separately implemented and tested.

## Network and cluster separation

Devnet funds are not mainnet assets. Clients should prominently display their cluster and reject cross-cluster exchange payloads. Address strings alone do not establish which cluster a transaction is intended for.

## References

- https://solana.com/docs/core/transactions
- https://solana.com/developers/guides/advanced/confirmation
- https://solana.com/docs/rpc/http/getlatestblockhash
- https://solana.com/docs/rpc/http/sendrawtransaction
