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
  type StudioProVerifiedPlatformFiles,
  studioProDigest,
  studioProTemplate,
  verifyStudioBuildPlatformFiles,
} from '@sistemazero/core/studio'
import {
  isStudioProScene3DFile,
  readStudioProScene3DModule,
  STUDIO_PRO_SCENE3D_MODULE,
} from '@sistemazero/core/studio/pro-scene3d'
import {
  STUDIO_THREE_TYPES_VERSION,
  STUDIO_THREE_VERSION,
} from '@sistemazero/core/studio/three-version'
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
    | 'DEPENDENCY_NOT_DECLARED'
    | 'RATE_LIMITED'
  message: string
  output?: string
}

export type ProBuildResponse = ProBuildSuccess | ProBuildFailure

const RESERVED_PATHS = new Set<string>(STUDIO_PRO_RESERVED_BUILD_PATHS)

export const PRO_BUILD_LIMITS = STUDIO_PRO_BUILD_LIMITS

export { InvalidBuildRequestError } from '@sistemazero/core/studio'

/**
 * O pedido de `/v1/build` e `/v1/preflight`. A cópia do motor 2D de um jogo convertido para o Pro
 * (`public/sz-ext/<id>.js`, perto de 400 mil caracteres) passa do teto de 256 mil por arquivo; uma
 * cópia publicada intacta (sha256 do inventário do core, no caminho dela) é da plataforma e fica
 * fora do orçamento do autor. O envelope continua limitado pelos bytes lidos do corpo.
 */
export async function readBuildRequest(value: unknown): Promise<ProBuildRequest> {
  return parseBuildRequest(value, await verifyStudioBuildPlatformFiles(value))
}

export function parseBuildRequest(
  value: unknown,
  platform?: StudioProVerifiedPlatformFiles,
): ProBuildRequest {
  const input = parseStudioBuildSubmission(value, platform)
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
        `O lock inclui uma versão de ${path.replace(/^node_modules\//, '')} diferente da imagem do compilador remoto. Use as versões das bibliotecas do modelo.`,
      )
  }
}

export async function verifyBuildBinaries(binaries: ProBuildRequest['binaries']): Promise<void> {
  for (const [path, entry] of Object.entries(binaries ?? {})) {
    const bytes = Uint8Array.from(atob(entry.base64), (character) => character.charCodeAt(0))
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    if (hash !== entry.sha256)
      throw new InvalidBuildRequestError('O material recebido está incompleto ou foi alterado.')
    // R3 da revisão de 20/11/2026: o módulo dos cenários só passa no modelo do Estúdio, só com
    // dados. O contêiner o escreve de novo e troca o runtime e os tipos pelos da imagem.
    if (path === STUDIO_PRO_SCENE3D_MODULE) {
      let text: string | null = null
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch {
        // Texto que não é UTF-8 não é o módulo do Estúdio.
      }
      if (text === null || readStudioProScene3DModule(text) === null)
        throw new InvalidBuildRequestError(
          'Os cenários do projeto não conferem com o Estúdio. Abra o projeto de novo e tente outra vez.',
        )
    }
  }
}

/** Exact platform bytes admitted by the same authority as the source budget.
 * The compiler keeps their syntax and imports, while semantic author checks target authored code. */
export async function verifiedValidationPlatformFiles(input: ProBuildRequest) {
  await verifyBuildBinaries(input.binaries)
  const known = await verifyStudioBuildPlatformFiles(input)
  const entries = await Promise.all(
    [...known].map(async ([path, source]) => [path, await studioProDigest(source)] as const),
  )
  const materials = input.binaries?.['public/sz-assets.js']
  if (materials) entries.push(['public/sz-assets.js', materials.sha256])
  return Object.fromEntries(entries)
}

/** O pedido traz algum dos arquivos derivados dos cenários do Molda. */
export function hasStudioProScene3DFiles(binaries: ProBuildRequest['binaries']): boolean {
  return Object.keys(binaries ?? {}).some(isStudioProScene3DFile)
}

/** O script da imagem que troca os arquivos derivados dos cenários pelos confiáveis (R3). */
export const SCENE3D_CANONICAL_COMMAND = 'node /opt/sz-runtime/scene3d-pro-canonical.mjs'

export const normalizeBuildPath = normalizeStudioProBuildPath

