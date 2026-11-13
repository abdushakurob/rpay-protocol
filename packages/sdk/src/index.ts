export { PROTOCOL_ID, PROTOCOL_VERSION, DEFAULT_CLUSTER, SUPPORTED_CLUSTERS } from "./version"

export {
  SOLANA_SLOT_MS,
  deriveExpiresAt,
  getExpirySnapshot,
  formatRemaining,
  formatExpiryClock,
  isContextExpired,
} from "./expiry"
export type { ExpirySnapshot } from "./expiry"
export type { ProtocolId, ProtocolVersion, SolanaCluster } from "./version"

export type {
  ProtocolRole,
  TransactionState,
  MessageType,
  AssetKind,
  AssetDescriptor,
  PaymentAmount,
  NetworkContextMessage,
  SignedTransactionMessage,
  SubmissionStatusMessage,
  PaymentRequestMessage,
  SettlementReceiptMessage,
  ProtocolErrorMessage,
  ProtocolMessage,
  Signer,
} from "./types"

export { ProtocolError, ProtocolErrorCode, isUnsafeToRetry } from "./errors"

export {
  canTransition,
  assertTransition,
  isSettledState,
  isPreSettlementState,
  labelForState,
} from "./lifecycle"

export {
  NATIVE_SOL,
  USDT_MAINNET_MINT,
  usdtAsset,
  isOfficialUsdtMint,
  resolveUsdtAsset,
  parseTokenAmount,
  formatAmount,
  formatTokenAmount,
} from "./assets"

export {
  createNetworkContext,
  createSignedTransactionMessage,
  createSubmissionStatus,
  createPaymentRequest,
  serializeMessage,
  parseMessage,
  validateMessage,
  statusIsClaimOnly,
} from "./messages"

export { toBase64, fromBase64, toBase64Url, fromBase64Url, createExchangeId } from "./transport/encoding"

export {
  encodeBlockhash,
  decodeBlockhash,
  encodeSignedTx,
  decodeSignedTx,
  encodeIdentity,
  decodeIdentity,
  isLegacyQrPayload,
} from "./transport/qr-legacy"

export { buildSolTransfer, buildTransfer } from "./solana/transfer"
export { verifyTransfer } from "./solana/verify"
export type { CheckedTransfer } from "./solana/verify"
export {
  associatedTokenAddress,
  readTokenBalance,
  buildSplTransfer,
  signSplTransfer,
  verifySplTransfer,
} from "./solana/spl"
export type { CheckedSplTransfer } from "./solana/spl"
export { submitSignedTransaction, observeSignature } from "./solana/submit"
export type { SubmitResult } from "./solana/submit"

export { createKeypairSigner } from "./adapters/keypair"
export { createWdkSigner } from "./adapters/wdk"
export type { ProtocolSigner, WdkSolanaAccountLike } from "./adapters/wdk"

export { RPayClient } from "./client"
export type { RPayClientOptions } from "./client"
