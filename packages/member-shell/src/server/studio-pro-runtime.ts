import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import type { StudioProArtifact } from '@sistemazero/core/studio'
import {
  isStudioProArtifact,
  isStudioProBuilderEvidence,
  isStudioProTemplateId,
  isStudioProValidationIdentity,
  resolveStudioProRemoteDependencies,
  STUDIO_PRO_BUILD_LIMITS,
  STUDIO_PRO_RUNTIME_PROTOCOL,
  type StudioProBuildEnvelope,
  type StudioProBuilderEvidence,
  type StudioProTemplateId,
  type StudioProValidationIdentity,
  serializeStudioProBuildEnvelope,
  studioProBuildEnvelopeIssue,
  studioProBuildFileLimitError,
} from '@sistemazero/core/studio'
import type { Project } from '@sistemazero/studio'
import { buildProAssetBundle } from '@sistemazero/studio/pro-assets'
import { sanitizeProjectAssets } from '@sistemazero/studio/project'
import { assertProjectContentPreserved } from '@sistemazero/studio/project-document'

interface RuntimeFailure {
  ok?: false
  code?: string
  message?: string
  output?: string
}

interface RuntimeSuccess {
  ok: true
  artifact: unknown
  output?: string
  durationMs?: number
  evidence?: unknown
  validation?: unknown
}

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
export interface StudioProRemoteBuildResult {
  artifact: StudioProArtifact
  output?: string
  durationMs?: number
  evidence?: StudioProBuilderEvidence[]
  validation?: StudioProValidationIdentity
}

/** Deterministic lock from the runtime's installed graph. This does not install in the student's terminal. */
export async function prepareStudioProDependencies(options: {
  packageJson: string
  executionId: string
  runtimeUrl: string
  runtimeToken: string
  signal?: AbortSignal
}): Promise<string> {
  const upstream = await fetch(`${options.runtimeUrl.replace(/\/$/, '')}/v1/dependencies`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.runtimeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ executionId: options.executionId, packageJson: options.packageJson }),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
    redirect: 'error',
    cache: 'no-store',
  })
  const result = (await readJsonBodyWithLimit(upstream, 512_000)) as {
    packageLock?: unknown
    message?: unknown
  } | null
  if (
    !upstream.ok ||
    typeof result?.packageLock !== 'string' ||
    result.packageLock.length > STUDIO_PRO_BUILD_LIMITS.maxFileChars
  )
    throw new Error(
      typeof result?.message === 'string'
        ? result.message
        : 'Não foi possível preparar as dependências compatíveis.',
    )
  resolveStudioProRemoteDependencies(options.packageJson, result.packageLock)
  return result.packageLock
}

export { STUDIO_PRO_BUILD_LIMITS }

export class StudioProRuntimeUpstreamError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly output?: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'StudioProRuntimeUpstreamError'
  }
}

/** Erro de contrato local: o BFF o devolve sem chamar o runtime externo. */
export class StudioProRuntimeInputError extends Error {
  constructor(
    readonly status: 400 | 413,
    message: string,
  ) {
    super(message)
    this.name = 'StudioProRuntimeInputError'
  }
}

/**
 * Status que o BFF pode repassar ao editor: erro de projeto (400/413), código
 * inválido (422) e rate limit (429) são acionáveis; falhas internas do runtime
 * continuam mascaradas como 502.
 */
export function studioProRuntimePublicStatus(status: number): 400 | 413 | 422 | 429 | 502 {
  if (status === 400 || status === 413 || status === 422 || status === 429) return status
  return 502
}

export function isProStudioProject(value: unknown): value is Project & { kind: 'pro' } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const project = value as Partial<Project>
  return project.kind === 'pro' && Boolean(project.tree && typeof project.tree === 'object')
}

export function proProjectTemplateId(project: Project): StudioProTemplateId | null {
  const templateId = project.proMeta?.templateId
  return isStudioProTemplateId(templateId) ? templateId : null
}

