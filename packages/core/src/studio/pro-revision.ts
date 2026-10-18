import { canonicalJson } from '../creations/content-fingerprint'
import { studioProBuildFileLimitError } from './pro-build'
import type { StudioProRevisionConfiguration } from './pro-revision-configuration'
import { isStudioDocumentTemplateId, isStudioProjectId } from './project-format'
import { copyStudioProjectJson } from './project-json'

/** Immutable source revision. Binary assets remain in the project; only their manifest is sent. */
interface StudioProRevisionContent {
  projectId: string
  templateId: string
  files: Record<string, string>
  directories: string[]
  assets: string
  assetFiles: Record<string, string>
  hash: string
}
export interface StudioProRevisionV1 extends StudioProRevisionContent {
  version: 1
  devScript: string
}
export interface StudioProRevisionV2 extends StudioProRevisionContent {
  version: 2
  configuration: StudioProRevisionConfiguration
}
export type StudioProRevision = StudioProRevisionV1 | StudioProRevisionV2
export type StudioProRevisionInput =
  | (Omit<StudioProRevisionV1, 'version' | 'hash'> & { version?: 1 })
  | Omit<StudioProRevisionV2, 'hash'>
export type { StudioProRevisionConfiguration } from './pro-revision-configuration'
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
  configuration?: { before: StudioProRevisionConfiguration; after: StudioProRevisionConfiguration }
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
  value = copyStudioProjectJson(value)
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Revisão inválida.')
  const input = value as Record<string, unknown>
  if (
    (input.version !== 1 && input.version !== 2) ||
    typeof input.hash !== 'string' ||
    typeof input.projectId !== 'string' ||
    typeof input.templateId !== 'string' ||
    (input.version === 1 && typeof input.devScript !== 'string') ||
    (input.version === 2 && Object.hasOwn(input, 'devScript')) ||
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
  const content = {
    projectId: input.projectId,
    templateId: input.templateId,
    assets: input.assets,
    directories: input.directories,
    files: strings(input.files),
    assetFiles: strings(input.assetFiles),
  }
  const revision = await createStudioProRevision(
    input.version === 1
      ? { ...content, devScript: input.devScript as string }
      : {
          ...content,
          version: 2,
          configuration: (
            await import('./pro-revision-configuration')
          ).parseStudioProRevisionConfiguration(input.configuration),
        },
  )
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

function assertLayout(
  files: Record<string, string>,
  directories: string[],
  validPath = isStudioProRevisionPath,
) {
  if (
    directories.length > STUDIO_PRO_REVISION_LIMITS.maxDirectories ||
    Object.values(files).some((content) => typeof content !== 'string') ||
    studioProBuildFileLimitError(files)
  )
    throw new Error('A revisão ultrapassou os limites de arquivos.')
  const seen = new Set<string>()
  for (const path of [...Object.keys(files), ...directories]) {
    if (!validPath(path) || seen.has(path.toLowerCase()))
      throw new Error(`Caminho inválido ou duplicado: ${path}`)
    seen.add(path.toLowerCase())
    const segments = path.split('/')
    for (let i = 1; i < segments.length; i++) {
      const parent = segments.slice(0, i).join('/')
      if (!directories.includes(parent)) throw new Error(`Pasta ausente: ${parent}`)
    }
  }
}

async function revisionPathValidator(python: boolean): Promise<(path: string) => boolean> {
  if (!python) return isStudioProRevisionPath
  return (await import('./project-environment')).isStudioPortablePath
}

export function createStudioProRevision(
  input: Omit<StudioProRevisionV1, 'version' | 'hash'> & { version?: 1 },
): Promise<StudioProRevisionV1>
export function createStudioProRevision(
  input: Omit<StudioProRevisionV2, 'hash'>,
): Promise<StudioProRevisionV2>
export function createStudioProRevision(input: StudioProRevisionInput): Promise<StudioProRevision>
export async function createStudioProRevision(
  input: StudioProRevisionInput,
): Promise<StudioProRevision> {
  input = copyStudioProjectJson(input) as StudioProRevisionInput
  const configuration =
    input.version === 2
      ? (await import('./pro-revision-configuration')).parseStudioProRevisionConfiguration(
          input.configuration,
        )
      : undefined
  const python = configuration?.programmingLanguage === 'python'
  const validPath = await revisionPathValidator(python)
  if (
    !isStudioProjectId(input.projectId) ||
    !isStudioDocumentTemplateId(input.templateId) ||
    (input.version !== 2 && !/^[A-Za-z0-9:_-]{1,80}$/.test(input.devScript)) ||
    typeof input.assets !== 'string' ||
    input.assets.length > STUDIO_PRO_REVISION_LIMITS.maxAssetManifestChars
  )
    throw new Error('Identidade ou manifesto da revisão inválido.')
  assertLayout(input.files, input.directories, validPath)
  if (configuration?.programmingLanguage === 'python') {
    if (!Object.hasOwn(input.files, configuration.python.entrypoint))
      throw new Error('O arquivo inicial não existe na revisão.')
    if (
      configuration.python.dependencyLock.requirementsSha256 !==
      (await studioProDigest(input.files['requirements.txt'] ?? ''))
    )
      throw new Error('O lock não corresponde às dependências da revisão.')
  }
  if (!input.assetFiles || Object.keys(input.assetFiles).length > 258)
    throw new Error('Manifesto de arquivos inválido.')
  const validAssetPath = python
    ? (await import('./project-environment')).isStudioPythonAssetPath
    : (path: string) => path.startsWith('public/')
  const assetPaths: string[] = []
  for (const [path, hash] of Object.entries(input.assetFiles)) {
    const lower = path.toLowerCase()
    if (
      !validPath(path) ||
      !validAssetPath(path) ||
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
  if (
    python &&
    (await import('./project-environment')).studioPortableFileConflict(
      [...Object.keys(input.files), ...assetPaths],
      input.directories,
    )
  )
    throw new Error('Há caminhos de materiais conflitantes no computador.')
  // A deterministic order also preserves empty directories and asset metadata in the CAS token.
  const source = {
    projectId: input.projectId,
    templateId: input.templateId,
    files: Object.fromEntries(
      Object.entries(input.files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
    directories: [...input.directories].sort(),
    assets: input.assets,
    assetFiles: Object.fromEntries(
      Object.entries(input.assetFiles).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  }
  if (input.version !== 2) {
    // Keep the historical field order and digest byte-for-byte for retained v1 jobs.
    const legacy = {
      version: 1 as const,
      projectId: source.projectId,
      templateId: source.templateId,
      devScript: input.devScript,
      files: source.files,
      directories: source.directories,
      assets: source.assets,
      assetFiles: source.assetFiles,
    }
    return { ...legacy, hash: await studioProDigest(JSON.stringify(legacy)) }
  }
  if (!configuration) throw new Error('Configuração de execução ausente.')
  const current = { version: 2 as const, ...source, configuration }
  return { ...current, hash: await studioProDigest(canonicalJson(current)) }
}

/** Validate every precondition before producing the next revision; never mutates its base. */
export async function applyStudioProChange<Revision extends StudioProRevision>(
  base: Revision,
  change: StudioProChange,
): Promise<{
  revision: Revision
  inverse: StudioProChange
}> {
  base = copyStudioProjectJson(base) as Revision
  change = copyStudioProjectJson(change) as StudioProChange
  if ((await createStudioProRevision(base)).hash !== base.hash || change.baseHash !== base.hash)
    throw new Error('A revisão-base mudou. Gere uma proposta sobre a versão atual.')
  if (
    typeof change.summary !== 'string' ||
    !change.summary.trim() ||
    change.summary.length > STUDIO_PRO_REVISION_LIMITS.maxSummaryChars ||
    !Array.isArray(change.patches) ||
    (change.patches.length < 1 && !change.directories && !change.configuration) ||
    change.patches.length > STUDIO_PRO_REVISION_LIMITS.maxPatches
  )
    throw new Error('A proposta não contém um conjunto válido de alterações.')
  let configuration = base.version === 2 ? base.configuration : undefined
  if (change.configuration) {
    if (base.version !== 2) throw new Error('A revisão antiga não admite alteração de ambiente.')
    const { parseStudioProRevisionConfiguration } = await import('./pro-revision-configuration')
    const before = parseStudioProRevisionConfiguration(change.configuration.before)
    const after = parseStudioProRevisionConfiguration(change.configuration.after)
    if (canonicalJson(before) !== canonicalJson(base.configuration))
      throw new Error('A configuração-base mudou.')
    if (before.programmingLanguage !== after.programmingLanguage)
      throw new Error('Uma proposta não pode converter a linguagem do projeto.')
    configuration = after
  }
  const python = configuration?.programmingLanguage === 'python'
  const validPath = await revisionPathValidator(python)
  const files = { ...base.files },
    directories = new Set(base.directories)
  const paths = new Map<string, StudioProPatch>(),
    inverse: StudioProPatch[] = []
  for (const patch of change.patches) {
    const { path, before, content } = patch
    const sameCase = paths.get(path.toLowerCase())
    const caseRenamePair =
      sameCase &&
      sameCase.path !== path &&
      ((sameCase.content === null && content !== null && before === null) ||
        (content === null && sameCase.content !== null && sameCase.before === null))
    if (
      !validPath(path) ||
      (sameCase && !caseRenamePair) ||
      directories.has(path) ||
      /^public\/studio-assets(?:\/|$)/i.test(path) ||
      !(
        python
          ? /\.(?:py|pyi|json|txt|md|toml)$/i
          : /\.(?:[cm]?[jt]sx?|json|webmanifest|html|css|svg|txt|md)$/i
      ).test(path) ||
      (before !== null && !/^[a-f0-9]{64}$/.test(before)) ||
      (content !== null && typeof content !== 'string')
    )
      throw new Error(`Alteração inválida: ${path}`)
    paths.set(path.toLowerCase(), patch)
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
  const revision = await createStudioProRevision(
    base.version === 2
      ? { ...base, files, directories: [...directories], configuration: configuration! }
      : { ...base, files, directories: [...directories] },
  )
  if (revision.hash === base.hash) throw new Error('A proposta não altera o projeto.')
  return {
    // The operation preserves the revision version and language; only its content changes.
    revision: revision as Revision,
    inverse: {
      baseHash: revision.hash,
      summary: `Desfazer: ${change.summary}`.slice(0, 2000),
      patches: inverse,
      directories: { before: revision.directories, after: base.directories },
      ...(change.configuration && base.version === 2 && revision.version === 2
        ? { configuration: { before: revision.configuration, after: base.configuration } }
        : {}),
    },
  }
}
