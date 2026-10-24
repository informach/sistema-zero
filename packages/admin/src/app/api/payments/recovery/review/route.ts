import { NextResponse } from 'next/server'
import { z } from 'zod'
import { forwardUpstream } from '@/server/forward'
import { requireLocalAdminSession } from '@/server/local-admin-session'
import { getRecoveryReview } from '@/server/subscription-recovery'

const querySchema = z.strictObject({
  kind: z.enum(['CASE', 'ADMISSION', 'OPERATION', 'PERIOD']).optional(),
  audience: z.enum(['kids', 'adult', 'unknown']).optional(),
  subscriptionId: z.uuid().optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
})
export async function GET(request: Request) {
  const session = await requireLocalAdminSession('Sem permissão para consultar as conferências.', {
    allowStaff: true,
    signal: request.signal,
  })
  if (session instanceof NextResponse) return session
  const search = new URL(request.url).searchParams
  const parsed = querySchema.safeParse(Object.fromEntries(search))
  if (!parsed.success || [...new Set(search.keys())].some((key) => search.getAll(key).length !== 1))
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Filtro inválido.' } },
      { status: 400, headers: { 'cache-control': 'private, no-store' } },
    )
  const response = forwardUpstream(await getRecoveryReview(parsed.data, request.signal))
  response.headers.set('cache-control', 'private, no-store')
  return response
}
