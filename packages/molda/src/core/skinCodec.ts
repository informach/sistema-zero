/**
 * Bytes ⇄ base64 para os bitmaps atravessarem JSON (backup `.molda.json`,
 * nuvem). Em BLOCOS: `String.fromCharCode(...bytes)` estoura o limite de
 * argumentos num bitmap grande (lição do GIF do Pinta).
 */
const CHUNK = 0x8000

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)))
  }
  return btoa(binary)
}

/** `null` quando não é base64 legível. */
export function base64ToBytes(text: string): Uint8Array | null {
  try {
    const binary = atob(text)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
    return out
  } catch {
    return null
  }
}
