import { isStudioProTemplateId, type StudioProTemplateId } from '@sistemazero/core/studio'
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
  fetchImpl?: typeof fetch
}): Promise<StudioProRuntimeBuildResult> {
  const files = Object.fromEntries(
    Object.entries(options.project.tree ?? {})
      .filter((entry): entry is [string, { kind: 'file'; content: string }] => {
        const node = entry[1]
        return node?.kind === 'file' && typeof node.content === 'string'
      })
      .map(([path, node]) => [path, node.content]),
  )
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
