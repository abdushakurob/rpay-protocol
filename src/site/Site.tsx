import { useEffect, useState, type ReactNode } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"

const repo = "https://github.com/abdushakurob/rpay-protocol"
const walletHref = import.meta.env.DEV ? "/wallet" : "https://wallet.rpay.space/"
const merchantHref = import.meta.env.DEV ? "http://localhost:5174" : "https://merchant.rpay.space/"
export const docsHref = (path = "/") => import.meta.env.DEV ? path : `https://docs.rpay.space${path.startsWith("/") ? path : `/${path}`}`

export function SiteShell({ title, children, variant }: { title: string; children: ReactNode; variant?: "dark" }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  useEffect(() => {
    document.title = title === "RPay" ? "RPay — Payment connectivity on Solana" : `${title} | RPay`
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }, [title, location.pathname])

  return (
    <div className={variant === "dark" ? "rp-site rp-site-dark" : "rp-site"}>
      <a className="rp-skip" href="#main">Skip to content</a>
      <header className="rp-header">
        <div className="rp-container rp-header-inner">
          <Link to="/" className="rp-brand" aria-label="RPay home">
            <span className="rp-brand-mark" aria-hidden="true">R</span><span>RPay</span>
          </Link>
          <span className="rp-network"><i aria-hidden="true" /> Solana Devnet</span>
          <button className="rp-menu-button" type="button" aria-controls="rp-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? "Close" : "Menu"} <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          </button>
          <nav id="rp-navigation" className={menuOpen ? "rp-nav rp-nav-open" : "rp-nav"} aria-label="Main navigation">
            <NavLink to="/protocol">Protocol</NavLink>
            <NavLink to="/products">Products</NavLink>
            <NavLink to="/solutions">Solutions</NavLink>
            <NavLink to="/developers">Developers</NavLink>
            <a href={docsHref("/docs")}>Docs</a>
            <a href={repo} target="_blank" rel="noreferrer">GitHub</a>
            <Link className="rp-nav-cta" to="/developers">Start building <span aria-hidden="true">↗</span></Link>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="rp-footer">
        <div className="rp-container rp-footer-grid">
          <div><Link to="/" className="rp-brand"><span className="rp-brand-mark" aria-hidden="true">R</span><span>RPay</span></Link><p>Payment connectivity on Solana.</p><strong>One connection. Everyone can transact.</strong></div>
          <div><span>Explore</span><Link to="/protocol">Protocol</Link><Link to="/products">Products</Link><Link to="/solutions">Solutions</Link></div>
          <div><span>Build</span><Link to="/developers">Developers</Link><a href={docsHref("/docs")}>Documentation</a><a href={repo} target="_blank" rel="noreferrer">GitHub</a></div>
          <div><span>Products</span><a href={walletHref}>RPay Wallet</a><a href={merchantHref}>RPay Merchant</a><a href={docsHref("/docs/limitations")}>Network and limitations</a></div>
        </div>
        <div className="rp-container rp-footer-bottom"><span>© {new Date().getFullYear()} RPay</span><span>Built on Solana · Devnet</span></div>
      </footer>
    </div>
  )
}

function FlowGraphic() {
  return (
    <div className="rp-flow" role="img" aria-label="The payer authorizes a transaction, a connected relay submits it, and Solana settles it">
      <div className="rp-flow-head"><span>PAYMENT EXCHANGE</span><span>01 / 03</span></div>
      <div className="rp-flow-track">
        <div className="rp-flow-node"><span className="rp-flow-icon">✳</span><small>01 · AUTHORIZATION</small><strong>Payer</strong><p>Reviews and signs locally</p></div>
        <span className="rp-flow-line" aria-hidden="true"><i /><i /><i /></span>
        <div className="rp-flow-node"><span className="rp-flow-icon">↗</span><small>02 · CONNECTIVITY</small><strong>Relay</strong><p>Submits signed bytes</p></div>
        <span className="rp-flow-line" aria-hidden="true"><i /><i /><i /></span>
        <div className="rp-flow-node rp-flow-node-last"><span className="rp-flow-icon">◎</span><small>03 · SETTLEMENT</small><strong>Solana</strong><p>Validates the transaction</p></div>
      </div>
      <div className="rp-flow-foot"><span>Signing authority stays with the payer</span><span>Current exchange: QR</span></div>
    </div>
  )
}

const solutions = [
  { name: "Wallet developers", body: "Add a relay-assisted payment path while keeping signing inside the wallet.", detail: "Use the SDK to work with fresh network context, construct supported transfers, and present the transaction for local approval." },
  { name: "Fintechs", body: "Explore payment access when a customer's device has unreliable connectivity.", detail: "Prototype a connected-peer flow on Solana Devnet and keep your own application experience around it." },
  { name: "Merchants", body: "Request a payment and check its outcome on-chain.", detail: "Use payment request messages and independent verification; RPay Merchant shows the current flow." },
  { name: "Payment applications", body: "Build around authorization, submission, and settlement as distinct states.", detail: "Use protocol messages and lifecycle helpers to make each stage clear to the user." },
]

function SolutionGrid({ detailed = false }: { detailed?: boolean }) {
  return <div className="rp-solution-grid">{solutions.map((solution, index) => <article key={solution.name}>
    <span className="rp-index">0{index + 1}</span><h3>{solution.name}</h3><p>{solution.body}</p>
    {detailed && <p className="rp-solution-detail">{solution.detail}</p>}
  </article>)}</div>
}

