import { IconHelp, IconHome, IconList, IconSettings } from "./Icons"

export type WalletTab = "home" | "activity" | "help" | "settings"

const ITEMS: { id: WalletTab; label: string; Icon: typeof IconHome }[] = [
  { id: "home", label: "Wallet", Icon: IconHome },
  { id: "activity", label: "Activity", Icon: IconList },
  { id: "help", label: "Help", Icon: IconHelp },
  { id: "settings", label: "Settings", Icon: IconSettings },
]

export function WalletSidebar({
  tab,
  alias,
  onTab,
}: {
  tab: WalletTab
  alias: string
  onTab: (tab: WalletTab) => void
}) {
  return (
    <aside className="wallet-sidebar" aria-label="Wallet sections">
      <div className="wallet-sidebar-brand">
        <span className="wallet-logo">R</span>
        <div className="wallet-sidebar-meta">
          <strong>RPay</strong>
          {alias ? <span className="wallet-sidebar-alias">@{alias}</span> : null}
        </div>
      </div>
      <nav className="wallet-sidebar-nav">
        {ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="wallet-nav-item"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => onTab(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>
      <p className="wallet-sidebar-note">Devnet · Keys on this device</p>
    </aside>
  )
}

export function WalletMobileNav({ tab, onTab }: { tab: WalletTab; onTab: (tab: WalletTab) => void }) {
  return (
    <nav className="wallet-mobile-nav" aria-label="Sections">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="wallet-mobile-tab"
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onTab(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
