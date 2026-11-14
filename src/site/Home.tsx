import { Link } from "react-router-dom"
import { SiteShell } from "./Site"

const merchantHref = import.meta.env.DEV ? "http://localhost:5174" : "/merchant/app/"

function Arrow() { return <span aria-hidden="true">↗</span> }

function CodeWindow({ compact = false }: { compact?: boolean }) {
  return <div className={`rp2-editor${compact ? " rp2-editor-compact" : ""}`} aria-label="RPay SDK integration example">
    <div className="rp2-editor-bar"><span className="rp2-editor-lights"><i /><i /><i /></span><span>payment.ts</span><span>TYPE SCRIPT</span></div>
    <div className="rp2-editor-body"><div className="rp2-line-numbers">1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9</div><pre><code><span className="rp2-code-purple">import</span> {'{'} RPayClient {'}'} <span className="rp2-code-purple">from</span> <span className="rp2-code-green">"@rpay/protocol"</span>{"\n"}<span className="rp2-code-purple">import</span> {'{'} Connection {'}'} <span className="rp2-code-purple">from</span> <span className="rp2-code-green">"@solana/web3.js"</span>{"\n\n"}<span className="rp2-code-purple">const</span> client = <span className="rp2-code-purple">new</span> <span className="rp2-code-blue">RPayClient</span>({'{' }{"\n"}  connection: <span className="rp2-code-purple">new</span> <span className="rp2-code-blue">Connection</span>({"\n"}    <span className="rp2-code-green">"https://api.devnet.solana.com"</span>{"\n"}  ),{"\n"}  cluster: <span className="rp2-code-green">"devnet"</span>,{"\n"}{'}'})</code></pre></div>
    <div className="rp2-editor-status"><span><i /> SDK READY</span><span>@rpay/protocol</span></div>
  </div>
}

function WalletInterface() {
  return <div className="rp2-product-ui rp2-wallet-ui" aria-label="Preview of the RPay Wallet interface">
    <div className="rp2-app-top"><span className="rp2-app-mark">R</span><strong>RPay Wallet</strong><span className="rp2-app-network">● Devnet</span></div>
    <div className="rp2-wallet-balance"><span>AVAILABLE BALANCE</span><strong>0.00 <small>SOL</small></strong><p>Your wallet stays in your control.</p></div>
    <div className="rp2-wallet-actions"><span>↗<small>Send</small></span><span>↙<small>Receive</small></span><span>◎<small>Relay</small></span></div>
    <div className="rp2-app-list"><strong>Recent activity</strong><span>Payments will appear here after you transact.</span></div>
  </div>
}

function MerchantInterface() {
  return <div className="rp2-product-ui rp2-merchant-ui" aria-label="Preview of the RPay Merchant payment request interface">
    <div className="rp2-app-top"><span className="rp2-app-mark">R</span><strong>RPay Merchant</strong><span className="rp2-app-network">● Devnet</span></div>
    <div className="rp2-merchant-request"><span>NEW PAYMENT REQUEST</span><strong>0.01 <small>SOL</small></strong><p>Show this request to your customer.</p><div className="rp2-qr" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="rp2-merchant-wait"><i /> Waiting for payment</div></div>
    <div className="rp2-merchant-check">Check Solana for payment <span>↗</span></div>
  </div>
}