export function ProtocolPage() {
  return <SiteShell title="Protocol"><div className="rp-page-hero rp-container"><p className="rp-eyebrow">RPAY PROTOCOL</p><h1>Payment authority and network access, working together.</h1><p>RPay gives applications a way to move a signed Solana payment through a connected peer while keeping authorization on the payer's device.</p></div>
    <section className="rp-section rp-container"><div className="rp-section-heading"><p className="rp-eyebrow">THE MODEL</p><h2>Separate control, connection, and settlement.</h2></div><FlowGraphic /><div className="rp-steps">
      <article><span>01</span><h3>Obtain context</h3><p>A connected relay fetches a recent blockhash and validity information from Solana.</p></article>
      <article><span>02</span><h3>Authorize locally</h3><p>The payer receives that context, reviews the exact payment, and signs on their device.</p></article>
      <article><span>03</span><h3>Submit unchanged</h3><p>The relay receives the signed transaction and submits its bytes to Solana.</p></article>
      <article><span>04</span><h3>Verify the outcome</h3><p>Applications check chain status independently before treating a payment as complete.</p></article>
    </div></section>
    <section className="rp-section rp-products-section"><div className="rp-container rp-split"><div><p className="rp-eyebrow">TRANSPORT</p><h2>Messages can move across a local exchange.</h2></div><div><p>The protocol defines payment roles and messages separately from the channel carrying them. RPay Wallet and Merchant currently use QR codes. Other local transports are future design work.</p><p>Fresh context matters: a blockhash can expire, and an expired payment needs a new signature.</p><a className="rp-text-link" href={docsHref("/docs/transport")}>Read the transport docs <span aria-hidden="true">↗</span></a></div></div></section>
    <section className="rp-section rp-container rp-split"><div><p className="rp-eyebrow">TRUST BOUNDARIES</p><h2>The relay provides a connection, not signing authority.</h2></div><div><p>The relay cannot rewrite a correctly signed transaction, but it can delay or decline to submit it. A signed QR and a submission acknowledgement are not proof of settlement.</p><a className="rp-text-link" href={docsHref("/docs/security")}>Security and limitations <span aria-hidden="true">↗</span></a></div></section>
  </SiteShell>
}

export function SolutionsPage() {
  return <SiteShell title="Solutions"><div className="rp-page-hero rp-container"><p className="rp-eyebrow">SOLUTIONS</p><h1>Build payment access around your users.</h1><p>RPay provides the connectivity pattern and SDK. Your application decides how people review, authorize, relay, and verify a payment.</p></div><section className="rp-section rp-container"><SolutionGrid detailed /></section><section className="rp-build rp-section rp-container"><div><p className="rp-eyebrow">DEVELOPER RESOURCES</p><h2>Start with a working Devnet flow.</h2><p>Use the SDK quickstart and the open-source applications to guide your integration.</p></div><Link className="rp-button" to="/developers">Start building <span aria-hidden="true">↗</span></Link></section></SiteShell>
}

export function DevelopersPage() {
  return <SiteShell title="Developers"><div className="rp-page-hero rp-container"><p className="rp-eyebrow">DEVELOPERS</p><h1>Build with RPay Protocol.</h1><p>Integrate payment connectivity into a wallet, relay, or merchant experience with the TypeScript SDK.</p><div className="rp-actions"><a className="rp-button" href={docsHref("/docs/sdk")}>Read the SDK guide <span aria-hidden="true">↗</span></a><a className="rp-button rp-button-quiet" href={repo} target="_blank" rel="noreferrer">View source</a></div></div>
    <section className="rp-section rp-container rp-developer-grid"><div><p className="rp-eyebrow">INSTALL</p><h2>Start with the SDK.</h2><p>The package includes versioned messages, transaction helpers, lifecycle states, relay submission, and status observation.</p><p>RPay Wallet and Merchant show how those pieces fit into complete experiences.</p></div><div className="rp-code-card"><div><span>TERMINAL</span><span>01</span></div><pre><code>npm install @rpay/protocol @solana/web3.js</code></pre><div><span>TYPESCRIPT</span><span>02</span></div><pre><code>{`import { Connection } from "@solana/web3.js"
import { RPayClient } from "@rpay/protocol"

const client = new RPayClient({
  connection: new Connection("https://api.devnet.solana.com"),
  cluster: "devnet",
})
const context = await client.fetchNetworkContext()`}</code></pre></div></section>
    <section className="rp-section rp-products-section"><div className="rp-container"><div className="rp-section-heading"><p className="rp-eyebrow">SDK CAPABILITIES</p><h2>The pieces behind a payment flow.</h2></div><div className="rp-capabilities"><article><span>MESSAGES</span><h3>Exchange with context.</h3><p>Create, parse, and validate versioned network context, signed transaction, status, and payment request messages.</p></article><article><span>TRANSACTIONS</span><h3>Prepare and verify.</h3><p>Build and verify supported SOL and SPL transfers, with signer adapters for host applications.</p></article><article><span>SETTLEMENT</span><h3>Observe the result.</h3><p>Submit signed bytes through a relay and check the transaction's observed chain state.</p></article></div><div className="rp-inline-next"><a className="rp-text-link" href={docsHref("/docs/sdk")}>Open the SDK guide <span aria-hidden="true">↗</span></a><a className="rp-text-link" href={docsHref("/docs/specification")}>Read the protocol specification <span aria-hidden="true">↗</span></a></div></div></section>
  </SiteShell>
}
