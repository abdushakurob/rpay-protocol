import "./polyfill"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import { SessionProvider } from "./account/session"
import { App } from "./App"
import "./styles.css"
import "./site/site.css"
import "./site/home.css"
import "./site/docs-v2.css"
import "./wallet-refresh.css"

registerSW({ immediate: true })

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
)
