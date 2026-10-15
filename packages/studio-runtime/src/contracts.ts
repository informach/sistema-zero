import {
  isStudioProBuildMaterialPath,
  isStudioProTemplateId,
  normalizeStudioProBuildPath,
  resolveStudioProRemoteDependencies,
  STUDIO_PRO_BUILD_LIMITS,
  STUDIO_PRO_RESERVED_BUILD_PATHS,
  STUDIO_PRO_TEMPLATE_IDS,
  type StudioProRemoteDependencies,
  type StudioProTemplateId,
  studioProBuildFileLimitError,
  studioProTemplate,
} from '@sistemazero/core/studio'
import runtimeLock from '../runtime/package-lock.json' with { type: 'json' }
import { prepareRuntimeDependencyLock } from './dependency-lock'

export const PRO_TEMPLATE_IDS = STUDIO_PRO_TEMPLATE_IDS

export type ProTemplateId = StudioProTemplateId

export interface ProBuildRequest {
  executionId: string
  templateId: ProTemplateId
  files: Record<string, string>
  binaries?: Record<string, { base64: string; sha256: string }>
  parentOrigin: string
  dependencies: StudioProRemoteDependencies
  validate: boolean
}

export interface ProBuildSuccess {
  ok: true
  artifact: import('@sistemazero/core/studio').StudioProArtifact
  output: string
  durationMs: number
  evidence?: import('@sistemazero/core/studio').StudioProBuilderEvidence[]
  validation?: import('@sistemazero/core/studio').StudioProValidationIdentity
}

export interface ProBuildFailure {
  ok: false
  code:
    | 'INVALID_REQUEST'
    | 'BUILD_FAILED'
    | 'TYPECHECK_FAILED'
    | 'PLAYTEST_FAILED'
    | 'OUTPUT_TOO_LARGE'
    | 'RATE_LIMITED'
  message: string
  output?: string
}

export type ProBuildResponse = ProBuildSuccess | ProBuildFailure

const EXECUTION_ID = /^[a-z0-9][a-z0-9-]{15,95}$/
const RESERVED_PATHS = new Set<string>(STUDIO_PRO_RESERVED_BUILD_PATHS)

export const PRO_BUILD_LIMITS = STUDIO_PRO_BUILD_LIMITS

export class InvalidBuildRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBuildRequestError'
  }
}

