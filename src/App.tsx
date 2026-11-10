import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { useSession } from "./account/session"
import { Activity } from "./screens/Activity"
import { CreateAccount } from "./screens/CreateAccount"
import { Help } from "./screens/Help"
import { Landing } from "./screens/Landing"
import { Receive } from "./screens/Receive"
import { SendFlow } from "./screens/SendFlow"
import { Settings } from "./screens/Settings"
import { Shell } from "./screens/Shell"
import { Unlock } from "./screens/Unlock"

export function App() { return <BrowserRouter><AppRoutes /></BrowserRouter> }

function AppRoutes() {
  const session = useSession()
  const navigate = useNavigate()
  if (session.status === "loading") return <main className="route-splash" aria-busy="true"><div className="splash-mark" aria-hidden="true"><span>R</span></div><p className="auth-kicker">RPay · Devnet</p><h1>Opening your wallet</h1><p>Checking this device securely.</p><div className="splash-loader" role="status"><i aria-hidden="true" /><span>Loading wallet</span></div></main>
  const entry = session.status === "unlocked" ? "/wallet" : session.status === "locked" ? "/unlock" : "/create"
  return <Routes>
    <Route path="/" element={<Landing onOpen={() => navigate(entry)} />} />
    <Route path="/create" element={session.status === "none" ? <AuthFrame><CreateAccount /></AuthFrame> : <Navigate to={entry} replace />} />
    <Route path="/unlock" element={session.status === "unlocked" ? <Navigate to="/wallet" replace /> : <AuthFrame><Unlock /></AuthFrame>} />
    <Route path="/wallet" element={<Wallet tab="home" />} />
    <Route path="/activity" element={<Wallet tab="activity" />} />
    <Route path="/relay" element={<Wallet tab="relay" />} />
    <Route path="/help" element={<Navigate to="/relay" replace />} />
    <Route path="/settings" element={<Wallet tab="settings" />} />
    <Route path="/send" element={session.status === "unlocked" ? <SendFlow onClose={() => navigate("/wallet")} /> : <Navigate to="/" replace />} />
    <Route path="/receive" element={session.status === "unlocked" ? <Receive onClose={() => navigate("/wallet")} /> : <Navigate to="/" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><header className="auth-top"><a className="auth-wordmark" href="/"><span>R</span> RPay</a><p><i /> Devnet</p></header><div className="auth-stage"><aside className="auth-story"><p className="auth-kicker">Payments beyond connectivity</p><h1>Your wallet stays yours.</h1><p>Send directly when you’re online. Use a nearby connection when you’re not—without sharing access to your money.</p><div className="auth-proof"><span>01</span><p><strong>Self-custody first</strong>Your recovery phrase and payment approvals stay with you.</p></div></aside><section className="auth-card">{children}</section></div></main>
}

function Wallet({ tab }: { tab: "home" | "activity" | "relay" | "settings" }) {
  const session = useSession(); const navigate = useNavigate()
  if (session.status !== "unlocked") return <Navigate to={session.status === "locked" ? "/unlock" : "/create"} replace />
  return <Shell tab={tab} onTab={(next) => navigate(next === "home" ? "/wallet" : `/${next}`)} onSend={() => navigate("/send")} onReceive={() => navigate("/receive")} onRelay={() => navigate("/relay")} activity={<Activity />} relay={<Help />} settings={<Settings />} />
}
