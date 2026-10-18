import { isStudioPortablePath } from './portable-path'

/** Offsets are UTF-16, matching Monaco and JavaScript strings. */
export interface StudioCodeAnchor {
  kind: 'code'
  id: string
  start: number
  end: number
  sourceSha256: string
  /** Local sender generation only; other devices identify the text by its hash. */
  modelVersion: number
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function own(value: unknown, key: string): unknown {
  return record(value) && Object.hasOwn(value, key) ? value[key] : undefined
}

/** Read only the authoritative file namespace, without falling back to stale Classic mirrors. */
export function studioSourceAtPath(project: unknown, path: string): string | null {
  if (!record(project) || !isStudioPortablePath(path)) return null
  if (project.kind === 'pro') {
    const file = own(project.tree, path)
    return record(file) && file.kind === 'file' && typeof file.content === 'string'
      ? file.content
      : null
  }
  const file = own(project.files, path)
  if (typeof file === 'string') return file
  if (project.programmingLanguage === 'python' || !Array.isArray(project.extraFiles)) return null
  const extra = project.extraFiles.find((item) => record(item) && item.name === path)
  return record(extra) && typeof extra.content === 'string' ? extra.content : null
}

export function isStudioCodeAnchor(value: unknown): value is StudioCodeAnchor {
  return (
    record(value) &&
    value.kind === 'code' &&
    typeof value.id === 'string' &&
    isStudioPortablePath(value.id) &&
    typeof value.start === 'number' &&
    Number.isSafeInteger(value.start) &&
    value.start >= 0 &&
    typeof value.end === 'number' &&
    Number.isSafeInteger(value.end) &&
    value.end >= value.start &&
    typeof value.modelVersion === 'number' &&
    Number.isSafeInteger(value.modelVersion) &&
    value.modelVersion >= 1 &&
    typeof value.sourceSha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(value.sourceSha256)
  )
}

function boundary(source: string, offset: number): boolean {
  const before = source.charCodeAt(offset - 1),
    after = source.charCodeAt(offset)
  return (
    !(before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) &&
    !(before === 13 && after === 10)
  )
}

export function codeAnchorRangeFits(anchor: StudioCodeAnchor, source: string): boolean {
  return (
    isStudioCodeAnchor(anchor) &&
    anchor.end <= source.length &&
    boundary(source, anchor.start) &&
    boundary(source, anchor.end)
  )
}

export async function studioSourceSha256(source: string): Promise<string> {
  // JSON preserves lone UTF-16 surrogates; raw TextEncoder would collapse them to U+FFFD.
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(source)),
  )
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function codeAnchorMatchesSource(
  anchor: StudioCodeAnchor,
  source: string,
): Promise<boolean> {
  return (
    codeAnchorRangeFits(anchor, source) &&
    anchor.sourceSha256 === (await studioSourceSha256(source))
  )
}