function ProductShowcase() {
  return <section className="rp2-products" id="products"><div className="rp-container">
    <div className="rp2-section-intro"><span className="rp2-label">THE RPAY PRODUCTS / 01—03</span><h2>Infrastructure you can build on. Products you can open.</h2><p>One protocol powers three distinct tools: an integration SDK, a wallet, and a merchant till.</p></div>
    <div className="rp2-product-feature rp2-product-sdk"><div className="rp2-product-copy"><span className="rp2-label">01 / THE INTEGRATION LAYER</span><h3>RPay Protocol SDK</h3><p>Bring payment connectivity into your own wallet or application. Use versioned messages, transaction helpers, relay submission, and settlement observation from one TypeScript package.</p><div className="rp2-product-tags"><span>Messages</span><span>Transactions</span><span>Settlement</span></div><Link to="/docs/sdk">Explore the SDK <Arrow /></Link></div><div className="rp2-product-visual"><CodeWindow /></div></div>
    <div className="rp2-product-feature rp2-product-wallet"><div className="rp2-product-copy"><span className="rp2-label">02 / THE WALLET</span><h3>RPay Wallet</h3><p>Hold, send, and receive SOL on Devnet. When a direct connection is unavailable, authorize a payment locally and use the QR relay flow to reach the network.</p><div className="rp2-product-tags"><span>Self-custody</span><span>Send & receive</span><span>QR relay</span></div><Link to="/wallet">Open Wallet <Arrow /></Link></div><div className="rp2-product-visual"><WalletInterface /></div></div>
    <div className="rp2-product-feature rp2-product-merchant"><div className="rp2-product-copy"><span className="rp2-label">03 / THE TILL</span><h3>RPay Merchant</h3><p>Create a payment request, show its QR code, and check Solana before marking a charge paid. A clear payment experience from request to verified receipt.</p><div className="rp2-product-tags"><span>Payment requests</span><span>On-chain checks</span><span>Charge history</span></div><a href={merchantHref}>Open Merchant <Arrow /></a></div><div className="rp2-product-visual"><MerchantInterface /></div></div>
  </div></section>
}

