import type { Project } from '@sistemazero/studio'
import { learnerIdentity } from '../lib/learner-identity'
import type { SessionUser } from '../lib/types'
import type { MembersClient } from '../server/clients'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '../server/read-json-body'
import {
  buildStudioProProject,
  isProStudioProject,
  opaqueStudioRuntimeExecutionId,
  proProjectTemplateId,
  STUDIO_PRO_BUILD_LIMITS,
  StudioProRuntimeInputError,
  StudioProRuntimeUpstreamError,
  studioProRuntimePublicStatus,
} from '../server/studio-pro-runtime'

const MAX_REQUEST_BYTES = STUDIO_PRO_BUILD_LIMITS.maxBffRequestBytes
const RUNTIME_TIMEOUT_MS = 55_000

interface BuildBody {
  courseSlug?: unknown
  lessonId?: unknown
  blockId?: unknown
  project?: unknown
}

export function createLessonProRuntimeBuild(deps: {
  audience: 'adult' | 'kids'
  getLesson: MembersClient['getLesson']
  getSession: () => Promise<SessionUser | null>
}) {
  return async function POST(request: Request): Promise<Response> {
    const session = await deps.getSession()
    if (!session?.id)
      return response({ error: { message: 'Entre novamente para continuar.' } }, 401)

    // Atividade Pro é autorizada pela matrícula/leitura da aula abaixo. Produto e
    // tier Pro controlam apenas o Estúdio livre; exigir ambos aqui impediria o
    // professor de usar Pro antes de a criança chegar à Lenda.
    if (deps.audience === 'kids' ? !session.activeProfile : !learnerIdentity(session, 'adult')) {
      return response(
        {
          error: {
            message:
              deps.audience === 'kids'
                ? 'Escolha um perfil para continuar.'
                : 'Entre novamente para continuar.',
          },
        },
        403,
      )
    }

    let body: BuildBody | null = null
    try {
      body = (await readJsonBodyWithLimit(request, MAX_REQUEST_BYTES)) as BuildBody
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return response(
          { error: { message: 'O projeto ficou grande demais para esta fase.' } },
          413,
        )
      }
      if (error instanceof InvalidJsonBodyError) {
        return response({ error: { message: 'O projeto Pro enviado é inválido.' } }, 400)
      }
      throw error
    }
    const courseSlug = text(body?.courseSlug)
    const lessonId = text(body?.lessonId)
    const blockId = text(body?.blockId)
    if (!courseSlug || !lessonId || !blockId || !isProStudioProject(body?.project)) {
      return response({ error: { message: 'O projeto Pro enviado é inválido.' } }, 400)
    }

    // A mesma consulta que abre a aula garante matrícula, trava sequencial e
    // vínculo do perfil. O cliente nunca consegue usar esta rota como compilador
    // livre antes de a jornada liberar o Estúdio Pro.
    const lesson = await deps.getLesson(courseSlug, lessonId)
    if (lesson.status !== 200 || !lesson.body) {
      return response({ error: { message: 'Esta fase não está liberada.' } }, 403)
    }
    const block = lesson.body.blocks.find((item) => item.id === blockId && item.kind === 'studio')
    const initial = readInitialProject(block?.content)
    const templateId = initial ? proProjectTemplateId(initial) : null
    if (initial?.kind !== 'pro' || !templateId) {
      return response({ error: { message: 'Este bloco não é um projeto Pro.' } }, 403)
    }

    const runtimeUrl = process.env.STUDIO_PRO_RUNTIME_URL?.trim().replace(/\/$/, '')
    const runtimeToken = process.env.STUDIO_PRO_RUNTIME_TOKEN?.trim()
    if (!runtimeUrl || !runtimeToken) {
      return response(
        {
          error: {
            message:
              deps.audience === 'kids'
                ? 'O ambiente Pro ainda não está configurado. Avise um adulto.'
                : 'O ambiente Pro ainda não está configurado. Avise a equipe.',
          },
        },
        503,
      )
    }

    const executionId = await opaqueStudioRuntimeExecutionId(
      'lesson',
      session.id,
      lessonId,
      blockId,
    )
    try {
      const result = await buildStudioProProject({
        parentOrigin: new URL(request.url).origin,
        project: body.project,
        // O template vem do conteúdo autoral da aula, nunca do projeto enviado.
        templateId,
        executionId,
        runtimeUrl,
        runtimeToken,
        signal: AbortSignal.timeout(RUNTIME_TIMEOUT_MS),
      })
      return response(result)
    } catch (error) {
      if (error instanceof StudioProRuntimeInputError) {
        return response({ error: { message: error.message } }, error.status)
      }
      if (error instanceof StudioProRuntimeUpstreamError) {
        return response(
          {
            error: {
              message: error.message,
              output: error.output,
            },
          },
          studioProRuntimePublicStatus(error.status),
        )
      }
      console.error('Falha ao chamar o Studio Pro Runtime', error)
      return response(
        { error: { message: 'O ambiente Pro demorou demais para responder. Tente de novo.' } },
        504,
      )
    }
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readInitialProject(content: unknown): Project | null {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const initial = (content as { initialProject?: unknown }).initialProject
  return initial && typeof initial === 'object' && !Array.isArray(initial)
    ? (initial as Project)
    : null
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
