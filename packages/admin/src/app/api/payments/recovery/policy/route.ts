import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { requireLocalAdminSession } from '@/server/local-admin-session'
import { getRecoveryPolicy, saveRecoveryPolicy } from '@/server/subscription-recovery'

function forward(result: Parameters<typeof forwardUpstream>[0]) {
  const response = forwardUpstream(result)
  response.headers.set('cache-control', 'private, no-store')
  return response
}
export async function GET() {
  const session = await requireLocalAdminSession('Sem permissão para consultar a configuração.', {
    allowStaff: true,
  })
  if (session instanceof NextResponse) return session
  return forward(await getRecoveryPolicy())
}
export async function PUT(request: Request) {
  const session = await requireLocalAdminSession('Sem permissão para alterar a configuração.')
  if (session instanceof NextResponse) return session
  if (
    request.headers.has('content-encoding') ||
    !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
  )
    return invalid(400)
  let body: unknown
  try {
    body = await readJsonBodyWithLimit(request, 1024, request.signal)
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return invalid(413)
    if (error instanceof InvalidJsonBodyError) return invalid(400)
    throw error
  }
  return forward(await saveRecoveryPolicy(body))
}
function invalid(status: 400 | 413) {
  return NextResponse.json(
    {
      error: {
        code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_INPUT',
        message: 'Configuração inválida.',
      },
    },
    { status, headers: { 'cache-control': 'private, no-store' } },
  )
}
