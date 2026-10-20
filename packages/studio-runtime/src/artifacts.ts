import { encodeOwnedUtf8 } from '@sistemazero/core/creations'
import {
  parseStudioArtifactManifest,
  STUDIO_PRO_ARTIFACT_LIMITS,
  type StudioProArtifact,
  type StudioProArtifactManifest,
  type StudioProValidationIdentity,
  validStudioArtifactPath,
} from '@sistemazero/core/studio'

/** Narrow storage port; the R2 binding implements it without an in-memory file cache. */
export interface ArtifactBucket {
  get(key: string): Promise<{ body: ReadableStream; size: number; text(): Promise<string> } | null>
  put(key: string, value: Uint8Array | string, options?: { sha256?: string }): Promise<unknown>
  delete(keys: string[]): Promise<void>
}

export interface StoredManifest extends StudioProArtifactManifest {
  expiresAt: number
  parentOrigin: string
  validated?: boolean
  validation?: StudioProValidationIdentity
}
export const artifactPrefix = (id: string) => `previews/${id}/`
export async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function storeArtifact(options: {
  bucket: ArtifactBucket
  origin: string
  parentOrigin: string
  manifest: unknown
  read(path: string): Promise<Uint8Array<ArrayBuffer>>
  now?: number
  validation?: StudioProValidationIdentity
}): Promise<StudioProArtifact> {
  const manifest = parseStudioArtifactManifest(options.manifest)
  const id = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
  const prefix = artifactPrefix(id)
  const expiresAt = (options.now ?? Date.now()) + STUDIO_PRO_ARTIFACT_LIMITS.previewLifetimeMs
  const stored: StoredManifest = {
    ...manifest,
    expiresAt,
    parentOrigin: options.parentOrigin,
    validated: Boolean(options.validation),
    ...(options.validation ? { validation: options.validation } : {}),
  }
  const written: string[] = []
  try {
    for (const file of manifest.files) {
      const bytes = await options.read(file.path)
      if (bytes.byteLength !== file.bytes || (await sha256(bytes)) !== file.sha256)
        throw new Error('O arquivo compilado falhou na verificação de integridade.')
      const key = `${prefix}files/${file.path}`
      // Include the attempted key in cleanup even if the response is lost after a successful put.
      written.push(key)
      await options.bucket.put(key, bytes, { sha256: file.sha256 })
    }
    written.push(`${prefix}manifest.json`)
    // Commit marker last: a partial build is never accessible to readers.
    await options.bucket.put(`${prefix}manifest.json`, JSON.stringify(stored))
  } catch (error) {
    try {
      await options.bucket.delete(written)
    } catch (cleanupError) {
      console.error('studio-runtime artifact cleanup failed', cleanupError)
    }
    throw error
  }
  return {
    id,
    url: `${options.origin}/v1/artifacts/${id}/index.html`,
    expiresAt,
    sha256: await sha256(encodeOwnedUtf8(JSON.stringify(manifest))),
  }
}

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json',
  webmanifest: 'application/manifest+json',
  png: 'image/png',
  bmp: 'image/bmp',
  hdr: 'image/vnd.radiance',
  webm: 'video/webm',
  m4a: 'audio/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  ico: 'image/x-icon',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  bin: 'application/octet-stream',
  wasm: 'application/wasm',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  txt: 'text/plain; charset=utf-8',
}
export const unavailableArtifact = () =>
  new Response('Preview indisponível. Execute o projeto novamente.', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })

export async function serveArtifact(
  request: Request,
  bucket: ArtifactBucket,
  now = Date.now(),
): Promise<Response> {
  const url = new URL(request.url)
  const match = /^\/v1\/artifacts\/([a-f0-9]{64})\/(.+)$/.exec(url.pathname)
  const id = match?.[1]
  const path = match?.[2]
  if (!id || !path || !validStudioArtifactPath(path) || !['GET', 'HEAD'].includes(request.method))
    return unavailableArtifact()
  const prefix = artifactPrefix(id)
  const stored = await bucket.get(`${prefix}manifest.json`)
  if (!stored || stored.size > 100_000) return unavailableArtifact()
  let manifest: StudioProArtifactManifest
  let metadata: StoredManifest
  try {
    const raw: unknown = JSON.parse(await stored.text())
    manifest = parseStudioArtifactManifest(raw)
    metadata = raw as StoredManifest
    const origin = new URL(metadata.parentOrigin)
    if (origin.origin !== metadata.parentOrigin || !['https:', 'http:'].includes(origin.protocol))
      return unavailableArtifact()
  } catch {
    return unavailableArtifact()
  }
  if (!Number.isSafeInteger(metadata.expiresAt) || metadata.expiresAt <= now)
    return unavailableArtifact()
  return serveCompiledFile({
    request,
    bucket,
    prefix,
    path,
    manifest,
    parentOrigin: metadata.parentOrigin,
    base: `${url.origin}/v1/artifacts/${id}/`,
    cacheControl: `private, max-age=${Math.max(0, Math.min(3600, Math.floor((metadata.expiresAt - now) / 1000)))}, immutable`,
  })
}

/** Shared origin isolation for temporary previews and durable published revisions. */
export async function serveCompiledFile(options: {
  request: Request
  bucket: ArtifactBucket
  prefix: string
  path: string
  manifest: StudioProArtifactManifest
  parentOrigin: string
  base: string
  cacheControl: string
}): Promise<Response> {
  const { request, bucket, prefix, path, manifest, parentOrigin, base, cacheControl } = options
  const file = manifest.files.find((entry) => entry.path === path)
  if (!file) return unavailableArtifact()
  const object = await bucket.get(`${prefix}files/${path}`)
  if (!object || object.size !== file.bytes) return unavailableArtifact()
  const csp = [
    "default-src 'none'",
    'sandbox allow-scripts allow-pointer-lock',
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
    `frame-ancestors ${parentOrigin}`,
    `script-src 'unsafe-inline' 'wasm-unsafe-eval' ${base}`,
    `style-src 'unsafe-inline' ${base}`,
    `img-src data: blob: ${base}`,
    `font-src data: ${base}`,
    `media-src data: blob: ${base}`,
    `connect-src data: blob: ${base}`,
    `worker-src blob: ${base}`,
  ].join('; ')
  // No credentials. Opaque sandbox origins need CORS for module imports, fetch and WebGL textures.
  const headers = new Headers({
    'Content-Type':
      file.contentType ??
      MIME[path.split('.').pop()?.toLowerCase() ?? ''] ??
      'application/octet-stream',
    'Content-Length': String(file.bytes),
    ETag: `"${file.sha256}"`,
    'Cache-Control': cacheControl,
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
  if (request.headers.get('if-none-match') === headers.get('etag')) {
    await object.body.cancel()
    return new Response(null, { status: 304, headers })
  }
  if (request.method === 'HEAD') await object.body.cancel()
  return new Response(request.method === 'HEAD' ? null : object.body, { headers })
}
