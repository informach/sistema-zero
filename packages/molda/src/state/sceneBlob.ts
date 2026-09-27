import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'

export type SceneBlobFailure = 'invalid' | 'unsupported' | 'missing' | 'integrity' | 'budget'
export class SceneBlobError extends Error {
  override readonly name = 'SceneBlobError'
  constructor(
    readonly reason: SceneBlobFailure,
    message: string,
  ) {
    super(message)
  }
}

export interface ScenePixelReference {
  kind: 'scene-pixels'
  algorithm: 'sha256'
  hash: string
  byteLength: number
}

export const MAX_SCENE_PIXEL_BLOB_BYTES = SCENE_LIMITS.imageSide ** 2 * 4

export function isScenePixelHash(raw: unknown): raw is string {
  return typeof raw === 'string' && /^[a-f0-9]{64}$/.test(raw)
}

/** Exact chosen-interval equality, without per-byte callbacks or copying payloads. No shared backing. */
export function sameScenePixelBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (
    left.byteLength !== right.byteLength ||
    !(left.buffer instanceof ArrayBuffer) ||
    !(right.buffer instanceof ArrayBuffer)
  )
    return false
  // Construct views, not copies; this also rejects detached backing even for a zero-length input.
  const a = new Uint8Array(left.buffer, left.byteOffset, left.byteLength)
  const b = new Uint8Array(right.buffer, right.byteOffset, right.byteLength)
  let offset = 0
  if (a.byteOffset % 4 === 0 && b.byteOffset % 4 === 0) {
    const length = Math.floor(a.length / 4)
    const wordsA = new Uint32Array(a.buffer, a.byteOffset, length)
    const wordsB = new Uint32Array(b.buffer, b.byteOffset, length)
    for (let i = 0; i < length; i++) if (wordsA[i] !== wordsB[i]) return false
    offset = length * 4
  }
  for (; offset < a.length; offset++) if (a[offset] !== b[offset]) return false
  return true
}

/** Checks the chosen interval without copying or accepting concurrently mutable backing memory. */
export function checkScenePixelBytes(raw: unknown, byteLength?: number): asserts raw is Uint8Array {
  if (!(raw instanceof Uint8Array) || !(raw.buffer instanceof ArrayBuffer) || raw.byteLength < 1)
    throw new SceneBlobError('invalid', 'Os pixels guardados não são válidos.')
  if (raw.byteLength > MAX_SCENE_PIXEL_BLOB_BYTES)
    throw new SceneBlobError('budget', 'A camada ultrapassa o tamanho permitido.')
  if (byteLength !== undefined && raw.byteLength !== byteLength)
    throw new SceneBlobError('integrity', 'A camada não tem a quantidade de pixels esperada.')
}

export function readScenePixelReference(raw: unknown, byteLength: number): ScenePixelReference {
  const row = v.record(raw, 'pixels', ['kind', 'algorithm', 'hash', 'byteLength'])
  v.requireScene(
    row.kind === 'scene-pixels' &&
      row.algorithm === 'sha256' &&
      isScenePixelHash(row.hash) &&
      row.byteLength === byteLength,
    'pixels',
    'Referência de pixels inválida.',
  )
  return { kind: 'scene-pixels', algorithm: 'sha256', hash: row.hash, byteLength }
}

/**
 * SHA-256 over raw bytes, never JSON/gzip. WebCrypto snapshots BufferSource during
 * the digest call; batch callers must own ALL their inputs before awaiting this.
 */
export async function scenePixelHash(pixels: Uint8Array, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted()
  checkScenePixelBytes(pixels)
  if (typeof crypto === 'undefined' || typeof crypto.subtle?.digest !== 'function')
    throw new SceneBlobError('unsupported', 'Este navegador não pode conferir os pixels guardados.')
  // Narrow the backing type for BufferSource, respecting subarray boundaries without another copy.
  const buffer = pixels.buffer
  if (!(buffer instanceof ArrayBuffer))
    throw new SceneBlobError('invalid', 'Pixels compartilhados.')
  const pending = crypto.subtle.digest(
    'SHA-256',
    new Uint8Array(buffer, pixels.byteOffset, pixels.byteLength),
  )
  const hash = await pending
  signal?.throwIfAborted()
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
