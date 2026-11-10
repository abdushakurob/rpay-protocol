import { wordlist } from "@scure/bip39/wordlists/english"
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39"
import { hmac } from "@noble/hashes/hmac"
import { sha512 } from "@noble/hashes/sha2"
import { Keypair } from "@solana/web3.js"

const HARDENED = 0x80000000

function slip10(seed: Uint8Array) {
  let node = hmac(sha512, new TextEncoder().encode("ed25519 seed"), seed)
  let key = node.slice(0, 32)
  let chain = node.slice(32)
  for (const index of [44, 501, 0, 0]) {
    const data = new Uint8Array(37)
    data[0] = 0
    data.set(key, 1)
    new DataView(data.buffer).setUint32(33, HARDENED + index, false)
    node = hmac(sha512, chain, data)
    key = node.slice(0, 32)
    chain = node.slice(32)
  }
  return key
}

export function createPhrase() {
  return generateMnemonic(wordlist, 128)
}

export function phraseIsValid(phrase: string) {
  return validateMnemonic(phrase.trim().toLowerCase(), wordlist)
}

export function keypairFromPhrase(phrase: string) {
  const seed = mnemonicToSeedSync(phrase.trim().toLowerCase())
  return Keypair.fromSeed(slip10(seed))
}