export async function opaqueStudioRuntimeExecutionId(
  prefix: 'lesson' | 'admin' | 'publication',
  ...parts: string[]
): Promise<string> {
  const bytes = new TextEncoder().encode(parts.join('\u0000'))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  const hex = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${prefix}-${hex.slice(0, 48)}`
}

export async function buildStudioProProject(options: {
  project: Project & { kind: 'pro' }
  templateId: StudioProTemplateId
  executionId: string
  runtimeUrl: string
  runtimeToken: string
  parentOrigin: string
  signal?: AbortSignal
  fetchImpl?: FetchImpl
  validate?: boolean
}): Promise<StudioProRemoteBuildResult> {
  const files = Object.fromEntries(
    Object.entries(options.project.tree ?? {})
      .filter((entry): entry is [string, { kind: 'file'; content: string }] => {
        const node = entry[1]
        return node?.kind === 'file' && typeof node.content === 'string'
      })
      .map(([path, node]) => [path, node.content]),
  )
  const limitError = studioProBuildFileLimitError(files)
  if (limitError === 'EMPTY') {
    throw new StudioProRuntimeInputError(400, 'O projeto Pro não tem arquivos para compilar.')
  }
  if (limitError === 'TOO_MANY_FILES') {
    throw new StudioProRuntimeInputError(400, 'O projeto Pro tem arquivos demais.')
  }
  if (limitError === 'FILE_TOO_LARGE' || limitError === 'TOTAL_TOO_LARGE') {
    throw new StudioProRuntimeInputError(413, 'O projeto Pro ficou grande demais.')
  }
  if (limitError === 'REQUEST_TOO_LARGE') {
    throw new StudioProRuntimeInputError(
      413,
      'O projeto Pro ficou grande demais para enviar ao compilador.',
    )
  }
  if (files['package.json'] !== undefined) {
    try {
      resolveStudioProRemoteDependencies(files['package.json'], files['package-lock.json'])
    } catch (error) {
      throw new StudioProRuntimeInputError(
        400,
        error instanceof Error ? error.message : 'Dependências inválidas.',
      )
    }
  }
  const binaries: Record<string, { base64: string; sha256: string }> = {}
  if (options.project.assets !== undefined || options.project.proMeta?.origin) {
    try {
      if (options.project.assets !== undefined && !Array.isArray(options.project.assets))
        throw new Error('Invalid assets')
      const assets = sanitizeProjectAssets(options.project.assets)
      assertProjectContentPreserved(
        { assets: options.project.assets },
        { ...options.project, assets },
      )
      const bundle = await buildProAssetBundle(assets, options.project.tree, {
        legacyRuntime: Boolean(options.project.proMeta?.origin),
      })
      for (const [path, bytes] of bundle.files) {
        const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
        binaries[path] = {
          base64: Buffer.from(bytes).toString('base64'),
          sha256: Buffer.from(hash).toString('hex'),
        }
      }
    } catch {
      throw new StudioProRuntimeInputError(
        400,
        'Os materiais do projeto são inválidos ou colidem com os arquivos de código.',
      )
    }
  }
  return requestStudioProBuild({ ...options, files, binaries })
}

/** The builder submits its hashed working revision directly, without reconstructing a live Project. */
function runtimeRequestBody(input: StudioProBuildEnvelope): string {
  const body = serializeStudioProBuildEnvelope(input)
  if (new TextEncoder().encode(body).byteLength > STUDIO_PRO_BUILD_LIMITS.maxRequestBytes)
    throw new StudioProRuntimeInputError(
      413,
      'O projeto com os materiais ultrapassa o limite do compilador remoto. Reduza os materiais ou execute no computador pelo terminal.',
    )
  const issue = studioProBuildEnvelopeIssue(input)
  if (issue) throw new StudioProRuntimeInputError(400, issue)
  return body
}

/** Same parser, binary hashes and installed lock as build; no container, credit or model dispatch. */
export async function preflightStudioProBuild(
  options: Parameters<typeof requestStudioProBuild>[0],
): Promise<void> {
  const body = runtimeRequestBody(options)
  const response = await (options.fetchImpl ?? fetch)(
    `${options.runtimeUrl.trim().replace(/\/$/, '')}/v1/preflight`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.runtimeToken}`,
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
    },
  )
  const result = (await readJsonBodyWithLimit(response, 32_768).catch(() => null)) as {
    ok?: boolean
    capabilities?: { protocol?: number }
    message?: string
  } | null
  if (!response.ok || !result?.ok)
    throw new StudioProRuntimeUpstreamError(
      response.status,
      result?.message ??
        'Não foi possível verificar a compatibilidade do projeto. Nenhuma construção foi iniciada.',
    )
  if (result.capabilities?.protocol !== STUDIO_PRO_RUNTIME_PROTOCOL)
    throw new StudioProRuntimeUpstreamError(
      502,
      'O compilador precisa ser atualizado antes de iniciar uma construção.',
    )
}

