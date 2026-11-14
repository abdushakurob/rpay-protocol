import { isValidElement, useMemo, useRef, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"
import { SiteShell } from "./Site"
import quickstartMd from "./content/quickstart.md?raw"
import sdkOverviewMd from "./content/sdk/overview.md?raw"
import sdkCreateClientMd from "./content/sdk/create-client.md?raw"
import sdkFetchNetworkContextMd from "./content/sdk/fetch-network-context.md?raw"
import sdkCreateMerchantPaymentRequestMd from "./content/sdk/create-merchant-payment-request.md?raw"
import sdkSignSolTransferMd from "./content/sdk/sign-sol-transfer.md?raw"
import sdkRelaySubmitMd from "./content/sdk/relay-submit.md?raw"
import sdkVerifySettlementMd from "./content/sdk/verify-settlement.md?raw"
import sdkErrorsMd from "./content/sdk/errors.md?raw"
import sdkExportsMd from "./content/sdk/exports.md?raw"

const protocolDocs = import.meta.glob("../../docs/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>

type DocPage = {
  slug: string
  title: string
  group: string
  file?: string
  guide?: string
  method?: boolean
}

const pages: DocPage[] = [
  { slug: "introduction", title: "What is RPay?", file: "00-introduction", group: "Get started" },
  { slug: "architecture", title: "Architecture", file: "01-architecture", group: "Get started" },
  { slug: "lifecycle", title: "Payment lifecycle", file: "03-transaction-lifecycle", group: "Get started" },
  { slug: "transport", title: "QR and transport", file: "04-transport", group: "Get started" },
  { slug: "sdk", title: "Overview", guide: "sdk/overview", group: "TypeScript SDK" },
  { slug: "quickstart", title: "Quickstart", guide: "quickstart", group: "TypeScript SDK" },
  { slug: "sdk-client", title: "Create a client", guide: "sdk/create-client", group: "TypeScript SDK" },
  { slug: "sdk-fetch-network-context", title: "fetchNetworkContext", guide: "sdk/fetch-network-context", group: "TypeScript SDK", method: true },
  { slug: "sdk-create-merchant-payment-request", title: "createMerchantPaymentRequest", guide: "sdk/create-merchant-payment-request", group: "TypeScript SDK", method: true },
  { slug: "sdk-sign-sol-transfer", title: "signSolTransfer", guide: "sdk/sign-sol-transfer", group: "TypeScript SDK", method: true },
  { slug: "sdk-relay-submit", title: "relaySubmit", guide: "sdk/relay-submit", group: "TypeScript SDK", method: true },
  { slug: "sdk-verify-settlement", title: "verifySettlement", guide: "sdk/verify-settlement", group: "TypeScript SDK", method: true },
  { slug: "sdk-errors", title: "Errors", guide: "sdk/errors", group: "TypeScript SDK" },
  { slug: "sdk-exports", title: "Package exports", guide: "sdk/exports", group: "TypeScript SDK" },
  { slug: "specification", title: "Message specification", file: "02-protocol-specification", group: "Reference" },
  { slug: "solana", title: "Solana integration", file: "06-solana-integration", group: "Reference" },
  { slug: "usdt", title: "Assets and USDT-DEV", file: "09-tether-usdt", group: "Reference" },
  { slug: "security", title: "Security model", file: "05-security-model", group: "Trust and status" },
  { slug: "limitations", title: "Limits and maturity", file: "07-limitations", group: "Trust and status" },
  { slug: "roadmap", title: "Roadmap", file: "08-roadmap", group: "Trust and status" },
]

const GUIDES: Record<string, string> = {
  quickstart: quickstartMd,
  "sdk/overview": sdkOverviewMd,
  "sdk/create-client": sdkCreateClientMd,
  "sdk/fetch-network-context": sdkFetchNetworkContextMd,
  "sdk/create-merchant-payment-request": sdkCreateMerchantPaymentRequestMd,
  "sdk/sign-sol-transfer": sdkSignSolTransferMd,
  "sdk/relay-submit": sdkRelaySubmitMd,
  "sdk/verify-settlement": sdkVerifySettlementMd,
  "sdk/errors": sdkErrorsMd,
  "sdk/exports": sdkExportsMd,
}

const GROUPS = ["Get started", "TypeScript SDK", "Reference", "Trust and status"] as const

const LINK_ALIASES: Record<string, string> = {
  quickstart: "quickstart",
  "sdk-client": "sdk-client",
  sdk: "sdk",
  "sdk-fetch-network-context": "sdk-fetch-network-context",
  "sdk-create-merchant-payment-request": "sdk-create-merchant-payment-request",
  "sdk-sign-sol-transfer": "sdk-sign-sol-transfer",
  "sdk-relay-submit": "sdk-relay-submit",
  "sdk-verify-settlement": "sdk-verify-settlement",
  "sdk-errors": "sdk-errors",
  "sdk-exports": "sdk-exports",
}

function markdownFor(page: DocPage) {
  if (page.guide) return GUIDES[page.guide]
  if (page.file) return protocolDocs[`../../docs/${page.file}.md`]
  return undefined
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[`*_]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-")
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join("")
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children)
  return ""
}

function docPath(href: string) {
  const raw = href.split("/").pop()?.split("#")[0]?.replace(/\.md$/, "") ?? ""
  const alias = LINK_ALIASES[raw]
  const byAlias = alias ? pages.find((page) => page.slug === alias) : undefined
  const byFile = pages.find((page) => page.file === raw || page.slug === raw || page.guide?.endsWith(`/${raw}`) || page.guide === raw)
  const match = byAlias ?? byFile
  return match ? `/docs/${match.slug}${href.includes("#") ? `#${href.split("#")[1]}` : ""}` : null
}

function languageLabel(children: ReactNode): string {
  const code = Array.isArray(children) ? children[0] : children
  if (!isValidElement(code)) return "Code"
  const className = String((code.props as { className?: string }).className ?? "")
  const match = className.match(/language-([\w-]+)/)
  if (!match) return "Code"
  const map: Record<string, string> = { ts: "TypeScript", typescript: "TypeScript", js: "JavaScript", javascript: "JavaScript", bash: "bash", shell: "bash", json: "JSON" }
  return map[match[1]] ?? match[1]
}

function CopyCode({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const label = languageLabel(children)
  async function copy() {
    const value = ref.current?.textContent ?? ""
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="rp3-code-block">
      <div className="rp3-code-bar">
        <span>{label}</span>
        <button type="button" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre ref={ref}>{children}</pre>
    </div>
  )
}

function Heading({ level, children, methodPage }: { level: 1 | 2 | 3; children: ReactNode; methodPage?: boolean }) {
  const text = nodeText(children)
  const id = slugify(text)
  if (level === 1) {
    return (
      <h1 id={id} className={methodPage ? "rp3-method" : undefined}>
        {methodPage ? <code>{children}</code> : children}
      </h1>
    )
  }
  const Tag = level === 2 ? "h2" : "h3"
  return (
    <Tag id={id}>
      {children}
      <a href={`#${id}`} aria-label={`Link to ${text}`}>#</a>
    </Tag>
  )
}

function Callout({ children }: { children: ReactNode }) {
  const text = nodeText(children)
  const kind = /^\s*Warning/i.test(text) ? "warn" : "note"
  return <aside className={`rp3-callout is-${kind}`}>{children}</aside>
}

function QuickCode() {
  const [copied, setCopied] = useState(false)
  const sample = `import { Connection } from "@solana/web3.js"\nimport { RPayClient } from "@rpay/protocol"\n\nconst client = new RPayClient({\n  connection: new Connection("https://api.devnet.solana.com"),\n  cluster: "devnet",\n})\n\nconst context = await client.fetchNetworkContext()`
  return (
    <div className="rp3-quick-code">
      <div className="rp3-code-bar">
        <span>TypeScript</span>
        <button type="button" onClick={() => void navigator.clipboard.writeText(sample).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800) })}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre><code><span className="hljs-keyword">import</span> {"{"} Connection {"}"} <span className="hljs-keyword">from</span> <span className="hljs-string">"@solana/web3.js"</span>{"\n"}<span className="hljs-keyword">import</span> {"{"} RPayClient {"}"} <span className="hljs-keyword">from</span> <span className="hljs-string">"@rpay/protocol"</span>{"\n\n"}<span className="hljs-keyword">const</span> client = <span className="hljs-keyword">new</span> <span className="hljs-title">RPayClient</span>({"{\n"}  connection: <span className="hljs-keyword">new</span> <span className="hljs-title">Connection</span>({"\n"}    <span className="hljs-string">"https://api.devnet.solana.com"</span>{"\n"}  ),{"\n"}  cluster: <span className="hljs-string">"devnet"</span>,{"\n"}{"}"}{")\n\n"}<span className="hljs-keyword">const</span> context = <span className="hljs-keyword">await</span> client.<span className="hljs-title">fetchNetworkContext</span>()</code></pre>
    </div>
  )
}

