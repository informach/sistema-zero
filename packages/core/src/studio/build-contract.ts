import { z } from 'zod'
import { STUDIO_PRO_BUILD_LIMITS, studioProBuildFileLimitError } from './pro-build'
import { STUDIO_PRO_TEMPLATE_IDS, type StudioProTemplateId } from './pro-templates'

export const PRO_TEMPLATE_IDS = STUDIO_PRO_TEMPLATE_IDS
export type ProTemplateId = StudioProTemplateId
export const PRO_BUILD_LIMITS = STUDIO_PRO_BUILD_LIMITS
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
export class InvalidBuildRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBuildRequestError'
  }
}
const RESERVED = new Set([
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.cjs',
  'vite.config.ts',
])
export const studioBuildSchema = z
  .object({
    executionId: z.string().regex(/^[a-z0-9][a-z0-9-]{15,95}$/),
    templateId: z.enum(STUDIO_PRO_TEMPLATE_IDS),
    files: z.record(z.string(), z.string()),
  })
  .strict()
export function normalizeBuildPath(input: string): string | null {
  const cleaned = input
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
  if (
    !cleaned ||
    cleaned.length > 180 ||
    !/\.(?:ts|tsx|js|jsx|mjs|cjs|json|html|css|svg|txt|md)$/i.test(cleaned)
  )
    return null
  const segments = cleaned.split('/')
  if (
    segments.length > 8 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        !/^[A-Za-z0-9._-]+$/.test(segment) ||
        segment.toLowerCase() === 'node_modules' ||
        segment.toLowerCase().startsWith('.env'),
    )
  )
    return null
  return segments.join('/')
}
export function parseBuildRequest(value: unknown): ProBuildRequest {
  const parsed = studioBuildSchema.safeParse(value)
  if (!parsed.success) throw new InvalidBuildRequestError('Contrato de build inválido.')
  const files: Record<string, string> = {}
  for (const [path, content] of Object.entries(parsed.data.files)) {
    const normalized = normalizeBuildPath(path)
    if (!normalized) throw new InvalidBuildRequestError(`Caminho de arquivo inválido: ${path}`)
    if (RESERVED.has(normalized.toLowerCase())) continue
    if (Object.hasOwn(files, normalized))
      throw new InvalidBuildRequestError(`Caminho duplicado: ${normalized}`)
    files[normalized] = content
  }
  const limit = studioProBuildFileLimitError(files)
  if (limit) throw new InvalidBuildRequestError(`Limite de build: ${limit}`)
  if (!files['index.html'])
    throw new InvalidBuildRequestError('O projeto precisa ter um arquivo index.html.')
  return { ...parsed.data, files }
}
