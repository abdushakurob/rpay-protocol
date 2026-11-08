import { chromium } from "playwright"
import { mkdirSync, renameSync, readdirSync } from "node:fs"
import path from "node:path"

const outDir = path.resolve("docs/mlh")
mkdirSync(outDir, { recursive: true })
const base = process.env.DEMO_BASE || "https://rpay-seven.vercel.app"

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
})
const page = await context.newPage()

async function pause(ms) {
  await page.waitForTimeout(ms)
}

await page.goto(base, { waitUntil: "domcontentloaded" })
await pause(2500)
await page.getByRole("link", { name: "How it works" }).first().click()
await pause(3000)
await page.goto(`${base}/create`, { waitUntil: "domcontentloaded" })
await pause(3000)
await page.goto(base, { waitUntil: "domcontentloaded" })
await pause(2000)
await page.getByRole("button", { name: /Launch RPay/i }).first().click()
await pause(2500)

await page.close()
await context.close()
await browser.close()

const webmPath = path.join(outDir, "rpay-demo.webm")
const loose = readdirSync(outDir).find((name) => name.endsWith(".webm"))
if (loose) {
  const from = path.join(outDir, loose)
  if (from !== webmPath) renameSync(from, webmPath)
  console.log(`Saved ${webmPath}`)
} else {
  console.error("No webm recording found in", outDir)
  process.exit(1)
}
