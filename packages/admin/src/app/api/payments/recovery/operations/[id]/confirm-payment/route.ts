import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { forwardUpstream } from '@/server/forward'
import { requireLocalAdminSession } from '@/server/local-admin-session'
import { confirmRecoveryPayment } from '@/server/subscription-recovery'

const bodySchema = z.strictObject({ expectedAttempt: z.number().int().min(1), requestId: z.uuid() })
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireLocalAdminSession('Sem permissão para conferir o pagamento.', {
    signal: request.signal,
  })
  if (session instanceof NextResponse) return session
  const { id } = await context.params
  if (
    !z.uuid().safeParse(id).success ||
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
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return invalid(400)
  const response = forwardUpstream(await confirmRecoveryPayment(id, parsed.data, request.signal))
  response.headers.set('cache-control', 'private, no-store')
  return response
}
function invalid(status: 400 | 413) {
  return NextResponse.json(
    { error: { code: 'INVALID_INPUT', message: 'Conferência inválida.' } },
    { status, headers: { 'cache-control': 'private, no-store' } },
  )
}
