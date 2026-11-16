import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cenarioAdminRequest, OperacaoDeCenarioNaoPermitida } from '@/lib/cenarios-admin-request'
import { normalizeUpstreamError } from '@/lib/upstream'
import { gatewayFetch } from '@/server/gateway'
import { requireLocalAdminSession } from '@/server/local-admin-session'

const headers = { 'cache-control': 'private, no-store' }
const detalhes = z.object({
  revisaoAtual: z.number().int().nonnegative().optional(),
  problemas: z.array(z.string()).max(1000).optional(),
})
type Context = { params: Promise<{ path: string[] }> }
async function handle(request: Request, context: Context) {
  const session = await requireLocalAdminSession('Somente administradores podem editar cenários.', {
    signal: request.signal,
  })
  if (session instanceof NextResponse) return session
  let entrada: ReturnType<typeof cenarioAdminRequest>
  try {
    let body: unknown
    if (request.method !== 'GET') {
      if (
        request.headers.has('content-encoding') ||
        !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
      )
        return NextResponse.json(
          { error: { code: 'CORPO_INVALIDO', message: 'Envie um documento JSON.' } },
          { status: 400, headers },
        )
      body = await readJsonBodyWithLimit(request, 9 * 1024 * 1024, request.signal)
    }
    entrada = cenarioAdminRequest(
      request.method,
      (await context.params).path,
      new URL(request.url).searchParams,
      body,
    )
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return NextResponse.json(
        { error: { code: 'CORPO_GRANDE_DEMAIS', message: 'Documento excede o limite.' } },
        { status: 413, headers },
      )
    if (
      error instanceof InvalidJsonBodyError ||
      error instanceof z.ZodError ||
      error instanceof OperacaoDeCenarioNaoPermitida
    )
      return NextResponse.json(
        { error: { code: 'CORPO_INVALIDO', message: 'Operação de cenário inválida.' } },
        { status: 400, headers },
      )
    throw error
  }
  const result = await gatewayFetch(entrada.path, {
    method: entrada.method,
    body: 'body' in entrada ? entrada.body : undefined,
    query: 'query' in entrada ? entrada.query : undefined,
    signal: request.signal,
  })
  if (result.status < 400) return NextResponse.json(result.body, { status: result.status, headers })
  const extra = detalhes.safeParse(result.body)
  return NextResponse.json(
    { ...normalizeUpstreamError(result.body), ...(extra.success ? extra.data : {}) },
    { status: result.status, headers },
  )
}
export const GET = handle
export const POST = handle
