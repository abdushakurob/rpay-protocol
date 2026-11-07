import type { VercelRequest, VercelResponse } from "@vercel/node"

type Entry = { alias: string; publicKey: string }

const BOOK_KEY = "rpay:directory:book"

function isAlias(value: string) {
  return /^[a-z0-9]{3,20}$/.test(value)
}

function isAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)
}

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ""), token }
}

async function readBook(): Promise<Record<string, Entry> | null> {
  const redis = redisEnv()
  if (!redis) return null
  const response = await fetch(`${redis.url}/get/${encodeURIComponent(BOOK_KEY)}`, {
    headers: { Authorization: `Bearer ${redis.token}` },
  })
  if (!response.ok) return {}
  const body = (await response.json()) as { result?: string | null }
  if (!body.result) return {}
  try {
    return JSON.parse(body.result) as Record<string, Entry>
  } catch {
    return {}
  }
}

async function writeBook(book: Record<string, Entry>) {
  const redis = redisEnv()
  if (!redis) throw new Error("missing")
  const response = await fetch(`${redis.url}/set/${encodeURIComponent(BOOK_KEY)}/${encodeURIComponent(JSON.stringify(book))}`, {
    headers: { Authorization: `Bearer ${redis.token}` },
  })
  if (!response.ok) throw new Error("write")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("access-control-allow-origin", "*")
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS")
  res.setHeader("access-control-allow-headers", "content-type")
  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method === "GET") {
    try {
      const book = await readBook()
      if (book === null) {
        res.status(200).json({})
        return
      }
      const alias = typeof req.query.alias === "string" ? req.query.alias : ""
      if (!alias) {
        res.status(200).json(book)
        return
      }
      const entry = book[alias]
      res.status(entry ? 200 : 404).json(entry ?? null)
    } catch {
      res.status(200).json({})
    }
    return
  }

  if (req.method === "POST") {
    try {
      const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as Partial<Entry>
      if (!body.alias || !body.publicKey || !isAlias(body.alias) || !isAddress(body.publicKey)) {
        res.status(400).json({ error: "invalid" })
        return
      }
      const book = await readBook()
      if (book === null) {
        res.status(503).json({ error: "directory_unavailable" })
        return
      }
      const existing = book[body.alias]
      if (existing && existing.publicKey !== body.publicKey) {
        res.status(409).json({ error: "taken" })
        return
      }
      const entry: Entry = { alias: body.alias, publicKey: body.publicKey }
      book[body.alias] = entry
      await writeBook(book)
      res.status(200).json(entry)
    } catch {
      res.status(503).json({ error: "directory_unavailable" })
    }
    return
  }

  res.status(405).end()
}
