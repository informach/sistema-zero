import { forwardUpstream } from '@/server/forward'
import { getZappyFailedQuestions } from '@/server/zappy-knowledge'

const FILTERS = new Set(['all', 'rejected', 'error', 'not-useful'])

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const month = params.get('month') ?? ''
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return Response.json(
      { error: { code: 'INVALID_INPUT', message: 'Mês inválido.' } },
      { status: 400 },
    )
  }
  const filterRaw = params.get('filter') ?? 'all'
  const filter = (FILTERS.has(filterRaw) ? filterRaw : 'all') as
    | 'all'
    | 'rejected'
    | 'error'
    | 'not-useful'
  const offset = Math.max(0, Number.parseInt(params.get('offset') ?? '0', 10) || 0)
  return forwardUpstream(await getZappyFailedQuestions({ month, filter, limit: 50, offset }))
}
