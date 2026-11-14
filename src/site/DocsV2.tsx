import { isValidElement, useMemo, useRef, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"
import { SiteShell } from "./Site"
import sdkGuide from "./content/sdk.md?raw"

const source = import.meta.glob("../../docs/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>
const pages = [
  { slug: "introduction", title: "What is RPay?", file: "00-introduction", group: "Get started" },
  { slug: "sdk", title: "SDK quickstart", file: "sdk", group: "Get started" },
  { slug: "architecture", title: "Architecture", file: "01-architecture", group: "Understand the protocol" },
  { slug: "lifecycle", title: "Payment lifecycle", file: "03-transaction-lifecycle", group: "Understand the protocol" },
  { slug: "transport", title: "QR and transport", file: "04-transport", group: "Understand the protocol" },
  { slug: "specification", title: "Message specification", file: "02-protocol-specification", group: "Reference" },
  { slug: "solana", title: "Solana integration", file: "06-solana-integration", group: "Reference" },
  { slug: "usdt", title: "Assets and USDT-DEV", file: "09-tether-usdt", group: "Reference" },
  { slug: "security", title: "Security model", file: "05-security-model", group: "Trust and status" },
  { slug: "limitations", title: "Limits and maturity", file: "07-limitations", group: "Trust and status" },
  { slug: "roadmap", title: "Roadmap", file: "08-roadmap", group: "Trust and status" },
] as const

function markdownFor(file: string) { return file === "sdk" ? sdkGuide : source[`../../docs/${file}.md`] }
function slugify(value: string) { return value.toLowerCase().replace(/[`*_]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-") }
function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join("")
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children)
  return ""
}
function docPath(href: string) {
  const file = href.split("/").pop()?.split("#")[0]?.replace(/\.md$/, "")
  const slug = pages.find((page) => page.file === file || page.slug === file)?.slug
  return slug ? `/docs/${slug}${href.includes("#") ? `#${href.split("#")[1]}` : ""}` : null
}

function CopyCode({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  async function copy() {
    const value = ref.current?.textContent ?? ""
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { setCopied(false) }
  }
  return <div className="rp3-code-block"><div className="rp3-code-bar"><span><i /> CODE</span><button type="button" onClick={() => void copy()}>{copied ? "Copied" : "Copy code"}</button></div><pre ref={ref}>{children}</pre></div>
}

function Heading({ level, children }: { level: 2 | 3; children: ReactNode }) {
  const id = slugify(nodeText(children))
  return level === 2 ? <h2 id={id}>{children}<a href={`#${id}`} aria-label={`Link to ${nodeText(children)}`}>#</a></h2> : <h3 id={id}>{children}<a href={`#${id}`} aria-label={`Link to ${nodeText(children)}`}>#</a></h3>
}

function QuickCode() {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const sample = `import { Connection } from "@solana/web3.js"\nimport { RPayClient } from "@rpay/protocol"\n\nconst client = new RPayClient({\n  connection: new Connection("https://api.devnet.solana.com"),\n  cluster: "devnet",\n})\n\nconst context = await client.fetchNetworkContext()`
  return <div className="rp3-quick-code"><div className="rp3-code-bar"><span><i /> quickstart.ts</span><button type="button" onClick={() => void navigator.clipboard.writeText(sample).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800) })}>{copied ? "Copied" : "Copy code"}</button></div><pre ref={ref}><code><span className="hljs-keyword">import</span> {'{'} Connection {'}'} <span className="hljs-keyword">from</span> <span className="hljs-string">"@solana/web3.js"</span>{"\n"}<span className="hljs-keyword">import</span> {'{'} RPayClient {'}'} <span className="hljs-keyword">from</span> <span className="hljs-string">"@rpay/protocol"</span>{"\n\n"}<span className="hljs-keyword">const</span> client = <span className="hljs-keyword">new</span> <span className="hljs-title">RPayClient</span>({'{' }{"\n"}  connection: <span className="hljs-keyword">new</span> <span className="hljs-title">Connection</span>({"\n"}    <span className="hljs-string">"https://api.devnet.solana.com"</span>{"\n"}  ),{"\n"}  cluster: <span className="hljs-string">"devnet"</span>,{"\n"}{'}'}){"\n\n"}<span className="hljs-keyword">const</span> context = <span className="hljs-keyword">await</span> client.<span className="hljs-title">fetchNetworkContext</span>()</code></pre><div className="rp3-code-status"><span>TypeScript</span><span>Solana Devnet</span></div></div>
}

export function DocsPage() {
  const { slug } = useParams()
  const [query, setQuery] = useState("")
  const [navOpen, setNavOpen] = useState(false)
  const selected = pages.find((page) => page.slug === slug)
  const markdown = selected ? markdownFor(selected.file) : undefined
  const matches = useMemo(() => pages.filter((page) => `${page.title} ${page.group} ${markdownFor(page.file)}`.toLowerCase().includes(query.toLowerCase())), [query])
  const headings = useMemo(() => [...(markdown ?? "").matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) => ({ title: match[1].replace(/[`*_]/g, ""), id: slugify(match[1]) })), [markdown])
  const next = selected ? pages[(pages.indexOf(selected) + 1) % pages.length] : undefined

  return <SiteShell title={selected?.title ?? "Documentation"}>
    <div className="rp3-docs-bar"><div className="rp-container"><span>DOCUMENTATION</span><span><i /> SOLANA DEVNET</span></div></div>
    <div className="rp3-docs rp-container">
      <aside className={navOpen ? "rp3-docs-nav is-open" : "rp3-docs-nav"} aria-label="Documentation navigation"><Link className="rp3-docs-home" to="/docs">RPay Docs <span>↗</span></Link><button className="rp3-mobile-nav-toggle" type="button" aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}>Browse documentation <span>{navOpen ? "−" : "+"}</span></button><label className="rp3-search"><span className="rp-visually-hidden">Search documentation</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setNavOpen(true) }} placeholder="Search docs..." /><kbd>/</kbd></label>
        {["Get started", "Understand the protocol", "Reference", "Trust and status"].map((group) => { const items = matches.filter((page) => page.group === group); return items.length ? <div className="rp3-nav-group" key={group}><strong>{group}</strong>{items.map((page) => <Link className={page.slug === slug ? "is-current" : ""} to={`/docs/${page.slug}`} key={page.slug}>{page.title}</Link>)}</div> : null })}
        {query && matches.length === 0 ? <p className="rp3-search-empty">No pages match “{query}”.</p> : null}
      </aside>
      <article className="rp3-docs-main" id="docs-content">
        {selected && markdown ? <><div className="rp3-breadcrumb"><Link to="/docs">Docs</Link><span>/</span><span>{selected.group}</span><span>/</span><strong>{selected.title}</strong></div><div className="rp3-docs-prose"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{
          a: ({ href, children, ...props }) => { const path = href && docPath(href); return path ? <Link to={path}>{children}</Link> : <a href={href} {...props}>{children}</a> },
          pre: ({ children }) => <CopyCode>{children}</CopyCode>,
          h2: ({ children }) => <Heading level={2}>{children}</Heading>,
          h3: ({ children }) => <Heading level={3}>{children}</Heading>,
        }}>{markdown}</ReactMarkdown></div>{next ? <div className="rp3-next"><span>UP NEXT</span><Link to={`/docs/${next.slug}`}>{next.title} <span>↗</span></Link></div> : null}</> : slug ? <><h1>Page not found</h1><p>Choose another guide from the navigation.</p><Link to="/docs">Back to documentation ↗</Link></> : <>
          <div className="rp3-docs-hero"><span className="rp3-eyebrow">START BUILDING WITH RPAY</span><h1>Payment connectivity starts here.</h1><p>Go from the protocol model to a working Solana Devnet integration. Pick a guide, inspect the code, and use the Wallet and Merchant apps to see the flow.</p><div><Link to="/docs/sdk">Start with the SDK <span>↗</span></Link><Link to="/docs/architecture">Understand the protocol <span>↗</span></Link></div></div>
          <div className="rp3-section-heading"><span>01 / QUICKSTART</span><h2>Make your first connection.</h2><p>Install the package and create a client with a Solana Devnet connection. The SDK guide continues through context, local signing, submission, and verification.</p></div><div className="rp3-install"><code>npm install @rpay/protocol @solana/web3.js</code></div><QuickCode /><Link className="rp3-follow-link" to="/docs/sdk">Continue to the SDK guide <span>↗</span></Link>
          <div className="rp3-section-heading rp3-path-heading"><span>02 / CHOOSE A PATH</span><h2>Find the right guide.</h2></div><div className="rp3-paths"><Link to="/docs/introduction"><span>START HERE</span><strong>Learn the model</strong><p>Understand the roles and what connectivity makes possible.</p><b>Read introduction ↗</b></Link><Link to="/docs/transport"><span>BUILD A FLOW</span><strong>Connect devices</strong><p>See how the current QR exchange carries protocol messages.</p><b>Read transport ↗</b></Link><Link to="/docs/security"><span>VERIFY THE BOUNDARIES</span><strong>Review trust</strong><p>Understand relay limits and what counts as settlement.</p><b>Read security ↗</b></Link></div>
          <div className="rp3-status-note"><strong>Current network and maturity</strong><p>RPay runs on Solana Devnet. The current apps use QR exchange. Protocol version <code>0.1-draft</code> may change, and this implementation has no independent security audit or mainnet readiness claim.</p><Link to="/docs/limitations">Read implementation limits ↗</Link></div>
        </>}
      </article>
      <aside className="rp3-docs-aside" aria-label="Page contents"><div className="rp3-aside-inner"><strong>{selected ? "ON THIS PAGE" : "IN THIS GUIDE"}</strong>{selected ? headings.map((heading) => <a key={heading.id} href={`#${heading.id}`}>{heading.title}</a>) : <><a href="#docs-content">Quickstart</a><Link to="/docs/sdk">SDK guide</Link><Link to="/docs/security">Security model</Link></>}<div className="rp3-aside-status"><span><i /> NETWORK</span><strong>Solana Devnet</strong><p>Assets: SOL and configured USDT-DEV test mint.</p><Link to="/docs/usdt">Asset support ↗</Link></div></div></aside>
    </div>
  </SiteShell>
}
