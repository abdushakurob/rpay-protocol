import fs from "node:fs"
import path from "node:path"
import { defineConfig, type Plugin } from "vitest/config"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { PublicKey } from "@solana/web3.js"
import type { IncomingMessage, ServerResponse } from "node:http"
import { dispenseUsdtDev, faucetConfigured } from "./server/usdtFaucet.mjs"

const file = path.resolve("data/directory.json")

type Entry = { alias: string; publicKey: string }

function readBook() {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Entry>
  } catch {
    return {}
  }
}

function isAlias(value: string) {
  return /^[a-z0-9]{3,20}$/.test(value)
}

function isAddress(value: string) {
  try {
    return new PublicKey(value).toBase58() === value
  } catch {
    return false
  }
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://rpay.local")
  if (req.method === "GET") {
    const alias = url.searchParams.get("alias")
    const book = readBook()
    res.setHeader("content-type", "application/json")
    if (!alias) {
      res.end(JSON.stringify(book))
      return
    }
    const entry = book[alias]
    res.statusCode = entry ? 200 : 404
    res.end(JSON.stringify(entry ?? null))
    return
  }
  if (req.method === "POST") {
    const body = JSON.parse(await readBody(req)) as Partial<Entry>
    res.setHeader("content-type", "application/json")
    if (!body.alias || !body.publicKey || !isAlias(body.alias) || !isAddress(body.publicKey)) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: "invalid" }))
      return
    }
    const book = readBook()
    const existing = book[body.alias]
    if (existing && existing.publicKey !== body.publicKey) {
      res.statusCode = 409
      res.end(JSON.stringify({ error: "taken" }))
      return
    }
    book[body.alias] = { alias: body.alias, publicKey: body.publicKey }
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(book, null, 2))
    res.end(JSON.stringify(book[body.alias]))
    return
  }
  res.statusCode = 405
  res.end()
}

function directoryPlugin(): Plugin {
  const attach = (server: { middlewares: { use: Function } }) => {
    server.middlewares.use("/api/directory", (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
      handle(req, res).catch(next)
    })
  }
  return {
    name: "rpay-directory",
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

function usdtFaucetPlugin(): Plugin {
  const attach = (server: { middlewares: { use: Function } }) => {
    server.middlewares.use("/api/usdt-faucet", (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
      void (async () => {
        res.setHeader("content-type", "application/json")
        if (req.method === "GET") {
          res.end(JSON.stringify({ configured: faucetConfigured() }))
          return
        }
        if (req.method !== "POST") {
          res.statusCode = 405
          res.end(JSON.stringify({ error: "method" }))
          return
        }
        const body = JSON.parse(await readBody(req)) as { publicKey?: string }
        const result = await dispenseUsdtDev(body.publicKey ?? "")
        res.statusCode = result.status
        res.end(JSON.stringify(result))
      })().catch(next)
    })
  }
  return {
    name: "rpay-usdt-faucet",
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

export default defineConfig({
  plugins: [
    react(),
    directoryPlugin(),
    usdtFaucetPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "RPay",
        short_name: "RPay",
        theme_color: "#E07A56",
        background_color: "#E07A56",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@rpay/protocol": path.resolve("packages/sdk/src/index.ts"),
      stream: "stream-browserify",
      events: "events",
      // WDK → sodium-universal: browser uses JS sodium, not native bindings
      "sodium-native": "sodium-javascript",
    },
  },
  optimizeDeps: {
    include: ["sodium-javascript", "buffer"],
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "packages/sdk/src/**/*.test.ts"],
  },
})
