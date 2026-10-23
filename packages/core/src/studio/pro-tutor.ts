/** Reading intents never authorize a builder job or a project mutation. */
export type StudioTutorIntent = 'explain' | 'investigate'

/** Monaco coordinates: one-based, end exclusive. The hash identifies the whole raw file. */
export interface StudioTutorSelection {
  path: string
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  documentVersion: number
  sourceHash: string
}

export interface StudioTutorExcerpt {
  id: string
  sourceHash: string
  startLine: number
  endLine: number
  /** Only `lines` permits a line reference; redaction can invalidate the mapping. */
  mapping: 'lines' | 'file'
  truncated: boolean
  documentVersion?: number
  /** Digest of the exact sanitized excerpt sent to the model, assigned by the BFF. */
  contextDigest?: string
}

export interface StudioTutorCodeFile {
  path: string
  content: string
  /** Absent in older clients: those excerpts start at line one. */
  excerpt?: StudioTutorExcerpt
}

/** Optional provenance keeps older clients readable without treating their signal as a build. */
export interface StudioTutorDiagnostic {
  path: string
  code: number | string
  line: number
  message: string
  source?: 'typescript' | 'pyright'
  sourceHash?: string
  documentVersion?: number
}

export interface StudioTutorFileReference {
  path: string
  /** Both absent means open the file without claiming an exact location. */
  startLine?: number
  endLine?: number
  sourceHash?: string
  contextDigest?: string
  excerptId?: string
}

export const STUDIO_TUTOR_SOURCE_HASH_RE = /^sha256-[A-Za-z0-9+/]{43}=$/

/** Source references are project-relative paths, never URLs or filesystem paths. */
export function isStudioTutorSourcePath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 240 &&
    !/[\\:?#]/.test(path) &&
    Array.from(path).every(
      (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    ) &&
    !path.startsWith('/') &&
    path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
  )
}

/** Storage/network boundary: preserve valid legacy references, discard malformed metadata. */
export function parseStudioTutorFileReference(value: unknown): StudioTutorFileReference | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  if (typeof item.path !== 'string' || !isStudioTutorSourcePath(item.path)) return null
  const lines = item.startLine !== undefined || item.endLine !== undefined
  if (
    lines &&
    (!Number.isSafeInteger(item.startLine) ||
      !Number.isSafeInteger(item.endLine) ||
      Number(item.startLine) < 1 ||
      Number(item.endLine) < Number(item.startLine) ||
      Number(item.endLine) > 10_000_000)
  )
    return null
  for (const field of ['sourceHash', 'contextDigest'] as const) {
    if (
      item[field] !== undefined &&
      (typeof item[field] !== 'string' || !STUDIO_TUTOR_SOURCE_HASH_RE.test(item[field]))
    )
      return null
  }
  if (
    item.excerptId !== undefined &&
    (typeof item.excerptId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(item.excerptId))
  )
    return null
  return {
    path: item.path,
    ...(lines ? { startLine: Number(item.startLine), endLine: Number(item.endLine) } : {}),
    ...(typeof item.sourceHash === 'string' ? { sourceHash: item.sourceHash } : {}),
    ...(typeof item.contextDigest === 'string' ? { contextDigest: item.contextDigest } : {}),
    ...(typeof item.excerptId === 'string' ? { excerptId: item.excerptId } : {}),
  }
}
