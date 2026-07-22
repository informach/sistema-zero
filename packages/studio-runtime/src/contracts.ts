import {
  isStudioProTemplateId,
  STUDIO_PRO_TEMPLATE_IDS,
  type StudioProTemplateId,
} from '@sistemazero/core/studio'

export const PRO_TEMPLATE_IDS = STUDIO_PRO_TEMPLATE_IDS

export type ProTemplateId = StudioProTemplateId

export interface ProBuildRequest {
  executionId: string
  templateId: ProTemplateId
  files: Record<string, string>
}

export interface ProBuildSuccess {
  ok: true
  html: string
  output: string
  durationMs: number
}

export interface ProBuildFailure {
  ok: false
  code: 'INVALID_REQUEST' | 'BUILD_FAILED' | 'OUTPUT_TOO_LARGE' | 'RATE_LIMITED'
  message: string
  output?: string
}

export type ProBuildResponse = ProBuildSuccess | ProBuildFailure

const EXECUTION_ID = /^[a-z0-9][a-z0-9-]{15,95}$/
const PATH_SEGMENT = /^[A-Za-z0-9._-]+$/
const FILE_EXTENSION = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|html|css|svg|txt|md)$/i
const RESERVED_PATHS = new Set([
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.ts',
])

export const PRO_BUILD_LIMITS = {
  maxFiles: 80,
  maxFileChars: 256_000,
  maxTotalChars: 1_500_000,
  maxOutputChars: 2_500_000,
} as const

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
  if (entries.length === 0 || entries.length > PRO_BUILD_LIMITS.maxFiles) {
    throw new InvalidBuildRequestError(
      `O projeto precisa ter entre 1 e ${PRO_BUILD_LIMITS.maxFiles} arquivos.`,
    )
  }

  const files: Record<string, string> = {}
  let totalChars = 0
  for (const [path, content] of entries) {
    const normalized = normalizeBuildPath(path)
    if (!normalized) throw new InvalidBuildRequestError(`Caminho de arquivo inválido: ${path}`)
    if (RESERVED_PATHS.has(normalized.toLowerCase())) continue
    if (typeof content !== 'string' || content.length > PRO_BUILD_LIMITS.maxFileChars) {
      throw new InvalidBuildRequestError(`Arquivo muito grande ou inválido: ${normalized}`)
    }
    totalChars += content.length
    if (totalChars > PRO_BUILD_LIMITS.maxTotalChars) {
      throw new InvalidBuildRequestError('O projeto ultrapassou o tamanho permitido.')
    }
    files[normalized] = content
  }

  if (!files['index.html']) {
    throw new InvalidBuildRequestError('O projeto precisa ter um arquivo index.html.')
  }

  return {
    executionId: input.executionId,
    templateId: input.templateId,
    files,
  }
}

export function normalizeBuildPath(input: string): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
  if (!cleaned || cleaned.length > 180 || !FILE_EXTENSION.test(cleaned)) return null
  const segments = cleaned.split('/')
  if (segments.length > 8) return null
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..' || !PATH_SEGMENT.test(segment)) return null
    if (segment.toLowerCase() === 'node_modules' || segment.startsWith('.env')) return null
  }
  return segments.join('/')
}

export function trustedPackageJson(templateId: ProTemplateId): string {
  const dependencies: Record<string, string> = {}
  const devDependencies: Record<string, string> = { vite: '8.0.14' }
  if (templateId === 'vanilla-vite') devDependencies.typescript = '5.9.3'
  if (templateId === 'react-ts') {
    dependencies.react = '19.2.0'
    dependencies['react-dom'] = '19.2.0'
    devDependencies['@vitejs/plugin-react'] = '6.0.2'
    devDependencies.typescript = '5.9.3'
  }
  if (templateId === 'three-js' || templateId === 'three-ts') {
    dependencies.three = '0.180.0'
  }
  if (templateId === 'three-ts') {
    devDependencies['@types/three'] = '0.180.0'
    devDependencies.typescript = '5.9.3'
  }
  return `${JSON.stringify(
    {
      name: 'sz-pro-lesson',
      private: true,
      type: 'module',
      scripts: { build: 'vite build' },
      dependencies,
      devDependencies,
    },
    null,
    2,
  )}\n`
}

export function trustedViteConfig(templateId: ProTemplateId): string {
  const reactImport = templateId === 'react-ts' ? "import react from '@vitejs/plugin-react'\n" : ''
  const plugins = templateId === 'react-ts' ? '  plugins: [react()],\n' : ''
  return `import { defineConfig } from 'vite'\n${reactImport}\nexport default defineConfig({\n${plugins}  base: './',\n  build: {\n    assetsInlineLimit: 100000000,\n    cssCodeSplit: false,\n    sourcemap: false,\n    rolldownOptions: { output: { codeSplitting: false } },\n  },\n})\n`
}