export function parseBuildRequest(value: unknown): ProBuildRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidBuildRequestError('O corpo da requisição precisa ser um objeto.')
  }
  const input = value as Record<string, unknown>
  if (input.validate !== undefined && typeof input.validate !== 'boolean')
    throw new InvalidBuildRequestError('Opção de validação inválida.')
  if (typeof input.executionId !== 'string' || !EXECUTION_ID.test(input.executionId)) {
    throw new InvalidBuildRequestError('Identificador de execução inválido.')
  }
  if (!isStudioProTemplateId(input.templateId)) {
    throw new InvalidBuildRequestError('Template profissional inválido.')
  }
  if (!input.files || typeof input.files !== 'object' || Array.isArray(input.files)) {
    throw new InvalidBuildRequestError('A árvore de arquivos é inválida.')
  }

  const entries = Object.entries(input.files as Record<string, unknown>)
  const manifest = (input.files as Record<string, unknown>)['package.json']
  const lock = (input.files as Record<string, unknown>)['package-lock.json']
  let dependencies: StudioProRemoteDependencies
  try {
    if (manifest !== undefined && typeof manifest !== 'string')
      throw new Error('package.json inválido.')
    if (lock !== undefined && typeof lock !== 'string')
      throw new Error('package-lock.json inválido.')
    dependencies = resolveStudioProRemoteDependencies(
      manifest ?? trustedPackageJson(input.templateId),
      lock,
    )
    if (lock) verifyRemoteLock(lock, manifest ?? trustedPackageJson(input.templateId))
  } catch (error) {
    throw new InvalidBuildRequestError(
      error instanceof Error ? error.message : 'Dependências inválidas.',
    )
  }
  const files: Record<string, string> = {}
  const names: string[] = []
  for (const [path, content] of entries) {
    const normalized = normalizeBuildPath(path)
    if (!normalized || normalized !== path)
      throw new InvalidBuildRequestError(`Caminho de arquivo inválido: ${path}`)
    if (RESERVED_PATHS.has(normalized.toLowerCase())) continue
    const lower = normalized.toLowerCase()
    if (
      names.some(
        (name) => name === lower || name.startsWith(`${lower}/`) || lower.startsWith(`${name}/`),
      ) ||
      [...RESERVED_PATHS].some((name) => lower.startsWith(`${name}/`))
    )
      throw new InvalidBuildRequestError('Caminhos de arquivos colidem.')
    names.push(lower)
    if (typeof content !== 'string')
      throw new InvalidBuildRequestError(`Arquivo inválido: ${normalized}`)
    files[normalized] = content
  }

  const limitError = studioProBuildFileLimitError(files)
  if (limitError === 'EMPTY' || limitError === 'TOO_MANY_FILES') {
    throw new InvalidBuildRequestError(
      `O projeto precisa ter entre 1 e ${PRO_BUILD_LIMITS.maxFiles} arquivos.`,
    )
  }
  if (limitError === 'FILE_TOO_LARGE') {
    throw new InvalidBuildRequestError('Um arquivo do projeto ultrapassou o tamanho permitido.')
  }
  if (limitError === 'TOTAL_TOO_LARGE') {
    throw new InvalidBuildRequestError('O projeto ultrapassou o tamanho permitido.')
  }

  if (!files['index.html']) {
    throw new InvalidBuildRequestError('O projeto precisa ter um arquivo index.html.')
  }

  const binaries = parseBuildBinaries(input.binaries, files)
  let parentOrigin: string
  try {
    const origin = new URL(String(input.parentOrigin))
    if (origin.origin !== input.parentOrigin || !['https:', 'http:'].includes(origin.protocol))
      throw new Error()
    parentOrigin = origin.origin
  } catch {
    throw new InvalidBuildRequestError('Origem do editor inválida.')
  }

  return {
    executionId: input.executionId,
    templateId: input.templateId,
    files,
    parentOrigin,
    dependencies,
    validate: input.validate === true,
    ...(binaries ? { binaries } : {}),
  }
}

/** The submitted lock cannot silently select different transitive code than the image. */
function verifyRemoteLock(raw: string, packageJson: string): void {
  const project = JSON.parse(raw) as {
    packages: Record<string, Record<string, unknown>>
  }
  const trusted = runtimeLock.packages as Record<string, Record<string, unknown>>
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, entry]) => [key, canonical(entry)]),
          )
        : value
  // Role/optional flags can differ in a project-only lock. Resolution and dependency metadata cannot.
  const identityFields = [
    'version',
    'integrity',
    'resolved',
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
    'peerDependenciesMeta',
    'os',
    'cpu',
    'libc',
    'engines',
    'bin',
    'hasInstallScript',
  ]
  const required = JSON.parse(prepareRuntimeDependencyLock(packageJson)) as {
    packages: Record<string, unknown>
  }
  for (const path of Object.keys(required.packages)) {
    if (path && !Object.hasOwn(project.packages, path))
      throw new InvalidBuildRequestError(
        `O lock está incompleto: falta ${path.replace(/^node_modules\//, '')}. Conclua a instalação antes de compilar.`,
      )
  }
  for (const [path, entry] of Object.entries(project.packages)) {
    if (!path) continue
    const expected = trusted[path]
    if (
      !entry ||
      !expected ||
      entry.link ||
      identityFields.some(
        (field) =>
          JSON.stringify(canonical(entry[field])) !== JSON.stringify(canonical(expected[field])),
      )
    )
      throw new InvalidBuildRequestError(
        `O lock inclui uma versão de ${path.replace(/^node_modules\//, '')} diferente da imagem do compilador remoto. Execute pelo terminal local ou use as dependências compatíveis.`,
      )
  }
}

