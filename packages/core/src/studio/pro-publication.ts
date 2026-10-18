import { isStudioProValidationIdentity, type StudioProValidationIdentity } from './pro-artifact'
import { isStudioPublicationId } from './project-format'

export { isStudioPublicationId } from './project-format'

/** Publication history contains compiled immutable revisions, never preview URLs. */
export const STUDIO_PRO_PUBLICATION_LIMITS = {
  maxRevisions: 20,
  maxSourceBytes: 6 * 1024 * 1024,
  maxRequestBytes: 6 * 1024 * 1024 + 32_768,
} as const

export interface StudioProPublishedRevision {
  id: string
  sourceHash: string
  artifactHash: string
  createdAt: number
  validation: StudioProValidationIdentity
}

export interface StudioProPublication {
  playId: string
  version: number
  activeRevision: string
  disabled: boolean
  revisions: StudioProPublishedRevision[]
}

export const isStudioPublicationHash = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)

export function isStudioProPublication(value: unknown): value is StudioProPublication {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (
    (v.programmingLanguage !== undefined && v.programmingLanguage !== 'javascript') ||
    !isStudioPublicationId(v.playId) ||
    !Number.isSafeInteger(v.version) ||
    Number(v.version) < 1 ||
    !isStudioPublicationHash(v.activeRevision) ||
    typeof v.disabled !== 'boolean' ||
    !Array.isArray(v.revisions) ||
    v.revisions.length < 1 ||
    v.revisions.length > STUDIO_PRO_PUBLICATION_LIMITS.maxRevisions
  )
    return false
  const ids = new Set<string>()
  for (const raw of v.revisions) {
    if (!raw || typeof raw !== 'object') return false
    const r = raw as Record<string, unknown>
    if (
      !isStudioPublicationHash(r.id) ||
      ids.has(r.id) ||
      !isStudioPublicationHash(r.sourceHash) ||
      !isStudioPublicationHash(r.artifactHash) ||
      !Number.isSafeInteger(r.createdAt) ||
      Number(r.createdAt) < 0 ||
      r.approval !== undefined ||
      !isStudioProValidationIdentity(r.validation)
    )
      return false
    ids.add(r.id)
  }
  return ids.has(v.activeRevision)
}

export function studioProPublicationUrl(origin: string, playId: string, revision: string): string {
  if (!isStudioPublicationId(playId) || !isStudioPublicationHash(revision))
    throw new Error('Publicação inválida.')
  const url = new URL(origin)
  if (
    url.username ||
    url.password ||
    url.origin !== origin ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
    )
  )
    throw new Error('Origem de publicação inválida.')
  return `${origin}/v1/published/${playId}/${revision}/index.html`
}
