import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import {
  isStudioProPublication,
  isStudioProValidationIdentity,
  isStudioPublicationHash,
  isStudioPublicationId,
  parseStudioArtifactManifest,
  STUDIO_PRO_PUBLICATION_LIMITS,
  type StudioProPublication,
  type StudioProPublishedRevision,
  validStudioArtifactPath,
} from '@sistemazero/core/studio'
import {
  type ArtifactBucket,
  artifactPrefix,
  serveCompiledFile,
  sha256,
  unavailableArtifact,
} from './artifacts'

/** R2 conditional writes serialize pointer changes without an application-local lock. */
export interface PublicationBucket extends ArtifactBucket {
  list(options: { prefix: string; limit: number; cursor?: string }): Promise<{
    objects: { key: string; uploaded: Date }[]
    truncated: boolean
    cursor?: string
  }>
  get(
    key: string,
  ): Promise<{ body: ReadableStream; size: number; etag: string; text(): Promise<string> } | null>
  put(
    key: string,
    value: Uint8Array | string,
    options?: { sha256?: string; onlyIf?: Headers },
  ): Promise<{ etag: string } | null>
}

interface Revision extends StudioProPublishedRevision {
  requestId: string
}
interface StoredPublication extends StudioProPublication {
  owner: string
  parentOrigin: string
  projectId: string
  revisions: Revision[]
  lastOperation: { id: string; revision: string; disabled: boolean }
}
export class PublicationError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409 | 413,
    message: string,
  ) {
    super(message)
  }
}
export const publicationKey = (playId: string) => `publications/${playId}/state.json`
export const publishedRevisionPrefix = (playId: string, revision: string) =>
  `published/${playId}/${revision}/`
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new PublicationError(400, 'Publicação inválida.')
  return value as Record<string, unknown>
}
function origin(value: unknown): string {
  if (typeof value !== 'string') throw new PublicationError(400, 'Origem inválida.')
  const url = new URL(value)
  if (
    url.origin !== value ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
    )
  )
    throw new PublicationError(400, 'Origem inválida.')
  return value
}
async function readState(bucket: PublicationBucket, playId: string) {
  const stored = await bucket.get(publicationKey(playId))
  if (!stored) return null
  if (stored.size > 32_768) throw new PublicationError(409, 'Registro de publicação inválido.')
  const raw: unknown = JSON.parse(await stored.text())
  const value = object(raw)
  // A minimal tombstone remains at the CAS key. Even a promotion that started
  // before moderation cannot recreate a removed publication with If-None-Match.
  if (value.deleted === true && value.playId === playId) return null
  if (
    !isStudioProPublication(raw) ||
    raw.playId !== playId ||
    !isStudioPublicationHash(value.owner) ||
    typeof value.projectId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.projectId)
  )
    throw new PublicationError(409, 'Registro de publicação inválido.')
  const parentOrigin = origin(value.parentOrigin)
  const revisions = raw.revisions.map((revision) => {
    const requestId = object(revision).requestId
    if (!isStudioPublicationId(requestId)) throw new PublicationError(409, 'Histórico inválido.')
    return { ...revision, requestId }
  })
  const last = object(value.lastOperation)
  if (
    !isStudioPublicationId(last.id) ||
    !isStudioPublicationHash(last.revision) ||
    typeof last.disabled !== 'boolean'
  )
    throw new PublicationError(409, 'Operação inválida.')
  const state: StoredPublication = {
    ...raw,
    owner: value.owner,
    projectId: value.projectId,
    parentOrigin,
    revisions,
    lastOperation: { id: last.id, revision: last.revision, disabled: last.disabled },
  }
  return { state, etag: stored.etag }
}
const view = (state: StoredPublication): StudioProPublication => ({
  playId: state.playId,
  version: state.version,
  activeRevision: state.activeRevision,
  disabled: state.disabled,
  revisions: state.revisions.map(({ requestId: _requestId, ...revision }) => revision),
})
async function commit(bucket: PublicationBucket, state: StoredPublication, etag?: string) {
  const written = await bucket.put(publicationKey(state.playId), JSON.stringify(state), {
    onlyIf: new Headers(etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }),
  })
  if (!written)
    throw new PublicationError(
      409,
      'A publicação mudou. Atualize o histórico antes de tentar novamente.',
    )
  return view(state)
}

