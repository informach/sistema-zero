import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/member-shell/server/read-json-body'
import {
  buildStudioProProject,
  isProStudioProject,
  opaqueStudioRuntimeExecutionId,
  proProjectTemplateId,
  StudioProRuntimeUpstreamError,
} from '@sistemazero/member-shell/server/studio-pro-runtime'
import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { requireLocalAdminSession } from '@/server/local-admin-session'

export const runtime = 'nodejs'

const MAX_REQUEST_BYTES = 2_000_000
const RUNTIME_TIMEOUT_MS = 55_000

export async function POST(request: Request): Promise<Response> {
  const session = await requireLocalAdminSession('Sem permissão para usar a autoria Pro.')
  if (session instanceof NextResponse) return session

  let body: unknown
  try {
    body = await readJsonBodyWithLimit(request, MAX_REQUEST_BYTES)
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return response({ error: { message: 'O projeto Pro ficou grande demais.' } }, 413)
    }
    if (error instanceof InvalidJsonBodyError) {
      return response({ error: { message: 'O projeto Pro enviado é inválido.' } }, 400)
    }
    throw error
  }

  const project = readProject(body)
  const templateId = project ? proProjectTemplateId(project) : null
  if (!project || !templateId) {
    return response({ error: { message: 'Escolha um modelo Pro válido.' } }, 400)
  }

  const env = getEnv()
  if (!env.STUDIO_PRO_RUNTIME_URL || !env.STUDIO_PRO_RUNTIME_TOKEN) {
    return response(
      { error: { message: 'O executor Pro ainda não está configurado neste ambiente.' } },
      503,
    )
  }

  try {
    const result = await buildStudioProProject({
      project,
      templateId,
      executionId: await opaqueStudioRuntimeExecutionId('admin', session.id),
      runtimeUrl: env.STUDIO_PRO_RUNTIME_URL,
      runtimeToken: env.STUDIO_PRO_RUNTIME_TOKEN,
      signal: AbortSignal.timeout(RUNTIME_TIMEOUT_MS),
    })
    return response(result)
  } catch (error) {
    if (error instanceof StudioProRuntimeUpstreamError) {
      return response(
        { error: { message: error.message, output: error.output } },
        error.status === 429 ? 429 : error.status === 422 ? 422 : 502,
      )
    }
    console.error('Falha ao chamar o Studio Pro Runtime na autoria', error)
    return response(
      { error: { message: 'O executor Pro demorou demais para responder. Tente novamente.' } },
      504,
    )
  }
}

function readProject(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const project = (body as { project?: unknown }).project
  return isProStudioProject(project) ? project : null
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
