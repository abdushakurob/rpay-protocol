import { describe, expect, it } from "vitest"
import { decryptSecret, encryptSecret } from "./crypto"
import { derivePath } from "ed25519-hd-key"
import { mnemonicToSeedSync } from "@scure/bip39"
import { keypairFromPhrase } from "./phrase"
import { canonicalAddress, isAlias, solToLamports } from "../format"

describe("account", () => {
  it("derives the same key from the same words", () => {
    const phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    const seed = mnemonicToSeedSync(phrase)
    const hex = [...seed].map((byte) => byte.toString(16).padStart(2, "0")).join("")
    const expected = derivePath("m/44'/501'/0'/0'", hex).key
    expect(Buffer.from(keypairFromPhrase(phrase).secretKey.slice(0, 32))).toEqual(Buffer.from(expected))
  })

  it("unlocks only with the same password", async () => {
    const cipher = await encryptSecret("correct horse", "abandon abandon abandon about", 1_000)
    await expect(decryptSecret("correct horse", cipher)).resolves.toContain("abandon")
    await expect(decryptSecret("nope", cipher)).rejects.toThrow()
  })
})

describe("payee", () => {
  it("accepts a name or a wallet address", () => {
    expect(isAlias("mina")).toBe(true)
    expect(isAlias("Mi")).toBe(false)
    expect(canonicalAddress("11111111111111111111111111111111")).toBe("11111111111111111111111111111111")
    expect(canonicalAddress("not-an-address")).toBeNull()
    expect(solToLamports("0.1")).toBe(100_000_000)
    expect(solToLamports("0")).toBeNull()
  })
})