/** As dependências que o build confiável instala: as do projeto conferidas, ou as do modelo. */
function trustedDependencies(templateId: ProTemplateId, resolved?: StudioProRemoteDependencies) {
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
    dependencies.three = STUDIO_THREE_VERSION
  }
  if (templateId === 'three-ts' || (template?.engine === 'three' && template.kitVersion)) {
    devDependencies['@types/three'] = STUDIO_THREE_TYPES_VERSION
    devDependencies.typescript = '5.9.3'
  }
  return {
    dependencies: resolved?.dependencies ?? dependencies,
    devDependencies: resolved?.devDependencies ?? devDependencies,
  }
}

export function trustedPackageJson(
  templateId: ProTemplateId,
  resolved?: StudioProRemoteDependencies,
): string {
  return `${JSON.stringify(
    {
      name: 'sz-pro-lesson',
      private: true,
      type: 'module',
      scripts: { build: 'vite build' },
      ...trustedDependencies(templateId, resolved),
    },
    null,
    2,
  )}\n`
}

/** O começo da linha que o plugin abaixo escreve; o Worker devolve o recado depois dele. */
export const UNDECLARED_DEPENDENCY_MARKER = 'STUDIO_UNDECLARED_DEPENDENCY'

/**
 * Recusa, no build hospedado, o `import` de uma biblioteca que o projeto não declarou (revisão do
 * lote 4 da conclusão, 22/11/2026). A conferência do catálogo olha só o package.json, e o Vite do
 * Rodar comum monta com o `node_modules` da imagem: um `import { nanoid } from 'nanoid'` sem
 * declarar empacotava o nanoid que veio na imagem por ser dependência do postcss (e uns 40
 * pacotes assim). Só vale para o código do projeto: as bibliotecas importam o que quiserem.
 *
 * ⚠️ Vai para a configuração do Vite como TEXTO (`toString`): nada de fora desta função.
 */
export function catalogImportsPlugin(declared: readonly string[]) {
  const allowed = new Set([...declared, 'vite'])
  return {
    name: 'sz-catalog-imports',
    enforce: 'pre' as const,
    resolveId(this: { error(message: string): never }, source: string, importer?: string) {
      if (!importer || importer.startsWith('\0') || /[\\/]node_modules[\\/]/.test(importer))
        return null
      const bare = source.split(/[?#]/)[0] ?? ''
      // Caminho relativo ou absoluto, módulo virtual e endereço com esquema (`virtual:`, `data:`).
      if (!bare || /^(?:[./\\\0]|[A-Za-z]:[\\/]|[a-z][a-z0-9+.-]*:)/i.test(bare)) return null
      const parts = bare.split('/')
      const name = bare.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? '')
      if (allowed.has(name)) return null
      this.error(
        'STUDIO_UNDECLARED_DEPENDENCY A biblioteca ' +
          name +
          ' não está no package.json deste jogo. Se ela é uma das bibliotecas do modelo, escreva ela no package.json; se não, tire o import.',
      )
    },
  }
}

/** O recado do plugin acima, quando o build falhou por ele. */
export function undeclaredDependencyMessage(output: string): string | null {
  const at = output.indexOf(`${UNDECLARED_DEPENDENCY_MARKER} `)
  if (at < 0) return null
  const rest = output.slice(at + UNDECLARED_DEPENDENCY_MARKER.length + 1)
  return rest.split(/\r?\n/)[0]?.trim() || null
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
  const deps = trustedDependencies(templateId, resolved)
  const declared = [...Object.keys(deps.dependencies), ...Object.keys(deps.devDependencies)]
  const catalog = `const catalogImports = ${catalogImportsPlugin.toString()}\n`
  const plugins = `  plugins: [catalogImports(${JSON.stringify(declared)})${react ? ', react()' : ''}],\n`
  // Inline PostCSS disables discovery of executable project/parent configuration.
  // Native config loading avoids writing a bundled config into trusted node_modules.
  return `import { defineConfig } from 'vite'\n${reactImport}${catalog}\nexport default defineConfig({\n${plugins}  base: './',\n  envDir: false,\n  envPrefix: [],\n  cacheDir: '.vite-cache',\n  css: { postcss: { plugins: [] } },\n  build: {\n    assetsInlineLimit: 4096,\n    cssCodeSplit: true,\n    sourcemap: false,\n  },\n})\n`
}
