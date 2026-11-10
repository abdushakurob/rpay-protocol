import type { ReactNode } from "react"

export function SiteLayout({
  children,
  variant,
}: {
  children: ReactNode
  variant: "auth" | "app"
}) {
  if (variant === "app") {
    return <div className="app-canvas">{children}</div>
  }

  return (
    <div className="auth-layout">
      <aside className="auth-marketing">
        <div className="auth-marketing-inner">
          <div className="auth-glow" aria-hidden="true" />
          <header className="auth-brand">
            <span className="wallet-logo">R</span>
            <div className="auth-brand-text">
              <strong>RPay</strong>
              <span>Devnet</span>
            </div>
          </header>
          <p className="auth-eyebrow">No signal? Still pay.</p>
          <h1>Send SOL without internet on your phone.</h1>
          <p className="auth-lead">
            Most wallets stop when bars disappear. RPay doesn&apos;t. You set who gets paid and how much, sign on your phone, and someone nearby with service passes it on. They can&apos;t change what you signed.
          </p>
          <p className="auth-foot">
            When you&apos;re online, send like normal — one tap to devnet. Your keys never leave this device.
          </p>
        </div>
      </aside>
      <section className="auth-panel" aria-label="Open wallet">
        <div className="auth-panel-inner">{children}</div>
      </section>
    </div>
  )
}
