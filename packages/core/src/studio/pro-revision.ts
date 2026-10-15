import { studioProBuildFileLimitError } from './pro-build'

/** Immutable source revision. Binary assets remain in the project; only their manifest is sent. */
export interface StudioProRevision {
  version: 1
  projectId: string
  templateId: string
  devScript: string
  files: Record<string, string>
  directories: string[]
  assets: string
  assetFiles: Record<string, string>
  hash: string
}
export interface StudioProPatch {
  path: string
  /** null means the file must not exist. Deletion has content: null. */
  before: string | null
  content: string | null
}
export interface StudioProChange {
  baseHash: string
  summary: string
  patches: StudioProPatch[]
  /** Undo restores the exact layout, including empty directories. */
  directories?: { before: string[]; after: string[] }
}
export const STUDIO_PRO_REVISION_LIMITS = {
  maxPatches: 24,
  maxDirectories: 160,
  maxAssetManifestChars: 80_000,
  maxSummaryChars: 2_000,
} as const

export async function studioProDigest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** HTTP boundary parser, shared without bringing a validation framework into the editor bundle. */
export async function parseStudioProRevision(value: unknown): Promise<StudioProRevision> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Revisão inválida.')
  const input = value as Record<string, unknown>
  if (
    input.version !== 1 ||
    typeof input.hash !== 'string' ||
    typeof input.projectId !== 'string' ||
    typeof input.templateId !== 'string' ||
    typeof input.devScript !== 'string' ||
    typeof input.assets !== 'string' ||
    !Array.isArray(input.directories) ||
    !input.directories.every((path): path is string => typeof path === 'string')
  )
    throw new Error('Revisão inválida.')
  const strings = (value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Arquivos inválidos.')
    const entries: [string, string][] = []
    for (const [key, content] of Object.entries(value)) {
      if (typeof content !== 'string') throw new Error('Arquivo inválido.')
      entries.push([key, content])
    }
    return Object.fromEntries(entries)
  }
  const revision = await createStudioProRevision({
    projectId: input.projectId,
    templateId: input.templateId,
    devScript: input.devScript,
    assets: input.assets,
    directories: input.directories,
    files: strings(input.files),
    assetFiles: strings(input.assetFiles),
  })
  if (revision.hash !== input.hash) throw new Error('A revisão recebida foi alterada.')
  return revision
}

/** Canonical paths only: no normalization may silently target a different file. */
export function isStudioProRevisionPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 240 &&
    path.split('/').length <= 12 &&
    path
      .split('/')
      .every(
        (part) =>
          /^[A-Za-z0-9._-]+$/.test(part) &&
          ![
            '.',
            '..',
            '__proto__',
            'constructor',
            'prototype',
            'node_modules',
            '.git',
            'dist',
          ].includes(part),
      )
  )
}

function assertLayout(files: Record<string, string>, directories: string[]) {
  if (
    directories.length > STUDIO_PRO_REVISION_LIMITS.maxDirectories ||
    Object.values(files).some((content) => typeof content !== 'string') ||
    studioProBuildFileLimitError(files)
  )
    throw new Error('A revisão ultrapassou os limites de arquivos.')
  const seen = new Set<string>()
  for (const path of [...Object.keys(files), ...directories]) {
    if (!isStudioProRevisionPath(path) || seen.has(path.toLowerCase()))
      throw new Error(`Caminho inválido ou duplicado: ${path}`)
    seen.add(path.toLowerCase())
    const segments = path.split('/')
    for (let i = 1; i < segments.length; i++) {
      const parent = segments.slice(0, i).join('/')
      if (!directories.includes(parent)) throw new Error(`Pasta ausente: ${parent}`)
    }
  }
}

