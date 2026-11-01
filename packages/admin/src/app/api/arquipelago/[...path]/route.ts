import {
  ConflitoDeRevisaoSchema,
  ProblemasDePublicacaoSchema,
} from '@sistemazero/arquipelago-contracts'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { NextResponse } from 'next/server'
import { gameAdminRequest } from '@/lib/arquipelago-admin'
import { normalizeUpstreamError } from '@/lib/upstream'
import { gatewayFetch } from '@/server/gateway'
import { requireLocalAdminSession } from '@/server/local-admin-session'

const headers = { 'cache-control': 'private, no-store' }
const conflict = ConflitoDeRevisaoSchema
const problems = ProblemasDePublicacaoSchema
type Context = { params: Promise<{ path: string[] }> }

async function handle(request: Request, context: Context) {
  const session = await requireLocalAdminSession('Sem permissão para alterar desafios.', {
    // Ler, analisar e conferir um manifesto são da equipe toda; gravar é da administração.
    // Responder à revisão humana da Lenda é trabalho de professor: a equipe toda.
    allowStaff:
      request.method === 'GET' ||
      ['analisar', 'conferir'].includes((await context.params).path.at(-1) ?? '') ||
      (await context.params).path[0] === 'revisoes',
    signal: request.signal,
  })
  if (session instanceof NextResponse) return session
  let body: unknown
  if (request.method !== 'GET') {
    if (
      request.headers.has('content-encoding') ||
      !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
    )
      return invalid(400)
    try {
      body = await readJsonBodyWithLimit(request, 12_100_000, request.signal)
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) return invalid(413)
      if (error instanceof InvalidJsonBodyError) return invalid(400)
      throw error
    }
  }
  let parsed: ReturnType<typeof gameAdminRequest>
  try {
    parsed = gameAdminRequest(
      request.method,
      (await context.params).path,
      new URL(request.url).searchParams,
      body,
    )
  } catch {
    return invalid(400)
  }
  const method = request.method === 'GET' ? 'GET' : request.method === 'PUT' ? 'PUT' : 'POST'
  const result = await gatewayFetch(parsed.path, {
    method,
    body: parsed.body,
    query: 'query' in parsed ? parsed.query : undefined,
    signal: request.signal,
    timeoutMs: 170_000,
  })
  if (result.status < 400) return NextResponse.json(result.body, { status: result.status, headers })
  const current = result.status === 409 ? conflict.safeParse(result.body) : null
  const issues = result.status === 422 ? problems.safeParse(result.body) : null
  return NextResponse.json(
    {
      ...normalizeUpstreamError(result.body),
      ...(current?.success ? current.data : {}),
      ...(issues?.success ? issues.data : {}),
    },
    { status: result.status, headers },
  )
}
function invalid(status: 400 | 413) {
  return NextResponse.json(
    { error: { code: 'INVALID_INPUT', message: 'Confira os dados do desafio.' } },
    { status, headers },
  )
}
export const GET = handle
export const POST = handle
export const PUT = handle
