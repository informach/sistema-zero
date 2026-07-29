import {
  isStudioProTemplateId,
  STUDIO_PRO_BUILD_LIMITS,
  type StudioProTemplateId,
  studioProBuildFileLimitError,
} from '@sistemazero/core/studio'
import type { Project, StudioProRuntimeBuildResult } from '@sistemazero/studio'

interface RuntimeFailure {
  ok?: false
  code?: string
  message?: string
  output?: string
}

interface RuntimeSuccess {
  ok: true
  html: string
  output?: string
  durationMs?: number
}

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export { STUDIO_PRO_BUILD_LIMITS }

export class StudioProRuntimeUpstreamError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly output?: string,
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
  prefix: 'lesson' | 'admin',
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
  signal?: AbortSignal
  fetchImpl?: FetchImpl
}): Promise<StudioProRuntimeBuildResult> {
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
    throw new StudioProRuntimeInputError(
      400,
      'O projeto Pro tem arquivos demais para esta atividade.',
    )
  }
  if (limitError === 'FILE_TOO_LARGE' || limitError === 'TOTAL_TOO_LARGE') {
    throw new StudioProRuntimeInputError(
      413,
      'O projeto Pro ficou grande demais para esta atividade.',
    )
  }
  if (limitError === 'REQUEST_TOO_LARGE') {
    throw new StudioProRuntimeInputError(
      413,
      'O projeto Pro ficou grande demais para enviar ao compilador.',
    )
  }
  const runtimeUrl = options.runtimeUrl.trim().replace(/\/$/, '')
  const upstream = await (options.fetchImpl ?? fetch)(`${runtimeUrl}/v1/build`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.runtimeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      executionId: options.executionId,
      templateId: options.templateId,
      files,
    }),
    cache: 'no-store',
    signal: options.signal,
  })
  const result = (await upstream.json().catch(() => null)) as RuntimeSuccess | RuntimeFailure | null
  if (!upstream.ok || result?.ok !== true) {
    const failure = result as RuntimeFailure | null
    throw new StudioProRuntimeUpstreamError(
      upstream.status,
      failure?.message ?? 'Não foi possível compilar o projeto agora.',
      failure?.output,
    )
  }

  return {
    html: result.html,
    output: result.output,
    durationMs: result.durationMs,
  }
}