export function DocsPage() {
  const { slug } = useParams()
  const [query, setQuery] = useState("")
  const [navOpen, setNavOpen] = useState(false)
  const selected = pages.find((page) => page.slug === slug)
  const markdown = selected ? markdownFor(selected) : undefined
  const matches = useMemo(
    () => pages.filter((page) => `${page.title} ${page.group} ${markdownFor(page) ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  )
  const headings = useMemo(
    () => [...(markdown ?? "").matchAll(/^##\s+(.+)$/gm)].map((match) => ({ title: match[1].replace(/[`*_]/g, ""), id: slugify(match[1]) })),
    [markdown],
  )
  const next = selected ? pages[pages.indexOf(selected) + 1] : undefined
  const isApi = Boolean(selected?.group === "TypeScript SDK" || selected?.slug === "quickstart")

  return (
    <SiteShell title={selected?.title ?? "Documentation"}>
      <div className="rp3-docs-bar"><div className="rp-container"><span>DOCUMENTATION</span><span><i /> SOLANA DEVNET</span></div></div>
      <div className="rp3-docs rp-container">
        <aside className={navOpen ? "rp3-docs-nav is-open" : "rp3-docs-nav"} aria-label="Documentation navigation">
          <Link className="rp3-docs-home" to="/docs">RPay Docs</Link>
          <button className="rp3-mobile-nav-toggle" type="button" aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}>
            Browse documentation <span>{navOpen ? "−" : "+"}</span>
          </button>
          <label className="rp3-search">
            <span className="rp-visually-hidden">Search documentation</span>
            <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setNavOpen(true) }} placeholder="Search docs..." />
            <kbd>/</kbd>
          </label>
          {GROUPS.map((group) => {
            const items = matches.filter((page) => page.group === group)
            if (!items.length) return null
            return (
              <div className="rp3-nav-group" key={group}>
                <strong>{group}</strong>
                {items.map((page) => (
                  <Link
                    className={`${page.slug === slug ? "is-current" : ""}${page.method ? " is-method" : ""}`}
                    to={`/docs/${page.slug}`}
                    key={page.slug}
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            )
          })}
          {query && matches.length === 0 ? <p className="rp3-search-empty">No pages match “{query}”.</p> : null}
        </aside>

        <article className="rp3-docs-main" id="docs-content">
          {selected && markdown ? (
            <>
              <div className="rp3-breadcrumb">
                <Link to="/docs">Docs</Link>
                <span>/</span>
                <span>{selected.group}</span>
                <span>/</span>
                <strong>{selected.title}</strong>
              </div>
              <div className={isApi ? "rp3-docs-prose is-api" : "rp3-docs-prose"}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    a: ({ href, children, ...props }) => {
                      const path = href && docPath(href)
                      return path ? <Link to={path}>{children}</Link> : <a href={href} {...props}>{children}</a>
                    },
                    pre: ({ children }) => <CopyCode>{children}</CopyCode>,
                    h1: ({ children }) => <Heading level={1} methodPage={selected.method}>{children}</Heading>,
                    h2: ({ children }) => <Heading level={2}>{children}</Heading>,
                    h3: ({ children }) => <Heading level={3}>{children}</Heading>,
                    blockquote: ({ children }) => <Callout>{children}</Callout>,
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              </div>
              {next ? (
                <div className="rp3-next">
                  <span>Next</span>
                  <Link to={`/docs/${next.slug}`}>{next.title} →</Link>
                </div>
              ) : null}
            </>
          ) : slug ? (
            <>
              <h1>Page not found</h1>
              <p>Choose another guide from the navigation.</p>
              <Link to="/docs">Back to documentation →</Link>
            </>
          ) : (
            <>
              <div className="rp3-docs-hero">
                <span className="rp3-eyebrow">DOCUMENTATION</span>
                <h1>Build with RPay</h1>
                <p>Protocol guides and the TypeScript SDK for Solana Devnet payment connectivity.</p>
                <div>
                  <Link to="/docs/quickstart">Quickstart →</Link>
                  <Link to="/docs/sdk">TypeScript SDK →</Link>
                </div>
              </div>
              <div className="rp3-section-heading">
                <span>QUICKSTART</span>
                <h2>Install and create a client</h2>
                <p>Add the package, point at Devnet, then continue through context, signing, submit, and settlement.</p>
              </div>
              <div className="rp3-install"><code>npm install @rpay/protocol @solana/web3.js</code></div>
              <QuickCode />
              <Link className="rp3-follow-link" to="/docs/quickstart">Open the Quickstart →</Link>
              <div className="rp3-section-heading rp3-path-heading"><span>GUIDES</span><h2>Pick a path</h2></div>
              <div className="rp3-paths">
                <Link to="/docs/introduction"><span>START</span><strong>What is RPay?</strong><p>Roles, connectivity model, and what the protocol covers.</p><b>Read →</b></Link>
                <Link to="/docs/sdk"><span>SDK</span><strong>TypeScript SDK</strong><p>Client setup, methods, errors, and exports.</p><b>Read →</b></Link>
                <Link to="/docs/security"><span>TRUST</span><strong>Security model</strong><p>Relay limits and what counts as settlement.</p><b>Read →</b></Link>
              </div>
              <div className="rp3-status-note">
                <strong>Network</strong>
                <p>Solana Devnet · QR transport · protocol <code>0.1-draft</code>. No independent audit or mainnet readiness claim.</p>
                <Link to="/docs/limitations">Limitations →</Link>
              </div>
            </>
          )}
        </article>

        <aside className="rp3-docs-aside" aria-label="Page contents">
          <div className="rp3-aside-inner">
            <strong>On this page</strong>
            {selected ? (
              headings.length ? headings.map((heading) => <a key={heading.id} href={`#${heading.id}`}>{heading.title}</a>) : <span className="rp3-aside-empty">This page</span>
            ) : (
              <>
                <Link to="/docs/quickstart">Quickstart</Link>
                <Link to="/docs/sdk">TypeScript SDK</Link>
                <Link to="/docs/security">Security model</Link>
              </>
            )}
            <div className="rp3-aside-status">
              <span><i /> Network</span>
              <strong>Solana Devnet</strong>
              <p>SOL and configured USDT-DEV test mint.</p>
              <Link to="/docs/usdt">Assets →</Link>
            </div>
          </div>
        </aside>
      </div>
    </SiteShell>
  )
}
