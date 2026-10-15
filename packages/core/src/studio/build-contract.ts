import { z } from 'zod'
import { isStudioProArtifact, isStudioProValidationIdentity } from './pro-artifact'
import { STUDIO_PRO_BUILD_LIMITS, studioProBuildFileLimitError } from './pro-build'
import { isStudioProBuilderEvidence } from './pro-builder'
import {
  isStudioProBuildMaterialPath,
  normalizeStudioProBuildPath,
  STUDIO_PRO_RESERVED_BUILD_PATHS,
  studioProBuildEnvelopeIssue,
} from './pro-runtime-capabilities'
import {
  isStudioProTemplateId,
  STUDIO_PRO_TEMPLATE_IDS,
  type StudioProTemplateId,
} from './pro-templates'

/** Wire input; dependencies are derived and verified only by the runtime. */
export interface StudioBuildSubmission {
  executionId: string
  templateId: StudioProTemplateId
  parentOrigin: string
  files: Record<string, string>
  binaries?: Record<string, { base64: string; sha256: string }>
  validate: boolean
}
const EXECUTION_ID = /^[a-z0-9][a-z0-9-]{15,95}$/
const RESERVED_PATHS = new Set<string>(STUDIO_PRO_RESERVED_BUILD_PATHS)
const PRO_BUILD_LIMITS = STUDIO_PRO_BUILD_LIMITS
const normalizeBuildPath = normalizeStudioProBuildPath
export class InvalidBuildRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBuildRequestError'
  }
}
export const studioBuildSchema = z
  .object({
    executionId: z.string().regex(EXECUTION_ID),
    templateId: z.enum(STUDIO_PRO_TEMPLATE_IDS),
    parentOrigin: z.string().max(2048),
    files: z.record(z.string().max(180), z.string()),
    binaries: z
      .record(
        z.string().max(240),
        z.object({ base64: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
      )
      .optional(),
    validate: z.boolean().optional(),
  })
  .strict()
export const studioBuildResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    artifact: z.custom<import('./pro-artifact').StudioProArtifact>(isStudioProArtifact),
    output: z.string().max(2500000),
    durationMs: z.number().finite().nonnegative(),
    evidence: z
      .array(z.custom<import('./pro-builder').StudioProBuilderEvidence>(isStudioProBuilderEvidence))
      .max(100)
      .optional(),
    validation: z
      .custom<import('./pro-artifact').StudioProValidationIdentity>(isStudioProValidationIdentity)
      .optional(),
  }),
  z.object({
    ok: z.literal(false),
    code: z.enum([
      'INVALID_REQUEST',
      'BUILD_FAILED',
      'TYPECHECK_FAILED',
      'PLAYTEST_FAILED',
      'OUTPUT_TOO_LARGE',
      'RATE_LIMITED',
    ]),
    message: z.string().max(10000),
    output: z.string().max(2500000).optional(),
  }),
])

export function parseStudioBuildSubmission(value: unknown): StudioBuildSubmission {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidBuildRequestError('O corpo da requisição precisa ser um objeto.')
  }
  if (!studioBuildSchema.safeParse(value).success)
    throw new InvalidBuildRequestError('Contrato de build inválido.')
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
  const files: Record<string, string> = {}
  const names: string[] = []
  for (const [path, content] of entries) {
    const normalized = normalizeBuildPath(path)
    if (!normalized || normalized !== path)
      throw new InvalidBuildRequestError(`Caminho de arquivo inválido: ${path}`)
    if (
      RESERVED_PATHS.has(normalized.toLowerCase()) &&
      !['package.json', 'package-lock.json'].includes(normalized)
    )
      continue
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

  const limitError = studioProBuildFileLimitError(
    Object.fromEntries(Object.entries(files).filter(([path]) => !RESERVED_PATHS.has(path))),
  )
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

  const result: StudioBuildSubmission = {
    executionId: input.executionId,
    templateId: input.templateId,
    files,
    parentOrigin,
    validate: input.validate === true,
    ...(binaries ? { binaries } : {}),
  }
  const issue = studioProBuildEnvelopeIssue(result)
  if (issue) throw new InvalidBuildRequestError(issue)
  return result
}

function parseBuildBinaries(
  raw: unknown,
  files: Record<string, string>,
): StudioBuildSubmission['binaries'] {
  if (raw === undefined) return undefined
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new InvalidBuildRequestError('Materiais inválidos.')
  const entries = Object.entries(raw)
  if (entries.length > 258) throw new InvalidBuildRequestError('Materiais demais.')
  const binaries: NonNullable<StudioBuildSubmission['binaries']> = {}
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
