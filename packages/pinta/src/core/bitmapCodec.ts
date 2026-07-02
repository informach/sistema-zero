/**
 * Codec do bitmap indexado para o `.pinta.json` (backup/portabilidade): RLE de
 * pares (contagem, índice) + base64. O IndexedDB NÃO usa isto (Uint8Array passa
 * no structured clone); só o JSON precisa de texto compacto — um cenário
 * 480×360 quase vazio vira poucos bytes em vez de 170 KB de array.
 */
import type { PintaBitmap } from './project'

/** RLE: pares [contagem (1–255), índice]. */
function rleEncode(data: Uint8Array): Uint8Array {
  const out: number[] = []
  let i = 0
  while (i < data.length) {
    const value = data[i] ?? 0
    let run = 1
    while (i + run < data.length && data[i + run] === value && run < 255) run += 1
    out.push(run, value)
    i += run
  }
  return new Uint8Array(out)
}

function rleDecode(encoded: Uint8Array, expectedLength: number): Uint8Array | null {
  const out = new Uint8Array(expectedLength)
  let at = 0
  for (let i = 0; i + 1 < encoded.length; i += 2) {
    const run = encoded[i] ?? 0
    const value = encoded[i + 1] ?? 0
    if (at + run > expectedLength) return null
    out.fill(value, at, at + run)
    at += run
  }
  return at === expectedLength ? out : null
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(text: string): Uint8Array | null {
  try {
    const binary = atob(text)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

export interface EncodedBitmap {
  width: number
  height: number
  /** RLE (pares contagem/índice) em base64. */
  rle: string
}

export function encodeBitmap(bitmap: PintaBitmap): EncodedBitmap {
  return {
    width: bitmap.width,
    height: bitmap.height,
    rle: bytesToBase64(rleEncode(bitmap.data)),
  }
}

/** `null` = registro corrompido (o import descarta com aviso). */
export function decodeBitmap(raw: unknown): PintaBitmap | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  if (typeof e.width !== 'number' || typeof e.height !== 'number' || typeof e.rle !== 'string') {
    return null
  }
  if (!Number.isInteger(e.width) || !Number.isInteger(e.height) || e.width < 1 || e.height < 1) {
    return null
  }
  const bytes = base64ToBytes(e.rle)
  if (!bytes) return null
  const data = rleDecode(bytes, e.width * e.height)
  if (!data) return null
  return { width: e.width, height: e.height, data }
}
