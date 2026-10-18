import { z } from 'zod'
import { awaitWithSignal } from '../http/await-with-signal'

/** Existing cloud snapshot limits, applied to the aggregate rather than each part separately. */
export const GALLERY_STUDIO_SOURCE_LIMITS = {
  compressedBytes: 40 * 1024 * 1024,
  jsonBytes: 128 * 1024 * 1024,
  parts: 128,
} as const
const storageKey = z.string().min(1).max(1024)
const url = z.string().min(1).max(8192)
const hash = z.string().regex(/^[a-f0-9]{64}$/)
export const GalleryStudioSourceSchema = z
  .strictObject({
    format: z.literal('sz-studio-gallery-source'),
    version: z.literal(1),
    itemId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
    revision: z.number().int().positive(),
    source: z.strictObject({ storageKey, url }),
    parts: z
      .array(z.strictObject({ hash, storageKey, url }))
      .max(GALLERY_STUDIO_SOURCE_LIMITS.parts),
  })
  .refine(
    (value) =>
      new Set(value.parts.map((part) => part.hash)).size === value.parts.length &&
      new Set(value.parts.map((part) => part.storageKey)).size === value.parts.length,
    'A cópia contém referências de partes repetidas.',
  )
export type GalleryStudioSource = z.infer<typeof GalleryStudioSourceSchema>

/** Trusted deployment base, never inferred from a signed request or learner document. */
export function galleryStudioStorageBaseURL(value: string, allowLoopbackHttp = false): URL {
  const base = new URL(value)
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.protocol !== 'https:' &&
      !(
        allowLoopbackHttp &&
        base.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
      ))
  )
    throw new Error('Configure uma base HTTPS válida para as cópias da galeria.')
  if (!base.pathname.endsWith('/')) base.pathname += '/'
  return base
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Exact JSON bytes are hashed before decoding. The caller owns locations and decompression.
 * A part reader must never derive storage locations from a learner's manifest. */
export async function materializeStudioGallerySnapshot(options: {
  readMain(signal: AbortSignal): Promise<Uint8Array>
  readPart(hash: string, signal: AbortSignal): Promise<Uint8Array>
  signal: AbortSignal
  maxJsonBytes?: number
}): Promise<unknown> {
  const { readMain, readPart } = options
  const lifetime = new AbortController()
  const signal = AbortSignal.any([options.signal, lifetime.signal])
  const limit = options.maxJsonBytes ?? GALLERY_STUDIO_SOURCE_LIMITS.jsonBytes
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > GALLERY_STUDIO_SOURCE_LIMITS.jsonBytes)
    throw new Error('Limite inválido para a cópia do projeto.')
  let consumed = 0
  const admit = (bytes: Uint8Array) => {
    signal.throwIfAborted()
    consumed += bytes.byteLength
    if (consumed > limit) throw new Error('A cópia excede o limite de leitura.')
  }
  const decode = (bytes: Uint8Array): unknown =>
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  try {
    const main = await awaitWithSignal(() => readMain(signal), signal)
    admit(main)
    const raw = decode(main)
    if (!record(raw) || raw.format !== 'sz-studio-parts') return raw
    if (
      raw.version !== 1 ||
      !record(raw.program) ||
      !Array.isArray(raw.assets) ||
      raw.assets.length > GALLERY_STUDIO_SOURCE_LIMITS.parts ||
      !raw.assets.every(
        (value): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value),
      )
    )
      throw new Error('Formato de projeto inválido.')
    const hashes = raw.assets
    const assets: unknown[] = new Array(hashes.length)
    const pending = new Map<string, Promise<unknown>>()
    let cursor = 0
    const load = (expected: string) => {
      let reading = pending.get(expected)
      if (!reading) {
        reading = (async () => {
          try {
            const bytes = await awaitWithSignal(() => readPart(expected, signal), signal)
            admit(bytes)
            if (!(bytes.buffer instanceof ArrayBuffer))
              throw new Error('A cópia usa bytes compartilhados inválidos.')
            const captured = bytes.slice()
            const digest = await crypto.subtle.digest('SHA-256', captured)
            signal.throwIfAborted()
            const actual = Array.from(new Uint8Array(digest), (byte) =>
              byte.toString(16).padStart(2, '0'),
            ).join('')
            if (actual !== expected) throw new Error('Uma imagem da cópia está corrompida.')
            return decode(captured)
          } catch (error) {
            lifetime.abort(error)
            throw error
          }
        })()
        pending.set(expected, reading)
      }
      return reading
    }
    async function worker() {
      while (cursor < hashes.length) {
        signal.throwIfAborted()
        const index = cursor++
        assets[index] = await load(hashes[index]!)
      }
    }
    await awaitWithSignal(
      () => Promise.all(Array.from({ length: Math.min(3, hashes.length) }, worker)),
      signal,
    )
    signal.throwIfAborted()
    return { ...raw.program, assets }
  } finally {
    lifetime.abort()
  }
}
