import type { Project, StudioProRuntimeBuildResult } from '@sistemazero/studio'
import { getLesson } from '@/server/members'
import { getSession } from '@/server/session'

export const runtime = 'nodejs'

const MAX_REQUEST_BYTES = 2_000_000
const RUNTIME_TIMEOUT_MS = 55_000

interface BuildBody {
  courseSlug?: unknown
  lessonId?: unknown
  blockId?: unknown
  project?: unknown
}

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

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session?.id) return response({ error: { message: 'Entre novamente para continuar.' } }, 401)

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return response(
      { error: { message: 'O projeto ficou grande demais para esta atividade.' } },
      413,
    )
  }

  const body = (await request.json().catch(() => null)) as BuildBody | null
  const courseSlug = text(body?.courseSlug)
  const lessonId = text(body?.lessonId)
  const blockId = text(body?.blockId)
  if (!courseSlug || !lessonId || !blockId || !isProProject(body?.project)) {
    return response({ error: { message: 'A atividade Pro enviada é inválida.' } }, 400)
  }

  // A mesma consulta que abre a aula garante matrícula, trava sequencial e
  // vínculo do perfil. O cliente nunca consegue usar esta rota como compilador
  // livre antes de a carreira liberar o Estúdio Pro.
  const lesson = await getLesson(courseSlug, lessonId)
  if (lesson.status !== 200 || !lesson.body) {
    return response({ error: { message: 'Esta atividade não está liberada.' } }, 403)
  }
  const block = lesson.body.blocks.find((item) => item.id === blockId && item.kind === 'studio')
  const initial = readInitialProject(block?.content)
  if (initial?.kind !== 'pro' || !initial.proMeta?.templateId) {
    return response({ error: { message: 'Este bloco não é uma atividade Pro.' } }, 403)
  }

  const runtimeUrl = process.env.STUDIO_PRO_RUNTIME_URL?.trim().replace(/\/$/, '')
  const runtimeToken = process.env.STUDIO_PRO_RUNTIME_TOKEN?.trim()
  if (!runtimeUrl || !runtimeToken) {
    return response(
      { error: { message: 'O ambiente Pro ainda não está configurado. Avise um adulto.' } },
      503,
    )
  }

  const executionId = await opaqueExecutionId(session.id, lessonId, blockId)
  const files = Object.fromEntries(
    Object.entries(body.project.tree ?? {})
      .filter((entry): entry is [string, { kind: 'file'; content: string }] => {
        const node = entry[1]
        return node?.kind === 'file' && typeof node.content === 'string'
      })
      .map(([path, node]) => [path, node.content]),
  )

  try {
    const upstream = await fetch(`${runtimeUrl}/v1/build`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${runtimeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        executionId,
        // O template vem do conteúdo autoral da aula, nunca do projeto enviado.
        templateId: initial.proMeta.templateId,
        files,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(RUNTIME_TIMEOUT_MS),
    })
    const result = (await upstream.json().catch(() => null)) as
      | RuntimeSuccess
      | RuntimeFailure
      | null
    if (!upstream.ok || result?.ok !== true) {
      const failure = result as RuntimeFailure | null
      return response(
        {
          error: {
            message: failure?.message ?? 'Não foi possível compilar o projeto agora.',
            output: failure?.output,
          },
        },
        upstream.status === 429 ? 429 : upstream.status === 422 ? 422 : 502,
      )
    }
    const success = result as RuntimeSuccess
    const payload: StudioProRuntimeBuildResult = {
      html: success.html,
      output: success.output,
      durationMs: success.durationMs,
    }
    return response(payload)
  } catch (error) {
    console.error('Falha ao chamar o Studio Pro Runtime', error)
    return response(
      { error: { message: 'O ambiente Pro demorou demais para responder. Tente de novo.' } },
      504,
    )
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isProProject(value: unknown): value is Project & { kind: 'pro' } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const project = value as Partial<Project>
  return project.kind === 'pro' && Boolean(project.tree && typeof project.tree === 'object')
}

function readInitialProject(content: unknown): Project | null {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const initial = (content as { initialProject?: unknown }).initialProject
  return initial && typeof initial === 'object' && !Array.isArray(initial)
    ? (initial as Project)
    : null
}

async function opaqueExecutionId(
  viewerId: string,
  lessonId: string,
  blockId: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(`${viewerId}\u0000${lessonId}\u0000${blockId}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  const hex = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `lesson-${hex.slice(0, 48)}`
}

function response(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
