/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL?: string
  readonly VITE_USDT_MINT?: string
  /** Wallet app URL for “create address” deep link (default http://localhost:5173). */
  readonly VITE_WALLET_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
