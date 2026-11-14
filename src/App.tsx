import { useEffect, useRef, type ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import { useSession } from "./account/session"
import { Activity } from "./screens/Activity"
import { CreateAccount } from "./screens/CreateAccount"
import { Help } from "./screens/Help"
import { DevelopersPage, ProtocolPage, SolutionsPage } from "./site/Site"
import { Landing, ProductsPage } from "./site/Home"
import { DocsPage } from "./site/DocsV2"
import { Receive } from "./screens/Receive"
import { SendFlow } from "./screens/SendFlow"
import { Settings } from "./screens/Settings"
import { Shell } from "./screens/Shell"
import { Unlock } from "./screens/Unlock"

export function App() { return <BrowserRouter><AppRoutes /></BrowserRouter> }

function AppRoutes() {
  const session = useSession()
  const { pathname } = useLocation()
  const hostname = window.location.hostname
  const walletHost = hostname === "wallet.rpay.space"
  const docsHost = hostname === "docs.rpay.space"
  const marketingRoute = (["/", "/protocol", "/products", "/solutions", "/developers"].includes(pathname) && !(pathname === "/" && walletHost)) || pathname.startsWith("/docs") || (pathname === "/" && docsHost)
  if (session.status === "loading" && !marketingRoute) return <main className="route-splash" aria-busy="true"><div className="splash-mark" aria-hidden="true"><span>R</span></div><p className="auth-kicker">RPay · Devnet</p><h1>Opening your wallet</h1><p>Checking this device securely.</p><div className="splash-loader" role="status"><i aria-hidden="true" /><span>Loading wallet</span></div></main>
  const entry = session.status === "unlocked" ? "/wallet" : session.status === "locked" ? "/unlock" : "/create"
  return <Routes>
    <Route path="/" element={walletHost ? <Wallet tab="home" /> : docsHost ? <DocsPage /> : <Landing />} />
    <Route path="/protocol" element={<ProtocolPage />} />
    <Route path="/products" element={<ProductsPage />} />
    <Route path="/solutions" element={<SolutionsPage />} />
    <Route path="/developers" element={<DevelopersPage />} />
    <Route path="/docs" element={docsHost ? <DocsPage /> : <DocsDomainRedirect />} />
    <Route path="/docs/:slug" element={docsHost ? <DocsPage /> : <DocsDomainRedirect />} />
    <Route path="/create" element={session.status === "none" ? <AuthFrame><CreateAccount /></AuthFrame> : <Navigate to={entry} replace />} />
    <Route path="/unlock" element={session.status === "unlocked" ? <Navigate to="/wallet" replace /> : <AuthFrame><Unlock /></AuthFrame>} />
    <Route path="/wallet" element={<Wallet tab="home" />} />
    <Route path="/activity" element={<Wallet tab="activity" />} />
    <Route path="/relay" element={<Wallet tab="relay" />} />
    <Route path="/help" element={<Navigate to="/relay" replace />} />
    <Route path="/settings" element={<Wallet tab="settings" />} />
    <Route path="/send" element={<Wallet tab="home" overlay="send" />} />
    <Route path="/receive" element={<Wallet tab="home" overlay="receive" />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

function DocsDomainRedirect() {
  const { pathname, search, hash } = useLocation()
  useEffect(() => {
    window.location.replace(`https://docs.rpay.space${pathname}${search}${hash}`)
  }, [pathname, search, hash])
  return null
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><header className="auth-top"><a className="auth-wordmark" href="/"><span>R</span> RPay</a><p><i /> Devnet</p></header><div className="auth-stage"><aside className="auth-story"><p className="auth-kicker">Payments beyond connectivity</p><h1>Your wallet stays yours.</h1><p>Send directly when you’re online. Use a nearby connection when you’re not—without sharing access to your money.</p><div className="auth-proof"><span>01</span><p><strong>Self-custody first</strong>Your recovery phrase and payment approvals stay with you.</p></div></aside><section className="auth-card">{children}</section></div></main>
}

function Wallet({ tab, overlay }: { tab: "home" | "activity" | "relay" | "settings"; overlay?: "send" | "receive" }) {
  const session = useSession(); const navigate = useNavigate()
  if (session.status !== "unlocked") return <Navigate to={session.status === "locked" ? "/unlock" : "/create"} replace />
  return <><div className="wallet-underlay" inert={Boolean(overlay)}><Shell tab={tab} onTab={(next) => navigate(next === "home" ? "/wallet" : `/${next}`)} onSend={() => navigate("/send")} onReceive={() => navigate("/receive")} onRelay={() => navigate("/relay")} activity={<Activity />} relay={<Help />} settings={<Settings />} /></div>{overlay ? <WalletDialog label={overlay === "send" ? "Send payment" : "Receive payment"} onClose={() => navigate("/wallet")}>{overlay === "send" ? <SendFlow onClose={() => navigate("/wallet")} /> : <Receive onClose={() => navigate("/wallet")} />}</WalletDialog> : null}</>
}

function WalletDialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    panel.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKeyDown)
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown) }
  }, [onClose])
  return <div className="wallet-modal-backdrop"><div className="wallet-modal-panel" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={panel}>{children}</div></div>
}