function parseBuildBinaries(
  raw: unknown,
  files: Record<string, string>,
): ProBuildRequest['binaries'] {
  if (raw === undefined) return undefined
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new InvalidBuildRequestError('Materiais inválidos.')
  const entries = Object.entries(raw)
  if (entries.length > 258) throw new InvalidBuildRequestError('Materiais demais.')
  const binaries: NonNullable<ProBuildRequest['binaries']> = {}
  const names = Object.keys(files).map((path) => path.toLowerCase())
  let total = 0
  for (const [path, value] of entries) {
    if (path.toLowerCase() === 'public/__studio-proof.png')
      throw new InvalidBuildRequestError('O material usa um caminho reservado à verificação.')
    if (!isStudioProBuildMaterialPath(path))
      throw new InvalidBuildRequestError('Caminho de material inválido ou reservado.')
    const lower = path.toLowerCase()
    if (
      names.some(
        (name) => name === lower || name.startsWith(`${lower}/`) || lower.startsWith(`${name}/`),
      )
    )
      throw new InvalidBuildRequestError('Caminhos de materiais e código colidem.')
    names.push(lower)
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new InvalidBuildRequestError('Material inválido.')
    const entry = value as Record<string, unknown>
    if (
      typeof entry.base64 !== 'string' ||
      typeof entry.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      entry.base64.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(entry.base64)
    )
      throw new InvalidBuildRequestError('Codificação de material inválida.')
    total += entry.base64.length
    if (total > PRO_BUILD_LIMITS.maxRequestBytes)
      throw new InvalidBuildRequestError('Os materiais ultrapassam o limite remoto.')
    binaries[path] = { base64: entry.base64, sha256: entry.sha256 }
  }
  return binaries
}

export async function verifyBuildBinaries(binaries: ProBuildRequest['binaries']): Promise<void> {
  for (const entry of Object.values(binaries ?? {})) {
    const bytes = Uint8Array.from(atob(entry.base64), (character) => character.charCodeAt(0))
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    if (hash !== entry.sha256)
      throw new InvalidBuildRequestError('O material recebido está incompleto ou foi alterado.')
  }
}

export const normalizeBuildPath = normalizeStudioProBuildPath

export function trustedPackageJson(
  templateId: ProTemplateId,
  resolved?: StudioProRemoteDependencies,
): string {
  const template = studioProTemplate(templateId)
  const dependencies: Record<string, string> = {}
  const devDependencies: Record<string, string> = { vite: '8.0.16' }
  if (templateId === 'vanilla-vite' || template?.kitVersion) devDependencies.typescript = '5.9.3'
  if (template?.engine === 'phaser') dependencies.phaser = '3.90.0'
  if (templateId === 'react-ts') {
    dependencies.react = '19.2.0'
    dependencies['react-dom'] = '19.2.0'
    devDependencies['@vitejs/plugin-react'] = '6.0.2'
    devDependencies.typescript = '5.9.3'
    devDependencies['@types/react'] = '19.2.15'
    devDependencies['@types/react-dom'] = '19.2.3'
  }
  if (template?.engine === 'three') {
    dependencies.three = '0.180.0'
  }
  if (templateId === 'three-ts' || (template?.engine === 'three' && template.kitVersion)) {
    devDependencies['@types/three'] = '0.180.0'
    devDependencies.typescript = '5.9.3'
  }
  return `${JSON.stringify(
    {
      name: 'sz-pro-lesson',
      private: true,
      type: 'module',
      scripts: { build: 'vite build' },
      dependencies: resolved?.dependencies ?? dependencies,
      devDependencies: resolved?.devDependencies ?? devDependencies,
    },
    null,
    2,
  )}\n`
}

export function trustedViteConfig(
  templateId: ProTemplateId,
  resolved?: StudioProRemoteDependencies,
): string {
  const react = resolved
    ? Boolean(
        resolved.dependencies.react &&
          (resolved.devDependencies['@vitejs/plugin-react'] ||
            resolved.dependencies['@vitejs/plugin-react']),
      )
    : templateId === 'react-ts'
  const reactImport = react ? "import react from '@vitejs/plugin-react'\n" : ''
  const plugins = react ? '  plugins: [react()],\n' : ''
  // Inline PostCSS disables discovery of executable project/parent configuration.
  // Native config loading avoids writing a bundled config into trusted node_modules.
  return `import { defineConfig } from 'vite'\n${reactImport}\nexport default defineConfig({\n${plugins}  base: './',\n  envDir: false,\n  envPrefix: [],\n  cacheDir: '.vite-cache',\n  css: { postcss: { plugins: [] } },\n  build: {\n    assetsInlineLimit: 4096,\n    cssCodeSplit: true,\n    sourcemap: false,\n  },\n})\n`
}
