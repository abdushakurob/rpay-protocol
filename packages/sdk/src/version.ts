/** Protocol identifier and draft version (docs/02-protocol-specification.md). */
export const PROTOCOL_ID = "rpay" as const
export const PROTOCOL_VERSION = "0.1-draft" as const

export type ProtocolId = typeof PROTOCOL_ID
export type ProtocolVersion = typeof PROTOCOL_VERSION

export const SUPPORTED_CLUSTERS = ["devnet", "testnet", "mainnet-beta"] as const
export type SolanaCluster = (typeof SUPPORTED_CLUSTERS)[number]

export const DEFAULT_CLUSTER: SolanaCluster = "devnet"
