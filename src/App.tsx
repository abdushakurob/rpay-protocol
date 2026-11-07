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
  if (session.status === "loading") return <main className="route-splash">Opening your secure wallet…</main>
  const entry = session.status === "unlocked" ? "/wallet" : session.status === "locked" ? "/unlock" : "/create"
  return <Routes>
    <Route path="/" element={<Landing onOpen={() => navigate(entry)} />} />
    <Route path="/create" element={session.status === "none" ? <AuthFrame><CreateAccount /></AuthFrame> : <Navigate to={entry} replace />} />
    <Route path="/unlock" element={session.status === "locked" ? <AuthFrame><Unlock /></AuthFrame> : <Navigate to={entry} replace />} />
    <Route path="/wallet" element={<Wallet tab="home" />} />
    <Route path="/activity" element={<Wallet tab="activity" />} />
    <Route path="/help" element={<Wallet tab="help" />} />
    <Route path="/settings" element={<Wallet tab="settings" />} />
    <Route path="/send" element={session.status === "unlocked" ? <SendFlow onClose={() => navigate("/wallet")} /> : <Navigate to="/" replace />} />
    <Route path="/receive" element={session.status === "unlocked" ? <Receive onClose={() => navigate("/wallet")} /> : <Navigate to="/" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

function AuthFrame({ children }: { children: React.ReactNode }) { return <main className="auth-page"><a className="brand" href="/">RPay <span>Protocol</span></a><section className="auth-card">{children}</section></main> }

function Wallet({ tab }: { tab: "home" | "activity" | "help" | "settings" }) {
  const session = useSession(); const navigate = useNavigate()
  if (session.status !== "unlocked") return <Navigate to={session.status === "locked" ? "/unlock" : "/create"} replace />
  return <Shell tab={tab} onTab={(next) => navigate(next === "home" ? "/wallet" : `/${next}`)} onSend={() => navigate("/send")} onReceive={() => navigate("/receive")} activity={<Activity />} help={<Help />} settings={<Settings />} />
}
