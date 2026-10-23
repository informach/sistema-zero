import {
  InvalidBuildRequestError,
  normalizeStudioProBuildPath,
  parseStudioBuildSubmission,
  resolveStudioProRemoteDependencies,
  STUDIO_PRO_BUILD_LIMITS,
  STUDIO_PRO_RESERVED_BUILD_PATHS,
  STUDIO_PRO_TEMPLATE_IDS,
  type StudioProRemoteDependencies,
  type StudioProTemplateId,
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

const RESERVED_PATHS = new Set<string>(STUDIO_PRO_RESERVED_BUILD_PATHS)

export const PRO_BUILD_LIMITS = STUDIO_PRO_BUILD_LIMITS

export { InvalidBuildRequestError } from '@sistemazero/core/studio'

export function parseBuildRequest(value: unknown): ProBuildRequest {
  const input = parseStudioBuildSubmission(value)
  const manifest = input.files['package.json'] ?? trustedPackageJson(input.templateId)
  const lock = input.files['package-lock.json']
  let dependencies: StudioProRemoteDependencies
  try {
    dependencies = resolveStudioProRemoteDependencies(manifest, lock)
    if (lock) verifyRemoteLock(lock, manifest)
  } catch (error) {
    throw new InvalidBuildRequestError(
      error instanceof Error ? error.message : 'Dependências inválidas.',
    )
  }
  return {
    ...input,
    files: Object.fromEntries(
      Object.entries(input.files).filter(([path]) => !RESERVED_PATHS.has(path.toLowerCase())),
    ),
    dependencies,
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
  const devDependencies: Record<string, string> = { vite: '8.1.6' }
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