export async function createStudioProRevision(
  input: Omit<StudioProRevision, 'version' | 'hash'>,
): Promise<StudioProRevision> {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.projectId) ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(input.templateId) ||
    !/^[A-Za-z0-9:_-]{1,80}$/.test(input.devScript) ||
    typeof input.assets !== 'string' ||
    input.assets.length > STUDIO_PRO_REVISION_LIMITS.maxAssetManifestChars
  )
    throw new Error('Identidade ou manifesto da revisão inválido.')
  assertLayout(input.files, input.directories)
  if (!input.assetFiles || Object.keys(input.assetFiles).length > 258)
    throw new Error('Manifesto de arquivos inválido.')
  const assetPaths: string[] = []
  for (const [path, hash] of Object.entries(input.assetFiles)) {
    const lower = path.toLowerCase()
    if (
      !isStudioProRevisionPath(path) ||
      !path.startsWith('public/') ||
      !/^[a-f0-9]{64}$/.test(hash) ||
      [...Object.keys(input.files), ...assetPaths].some(
        (file) =>
          file.toLowerCase() === lower ||
          file.toLowerCase().startsWith(`${lower}/`) ||
          lower.startsWith(`${file.toLowerCase()}/`),
      ) ||
      input.directories.some(
        (directory) =>
          directory.toLowerCase() === lower || directory.toLowerCase().startsWith(`${lower}/`),
      )
    )
      throw new Error('Um material colide com os arquivos de código.')
    assetPaths.push(path)
  }
  // A deterministic order also preserves empty directories and asset metadata in the CAS token.
  const source = {
    version: 1 as const,
    projectId: input.projectId,
    templateId: input.templateId,
    devScript: input.devScript,
    files: Object.fromEntries(
      Object.entries(input.files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
    directories: [...input.directories].sort(),
    assets: input.assets,
    assetFiles: Object.fromEntries(
      Object.entries(input.assetFiles).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  }
  return { ...source, hash: await studioProDigest(JSON.stringify(source)) }
}

/** Validate every precondition before producing the next revision; never mutates its base. */
export async function applyStudioProChange(
  base: StudioProRevision,
  change: StudioProChange,
): Promise<{
  revision: StudioProRevision
  inverse: StudioProChange
}> {
  if ((await createStudioProRevision(base)).hash !== base.hash || change.baseHash !== base.hash)
    throw new Error('A revisão-base mudou. Gere uma proposta sobre a versão atual.')
  if (
    typeof change.summary !== 'string' ||
    !change.summary.trim() ||
    change.summary.length > STUDIO_PRO_REVISION_LIMITS.maxSummaryChars ||
    !Array.isArray(change.patches) ||
    change.patches.length < 1 ||
    change.patches.length > STUDIO_PRO_REVISION_LIMITS.maxPatches
  )
    throw new Error('A proposta não contém um conjunto válido de alterações.')
  const files = { ...base.files },
    directories = new Set(base.directories)
  const paths = new Set<string>(),
    inverse: StudioProPatch[] = []
  for (const patch of change.patches) {
    const { path, before, content } = patch
    if (
      !isStudioProRevisionPath(path) ||
      paths.has(path.toLowerCase()) ||
      directories.has(path) ||
      /^public\/studio-assets(?:\/|$)/i.test(path) ||
      !/\.(?:[cm]?[jt]sx?|json|webmanifest|html|css|svg|txt|md)$/i.test(path) ||
      (before !== null && !/^[a-f0-9]{64}$/.test(before)) ||
      (content !== null && typeof content !== 'string')
    )
      throw new Error(`Alteração inválida: ${path}`)
    paths.add(path.toLowerCase())
    const previous = Object.hasOwn(base.files, path) ? base.files[path]! : null
    if (
      (previous === null ? null : await studioProDigest(previous)) !== before ||
      (content === null && previous === null)
    )
      throw new Error(`O arquivo mudou: ${path}`)
    if (content === previous) throw new Error(`A proposta não altera ${path}.`)
    inverse.push({
      path,
      before: content === null ? null : await studioProDigest(content),
      content: previous,
    })
    if (content === null) delete files[path]
    else {
      files[path] = content
      const parts = path.split('/')
      for (let i = 1; i < parts.length; i++) directories.add(parts.slice(0, i).join('/'))
    }
  }
  if (change.directories) {
    if (
      JSON.stringify([...change.directories.before].sort()) !==
        JSON.stringify([...base.directories].sort()) ||
      change.directories.after.length > STUDIO_PRO_REVISION_LIMITS.maxDirectories
    )
      throw new Error('As pastas da revisão mudaram.')
    directories.clear()
    for (const path of change.directories.after) directories.add(path)
    if (directories.size !== change.directories.after.length) throw new Error('Pastas duplicadas.')
  }
  const revision = await createStudioProRevision({ ...base, files, directories: [...directories] })
  return {
    revision,
    inverse: {
      baseHash: revision.hash,
      summary: `Desfazer: ${change.summary}`.slice(0, 2000),
      patches: inverse,
      directories: { before: revision.directories, after: base.directories },
    },
  }
}