export function Landing() {
  return <SiteShell title="RPay" variant="dark">
    <section className="rp2-hero"><div className="rp-container rp2-hero-inner"><div className="rp2-hero-copy"><p className="rp2-label">RPAY / PAYMENT CONNECTIVITY INFRASTRUCTURE</p><h1>The connectivity layer for <span>blockchain payments.</span></h1><p className="rp2-hero-lead">Build payment experiences that reach farther. RPay gives wallets, fintechs, merchants, and payment apps a shared path to Solana while keeping every payment under its payer’s control.</p><div className="rp2-actions"><Link className="rp2-button rp2-button-primary" to="/developers">Build with RPay <Arrow /></Link><Link className="rp2-button rp2-button-secondary" to="/products">Explore products <Arrow /></Link></div><p className="rp2-hero-statement">One connection. Everyone can transact.</p></div><div className="rp2-hero-art" aria-hidden="true"><div className="rp2-orbit rp2-orbit-one" /><div className="rp2-orbit rp2-orbit-two" /><div className="rp2-orbit rp2-orbit-three" /><div className="rp2-orbit-core">R</div><span className="rp2-orbit-tag rp2-orbit-wallet">WALLET <i /></span><span className="rp2-orbit-tag rp2-orbit-sdk">SDK <i /></span><span className="rp2-orbit-tag rp2-orbit-merchant">MERCHANT <i /></span></div></div><div className="rp-container rp2-hero-bottom"><span>BUILT ON SOLANA · DEVNET</span><span>SCROLL TO EXPLORE ↓</span></div></section>
    <section className="rp2-capabilities rp-container"><div className="rp2-section-intro"><span className="rp2-label">THE PLATFORM</span><h2>Payment connectivity, built into the experience.</h2><p>Give people more ways to complete a payment, without building the underlying exchange and verification flow from scratch.</p></div><div className="rp2-capability-grid">
      <article><span className="rp2-cap-icon">◎</span><h3>Shared connection</h3><p>Let a connected peer provide network access to a payer who needs it.</p></article>
      <article><span className="rp2-cap-icon">↗</span><h3>Local approval</h3><p>Keep transaction review and signing on the payer’s device.</p></article>
      <article><span className="rp2-cap-icon">▦</span><h3>Payment requests</h3><p>Move a merchant’s destination, amount, and asset into the payment flow.</p></article>
      <article><span className="rp2-cap-icon">✓</span><h3>Verified outcomes</h3><p>Check the result against Solana instead of treating a relay response as payment.</p></article>
    </div></section>
    <ProductShowcase />
    <section className="rp2-solutions rp-container"><div className="rp2-section-intro"><span className="rp2-label">BUILT FOR PAYMENT PRODUCTS</span><h2>One layer. More ways to move.</h2><p>Use RPay where connectivity belongs inside the payment experience.</p></div><div className="rp2-solution-grid"><article><span>01</span><h3>Wallets</h3><p>Add a QR-assisted payment path while your users keep their keys and approve every transaction.</p></article><article><span>02</span><h3>Fintechs</h3><p>Connect a Solana payment flow to the experience and interface your customers already use.</p></article><article><span>03</span><h3>Merchants</h3><p>Request a payment, present a code, and confirm the charge from chain state.</p></article><article><span>04</span><h3>Payment providers</h3><p>Build payer, relay, and merchant experiences on the same protocol messages.</p></article></div><Link className="rp2-inline-link" to="/solutions">See all solutions <Arrow /></Link></section>
    <section className="rp2-technical"><div className="rp-container"><div className="rp2-technical-head"><span className="rp2-label">HOW IT WORKS</span><h2>A payment can use someone else’s connection. Approval stays with its owner.</h2><p>The current apps exchange network context and signed transactions through QR codes. Solana remains the settlement network.</p></div><div className="rp2-technical-steps"><div><span>01</span><strong>Get context</strong><p>A connected peer provides fresh Solana transaction context.</p></div><div><span>02</span><strong>Sign locally</strong><p>The payer reviews the payment and signs on their device.</p></div><div><span>03</span><strong>Submit</strong><p>The connected peer sends the signed transaction to Solana.</p></div><div><span>04</span><strong>Verify</strong><p>The app checks chain status before showing a settled payment.</p></div></div><Link className="rp2-inline-link" to="/protocol">See the protocol <Arrow /></Link></div></section>
    <section className="rp2-trust rp-container"><div className="rp2-section-intro"><span className="rp2-label">TRUST BY DESIGN</span><h2>Connection is shared. Control is not.</h2></div><div className="rp2-trust-grid"><article><span>01 / AUTHORITY</span><h3>Keys stay with the payer.</h3><p>The relay never needs a recovery phrase or private key to submit a signed payment.</p></article><article><span>02 / INTEGRITY</span><h3>Signed details stay signed.</h3><p>Changing the destination or amount invalidates the payer’s signature.</p></article><article><span>03 / EVIDENCE</span><h3>The chain decides what settled.</h3><p>Applications can independently verify the result on Solana.</p></article></div><Link className="rp2-inline-link" to="/docs/security">Read the security model <Arrow /></Link></section>
    <section className="rp2-developers"><div className="rp-container rp2-developers-grid"><div><span className="rp2-label">DEVELOPERS</span><h2>From idea to integration.</h2><p>The TypeScript SDK gives you the protocol messages and Solana helpers behind the RPay products. Start with a working Devnet flow, then shape it around your application.</p><div className="rp2-actions"><Link className="rp2-button rp2-button-primary" to="/docs/sdk">Read the quickstart <Arrow /></Link><Link className="rp2-button rp2-button-quiet" to="/docs">Browse documentation <Arrow /></Link></div></div><CodeWindow compact /></div></section>
    <section className="rp2-final"><div className="rp-container"><span className="rp2-label">ONE CONNECTION. EVERYONE CAN TRANSACT.</span><h2>Build a better way to pay.</h2><p>Make connectivity part of the payment infrastructure your users can rely on.</p><div className="rp2-actions"><Link className="rp2-button rp2-button-dark" to="/developers">Start building <Arrow /></Link><Link className="rp2-button rp2-button-outline" to="/products">Explore RPay <Arrow /></Link></div></div></section>
  </SiteShell>
}

export function ProductsPage() {
  return <SiteShell title="Products" variant="dark"><div className="rp2-page-hero"><div className="rp-container"><span className="rp2-label">RPAY PRODUCTS</span><h1>One protocol. Three products.</h1><p>Build with the SDK. Pay with Wallet. Accept with Merchant.</p></div></div><ProductShowcase /><section className="rp2-final"><div className="rp-container"><span className="rp2-label">GET STARTED</span><h2>Pick your entry point.</h2><div className="rp2-actions"><Link className="rp2-button rp2-button-dark" to="/docs/sdk">Use the SDK <Arrow /></Link><Link className="rp2-button rp2-button-outline" to="/protocol">Learn the protocol <Arrow /></Link></div></div></section></SiteShell>
}