export async function requestStudioProBuild(options: {
  files: Record<string, string>
  binaries: Record<string, { base64: string; sha256: string }>
  templateId: StudioProTemplateId
  executionId: string
  parentOrigin: string
  runtimeUrl: string
  runtimeToken: string
  validate?: boolean
  signal?: AbortSignal
  fetchImpl?: FetchImpl
}): Promise<StudioProRemoteBuildResult> {
  const runtimeUrl = options.runtimeUrl.trim().replace(/\/$/, '')
  const body = runtimeRequestBody(options)
  const upstream = await (options.fetchImpl ?? fetch)(`${runtimeUrl}/v1/build`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.runtimeToken}`,
      'Content-Type': 'application/json',
    },
    body,
    cache: 'no-store',
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(options.validate ? 150_000 : 60_000)])
      : AbortSignal.timeout(options.validate ? 150_000 : 60_000),
    redirect: 'error',
  })
  const result = (await readJsonBodyWithLimit(upstream, 100_000).catch(() => null)) as
    | RuntimeSuccess
    | RuntimeFailure
    | null
  if (!upstream.ok || result?.ok !== true) {
    const failure = result as RuntimeFailure | null
    throw new StudioProRuntimeUpstreamError(
      upstream.status,
      failure?.message ?? 'Não foi possível compilar o projeto agora.',
      failure?.output,
      failure?.code,
    )
  }

  if (
    !isStudioProArtifact(result.artifact) ||
    new URL(result.artifact.url).origin !== new URL(runtimeUrl).origin ||
    result.artifact.expiresAt <= Date.now()
  ) {
    throw new StudioProRuntimeUpstreamError(
      502,
      'O compilador devolveu um resultado inválido ou expirado.',
    )
  }
  let evidence: StudioProBuilderEvidence[] | undefined
  let validation: StudioProValidationIdentity | undefined
  if (options.validate) {
    if (!isStudioProValidationIdentity(result.validation))
      throw new StudioProRuntimeUpstreamError(
        502,
        'O compilador não identificou o perfil de validação. Atualize o ambiente antes de continuar.',
      )
    validation = result.validation
    if (
      !Array.isArray(result.evidence) ||
      result.evidence.length !== 4 ||
      !result.evidence.every(isStudioProBuilderEvidence) ||
      result.evidence.some((item) => item.status !== 'passed') ||
      new Set(result.evidence.map((item) => item.kind)).size !== 4
    )
      throw new StudioProRuntimeUpstreamError(502, 'A validação não devolveu todas as evidências.')
    evidence = result.evidence
    const capture = evidence.find((item) => item.kind === 'capture')
    if (capture?.artifactUrl !== new URL('__studio-proof.png', result.artifact.url).href)
      throw new StudioProRuntimeUpstreamError(502, 'A captura não pertence à revisão validada.')
  }
  return {
    artifact: result.artifact,
    output: result.output,
    durationMs: result.durationMs,
    ...(evidence ? { evidence } : {}),
    ...(validation ? { validation } : {}),
  }
}
