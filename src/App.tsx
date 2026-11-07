import { useState } from "react"
import { useSession } from "./account/session"
import { Activity } from "./screens/Activity"
import { CreateAccount } from "./screens/CreateAccount"
import { Help } from "./screens/Help"
import { Receive } from "./screens/Receive"
import { SendFlow } from "./screens/SendFlow"
import { Settings } from "./screens/Settings"
import { Shell } from "./screens/Shell"
import { Unlock } from "./screens/Unlock"
import { SiteLayout } from "./ui/SiteLayout"

type Tab = "home" | "activity" | "help" | "settings"

export function App() {
  const session = useSession()
  const [tab, setTab] = useState<Tab>("home")
  const [overlay, setOverlay] = useState<"send" | "receive" | null>(null)

  if (session.status === "loading") {
    return (
      <SiteLayout variant="auth">
        <p className="auth-splash">Opening…</p>
      </SiteLayout>
    )
  }

  if (session.status === "none") {
    return (
      <SiteLayout variant="auth">
        <CreateAccount />
      </SiteLayout>
    )
  }

  if (session.status === "locked") {
    return (
      <SiteLayout variant="auth">
        <Unlock />
      </SiteLayout>
    )
  }

  if (overlay === "send") {
    return (
      <SiteLayout variant="app">
        <SendFlow onClose={() => setOverlay(null)} />
      </SiteLayout>
    )
  }

  if (overlay === "receive") {
    return (
      <SiteLayout variant="app">
        <Receive onClose={() => setOverlay(null)} />
      </SiteLayout>
    )
  }

  return (
    <SiteLayout variant="app">
      <Shell
        tab={tab}
        onTab={setTab}
        onSend={() => setOverlay("send")}
        onReceive={() => setOverlay("receive")}
        activity={<Activity />}
        help={<Help />}
        settings={<Settings />}
      />
    </SiteLayout>
  )
}