/** Called only behind the runtime's private bearer boundary. Owner is derived by the BFF. */
export async function publicationCommand(
  bucket: PublicationBucket,
  raw: unknown,
  now = Date.now(),
): Promise<
  | StudioProPublication
  | { source: string; publication: StudioProPublication }
  | { png: string }
  | null
> {
  const input = object(raw)
  if (!isStudioPublicationId(input.playId) || !isStudioPublicationHash(input.owner))
    throw new PublicationError(400, 'Identificação de publicação inválida.')
  const playId = input.playId,
    owner = input.owner
  const saved = await readState(bucket, playId)
  if (saved && saved.state.owner !== owner)
    throw new PublicationError(404, 'Publicação não encontrada.')
  if (input.operation === 'get') return saved ? view(saved.state) : null
  if (input.operation === 'cover') {
    if (!saved) throw new PublicationError(404, 'Publicação não encontrada.')
    const prefix = publishedRevisionPrefix(playId, saved.state.activeRevision)
    const stored = await bucket.get(`${prefix}manifest.json`)
    if (!stored || stored.size > 100_000) throw new PublicationError(404, 'Captura não encontrada.')
    const manifest = parseStudioArtifactManifest(JSON.parse(await stored.text()))
    const revision = saved.state.revisions.find((r) => r.id === saved.state.activeRevision)
    if (
      !revision ||
      (await sha256(new TextEncoder().encode(JSON.stringify(manifest)))) !== revision.artifactHash
    )
      throw new PublicationError(409, 'Captura inválida.')
    const file = manifest.files.find((file) => file.path === '__studio-proof.png')
    const content = file ? await bucket.get(`${prefix}files/${file.path}`) : null
    if (!file || !content || content.size !== file.bytes)
      throw new PublicationError(404, 'Captura não encontrada.')
    const bytes = new Uint8Array(await new Response(content.body).arrayBuffer())
    if (
      (await sha256(bytes)) !== file.sha256 ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
    )
      throw new PublicationError(409, 'Captura inválida.')
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    return { png: btoa(binary) }
  }
  if (input.operation === 'lookup') {
    if (!isStudioPublicationId(input.requestId) || !isStudioPublicationHash(input.sourceHash))
      throw new PublicationError(400, 'Operação inválida.')
    const revision = saved?.state.revisions.find((r) => r.requestId === input.requestId)
    if (!revision || !saved) return null
    if (revision.sourceHash !== input.sourceHash)
      throw new PublicationError(409, 'Esta operação já foi usada com outra fonte.')
    return view(saved.state)
  }
  if (input.operation === 'source') {
    if (!saved) throw new PublicationError(404, 'Publicação não encontrada.')
    const revision = saved.state.revisions.find((r) => r.id === input.revision)
    if (!revision) throw new PublicationError(404, 'Revisão não encontrada.')
    const source = await readSource(bucket, playId, revision)
    return { source, publication: view(saved.state) }
  }
  if (
    !isStudioPublicationId(input.requestId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    Number(input.expectedVersion) < 0
  )
    throw new PublicationError(400, 'Versão ou operação inválida.')
  if (input.operation === 'activate') {
    if (!saved) throw new PublicationError(404, 'Publicação não encontrada.')
    const state = saved.state
    if (
      !isStudioPublicationHash(input.revision) ||
      typeof input.disabled !== 'boolean' ||
      !state.revisions.some((r) => r.id === input.revision)
    )
      throw new PublicationError(400, 'Revisão inválida.')
    if (state.lastOperation.id === input.requestId) {
      if (
        state.lastOperation.revision !== input.revision ||
        state.lastOperation.disabled !== input.disabled
      )
        throw new PublicationError(409, 'Esta operação já foi usada com outro conteúdo.')
      return view(state)
    }
    if (state.version !== input.expectedVersion)
      throw new PublicationError(409, 'A publicação mudou. Atualize o histórico.')
    return commit(
      bucket,
      {
        ...state,
        version: state.version + 1,
        activeRevision: input.revision,
        disabled: input.disabled,
        lastOperation: { id: input.requestId, revision: input.revision, disabled: input.disabled },
      },
      saved.etag,
    )
  }
  if (
    input.operation !== 'promote' ||
    typeof input.source !== 'string' ||
    !isStudioPublicationHash(input.artifactId) ||
    !isStudioPublicationHash(input.artifactHash) ||
    typeof input.projectId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(input.projectId)
  )
    throw new PublicationError(400, 'Revisão de publicação inválida.')
  const parentOrigin = origin(input.parentOrigin)
  const sourceBytes = new TextEncoder().encode(input.source)
  if (sourceBytes.length > STUDIO_PRO_PUBLICATION_LIMITS.maxSourceBytes)
    throw new PublicationError(413, 'Fonte grande demais.')
  const sourceHash = await sha256(sourceBytes)
  if (saved) {
    if (saved.state.projectId !== input.projectId || saved.state.parentOrigin !== parentOrigin)
      throw new PublicationError(409, 'A publicação pertence a outro projeto ou ambiente.')
    const previous = saved.state.revisions.find((r) => r.requestId === input.requestId)
    if (previous) {
      if (previous.sourceHash !== sourceHash)
        throw new PublicationError(409, 'Esta operação já foi usada com outra fonte.')
      return view(saved.state)
    }
  }
  if ((saved?.state.version ?? 0) !== input.expectedVersion)
    throw new PublicationError(409, 'A publicação mudou. Atualize o histórico.')
  if ((saved?.state.revisions.length ?? 0) >= STUDIO_PRO_PUBLICATION_LIMITS.maxRevisions)
    throw new PublicationError(
      409,
      'O histórico atingiu 20 versões. Crie uma nova publicação para continuar.',
    )
  const preview = await bucket.get(`${artifactPrefix(input.artifactId)}manifest.json`)
  if (!preview || preview.size > 100_000)
    throw new PublicationError(404, 'Compilação não encontrada.')
  const metadata = object(JSON.parse(await preview.text()))
  const manifest = parseStudioArtifactManifest(metadata)
  if (
    metadata.validated !== true ||
    !isStudioProValidationIdentity(metadata.validation) ||
    metadata.parentOrigin !== parentOrigin ||
    !Number.isSafeInteger(metadata.expiresAt) ||
    Number(metadata.expiresAt) <= now ||
    (await sha256(new TextEncoder().encode(JSON.stringify(manifest)))) !== input.artifactHash
  )
    throw new PublicationError(
      409,
      'A compilação precisa de uma nova verificação antes de publicar.',
    )
  const id = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
  const prefix = publishedRevisionPrefix(playId, id)
  const written: string[] = []
  try {
    for (const file of manifest.files) {
      const content = await bucket.get(`${artifactPrefix(input.artifactId)}files/${file.path}`)
      if (!content || content.size !== file.bytes)
        throw new PublicationError(409, 'Arquivo compilado incompleto.')
      const bytes = new Uint8Array(await new Response(content.body).arrayBuffer())
      if ((await sha256(bytes)) !== file.sha256)
        throw new PublicationError(409, 'Arquivo compilado alterado.')
      const key = `${prefix}files/${file.path}`
      written.push(key)
      await bucket.put(key, bytes, { sha256: file.sha256 })
    }
    written.push(`${prefix}source.json`, `${prefix}manifest.json`)
    await bucket.put(`${prefix}source.json`, sourceBytes, { sha256: sourceHash })
    await bucket.put(`${prefix}manifest.json`, JSON.stringify(manifest))
  } catch (error) {
    await bucket
      .delete(written)
      .catch(() =>
        console.error('[studio-publication] partial revision cleanup pending', { playId, id }),
      )
    throw error
  }
  const revision: Revision = {
    id,
    requestId: input.requestId,
    sourceHash,
    artifactHash: input.artifactHash,
    createdAt: now,
    validation: metadata.validation,
  }
  // Do not delete on an ambiguous commit failure: R2 may have accepted the pointer.
  try {
    return await commit(
      bucket,
      {
        playId,
        owner,
        projectId: input.projectId,
        parentOrigin,
        version: (saved?.state.version ?? 0) + 1,
        activeRevision: id,
        disabled: false,
        revisions: [...(saved?.state.revisions ?? []), revision],
        lastOperation: { id: input.requestId, revision: id, disabled: false },
      },
      saved?.etag,
    )
  } catch (error) {
    if (error instanceof PublicationError && error.status === 409)
      await bucket.delete(written).catch(() =>
        console.error('[studio-publication] conflicting revision cleanup pending', {
          playId,
          id,
        }),
      )
    throw error
  }
}

/** Private moderation operation; no author data is retained in the tombstone. */
export async function purgePublication(
  bucket: PublicationBucket,
  playId: string,
  now = Date.now(),
) {
  if (!isStudioPublicationId(playId)) throw new PublicationError(400, 'Publicação inválida.')
  await bucket.put(
    publicationKey(playId),
    JSON.stringify({ playId, deleted: true, deletedAt: now }),
  )
  const page = await bucket.list({ prefix: `published/${playId}/`, limit: 1000 })
  if (page.objects.length) await bucket.delete(page.objects.map((file) => file.key))
  return { deleted: true as const }
}

const GC_CURSOR_KEY = 'maintenance/publications-cursor.json'
const ORPHAN_GRACE_MS = 48 * 60 * 60 * 1000
/** One bounded page per cron; retained history is never pruned by age. */
export async function collectPublicationGarbage(bucket: PublicationBucket, now = Date.now()) {
  const checkpoint = await bucket.get(GC_CURSOR_KEY)
  let cursor: string | undefined
  if (checkpoint && checkpoint.size <= 4096) {
    const raw: unknown = JSON.parse(await checkpoint.text())
    if (raw && typeof raw === 'object' && 'cursor' in raw && typeof raw.cursor === 'string')
      cursor = raw.cursor
  }
  const page = await bucket.list({
    prefix: 'published/',
    limit: 1000,
    ...(cursor ? { cursor } : {}),
  })
  const retained = new Map<string, Set<string>>()
  const remove: string[] = []
  for (const file of page.objects) {
    const match = /^published\/([a-f0-9-]{36})\/([a-f0-9]{64})\//.exec(file.key)
    if (!match || !isStudioPublicationId(match[1]) || !match[2]) continue
    // Fresh objects may belong to an in-flight copy or an ambiguous CAS response.
    if (
      !Number.isFinite(file.uploaded.getTime()) ||
      now - file.uploaded.getTime() < ORPHAN_GRACE_MS
    )
      continue
    const playId = match[1]
    let revisions = retained.get(playId)
    if (!revisions) {
      const saved = await readState(bucket, playId)
      revisions = new Set(saved?.state.revisions.map((r) => r.id))
      retained.set(playId, revisions)
    }
    if (!revisions.has(match[2])) remove.push(file.key)
  }
  if (remove.length) await bucket.delete(remove)
  // Commit after deletion; failed batches are safe to repeat. Concurrent cron
  // runs can repeat work, but neither can remove a referenced immutable revision.
  await bucket.put(
    GC_CURSOR_KEY,
    JSON.stringify({ cursor: page.truncated ? page.cursor : undefined }),
  )
  return { scanned: page.objects.length, removed: remove.length }
}

async function readSource(
  bucket: PublicationBucket,
  playId: string,
  revision: StudioProPublishedRevision,
): Promise<string> {
  const content = await bucket.get(`${publishedRevisionPrefix(playId, revision.id)}source.json`)
  if (!content || content.size > STUDIO_PRO_PUBLICATION_LIMITS.maxSourceBytes)
    throw new PublicationError(404, 'Fonte não encontrada.')
  const source = await content.text()
  if ((await sha256(new TextEncoder().encode(source))) !== revision.sourceHash)
    throw new PublicationError(409, 'Fonte inválida.')
  return source
}

export async function currentPublishedSource(bucket: PublicationBucket, playId: string) {
  const saved = await readState(bucket, playId)
  if (!saved || saved.state.disabled) return null
  const revision = saved.state.revisions.find((r) => r.id === saved.state.activeRevision)
  if (!revision) return null
  return { source: await readSource(bucket, playId, revision), publication: view(saved.state) }
}

/** Every request is gated; conditional 304 responses cannot bypass moderation or rollback. */
export async function servePublishedArtifact(
  request: Request,
  bucket: PublicationBucket,
  authorize: (playId: string) => Promise<boolean>,
): Promise<Response> {
  const url = new URL(request.url)
  const match = /^\/v1\/published\/([a-f0-9-]{36})\/([a-f0-9]{64})\/(.+)$/.exec(url.pathname)
  const [, playId, revisionId, path] = match ?? []
  if (
    !isStudioPublicationId(playId) ||
    !revisionId ||
    !path ||
    !validStudioArtifactPath(path) ||
    !['GET', 'HEAD'].includes(request.method)
  )
    return unavailableArtifact()
  const saved = await readState(bucket, playId)
  if (
    !saved ||
    saved.state.disabled ||
    saved.state.activeRevision !== revisionId ||
    !(await authorize(playId))
  )
    return unavailableArtifact()
  const prefix = publishedRevisionPrefix(playId, revisionId)
  const stored = await bucket.get(`${prefix}manifest.json`)
  if (!stored || stored.size > 100_000) return unavailableArtifact()
  const manifest = parseStudioArtifactManifest(JSON.parse(await stored.text()))
  const revision = saved.state.revisions.find((r) => r.id === revisionId)
  if (
    !revision ||
    (await sha256(new TextEncoder().encode(JSON.stringify(manifest)))) !== revision.artifactHash
  )
    return unavailableArtifact()
  return serveCompiledFile({
    request,
    bucket,
    prefix,
    path,
    manifest,
    parentOrigin: saved.state.parentOrigin,
    base: `${url.origin}/v1/published/${playId}/${revisionId}/`,
    cacheControl: 'private, no-cache, must-revalidate',
  })
}

/** The endpoint is configuration, never a URL taken from a project or request. No redirect or cookies. */
export function createPublicationAuthorizer(
  endpoint: string | undefined,
  token: string,
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = fetch,
) {
  const pending = new Map<string, Promise<boolean>>()
  return (playId: string): Promise<boolean> => {
    if (!endpoint || !token || !isStudioPublicationId(playId)) return Promise.resolve(false)
    const current = pending.get(playId)
    if (current) return current
    if (pending.size >= 1000) return Promise.resolve(false)
    const result = Promise.resolve()
      .then(async () => {
        try {
          const response = await fetchImpl(endpoint, {
            method: 'POST',
            redirect: 'error',
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ playId }),
            signal: AbortSignal.timeout(5000),
          })
          if (!response.ok) return false
          const value = object(await readJsonBodyWithLimit(response, 1024))
          return value.visible === true
        } catch {
          return false
        }
      })
      .finally(() => {
        pending.delete(playId)
      })
    pending.set(playId, result)
    return result
  }
}
