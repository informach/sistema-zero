/** Immutable compiled files. Preview retention is separate from project persistence. */
export const STUDIO_PRO_ARTIFACT_LIMITS = {
  maxFiles: 338, // 80 source files + 128 assets, auxiliary sheets and manifest
  maxBytes: 2_500_000,
  previewLifetimeMs: 24 * 60 * 60 * 1000,
} as const

export interface StudioProArtifact {
  id: string
  url: string
  sha256: string
  expiresAt: number
}

/** Versioned check profile plus generated identity of the installed toolchain and harness. */
export interface StudioProValidationIdentity {
  profileVersion: 1
  runtimeFingerprint: string
}
export function isStudioProValidationIdentity(
  value: unknown,
): value is StudioProValidationIdentity {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.profileVersion === 1 &&
    typeof v.runtimeFingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(v.runtimeFingerprint)
  )
}

export interface StudioProArtifactFile {
  path: string
  bytes: number
  sha256: string
  contentType?: string
}

export interface StudioProArtifactManifest {
  version: 1
  files: StudioProArtifactFile[]
}

export function isStudioProArtifact(value: unknown): value is StudioProArtifact {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (
    typeof v.id !== 'string' ||
    !/^[a-f0-9]{64}$/.test(v.id) ||
    typeof v.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(v.sha256) ||
    typeof v.expiresAt !== 'number' ||
    !Number.isSafeInteger(v.expiresAt) ||
    typeof v.url !== 'string'
  )
    return false
  try {
    const url = new URL(v.url)
    return (
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === `/v1/artifacts/${v.id}/index.html`
    )
  } catch {
    return false
  }
}

export function validStudioArtifactPath(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 240 &&
    value.split('/').length <= 16 &&
    value.split('/').every((part) => /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(part))
  )
}

export function parseStudioArtifactManifest(value: unknown): StudioProArtifactManifest {
  if (!value || typeof value !== 'object') throw new Error('Manifesto compilado inválido.')
  const manifest = value as Record<string, unknown>
  if (
    manifest.version !== 1 ||
    !Array.isArray(manifest.files) ||
    !manifest.files.length ||
    manifest.files.length > STUDIO_PRO_ARTIFACT_LIMITS.maxFiles
  )
    throw new Error('Arquivos compilados inválidos.')
  const names = new Set<string>()
  let total = 0
  const files = manifest.files.map((item: unknown): StudioProArtifactFile => {
    if (!item || typeof item !== 'object') throw new Error('Arquivo compilado inválido.')
    const file = item as Record<string, unknown>
    if (
      typeof file.path !== 'string' ||
      !validStudioArtifactPath(file.path) ||
      typeof file.bytes !== 'number' ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 0 ||
      typeof file.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(file.sha256)
    )
      throw new Error('Arquivo compilado inválido.')
    const lower = file.path.toLowerCase()
    if (
      [...names].some(
        (name) => name === lower || name.startsWith(`${lower}/`) || lower.startsWith(`${name}/`),
      )
    )
      throw new Error('Arquivos compilados duplicados ou sobrepostos.')
    names.add(lower)
    total += file.bytes
    if (total > STUDIO_PRO_ARTIFACT_LIMITS.maxBytes)
      throw new Error('O resultado compilado ultrapassa o limite de tamanho.')
    if (
      file.contentType !== undefined &&
      (typeof file.contentType !== 'string' ||
        !/^[a-z0-9.+-]+\/[a-z0-9.+-]+(?:; charset=utf-8)?$/.test(file.contentType) ||
        file.contentType.length > 100)
    )
      throw new Error('Tipo de arquivo compilado inválido.')
    return {
      path: file.path,
      bytes: file.bytes,
      sha256: file.sha256,
      ...(typeof file.contentType === 'string' ? { contentType: file.contentType } : {}),
    }
  })
  if (!files.some((file) => file.path === 'index.html')) throw new Error('Build sem index.html.')
  return { version: 1, files }
}
