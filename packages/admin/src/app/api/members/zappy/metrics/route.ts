import { forwardUpstream } from '@/server/forward'
import { getZappyMetrics } from '@/server/zappy-knowledge'

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get('month') ?? ''
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return Response.json(
      { error: { code: 'INVALID_INPUT', message: 'Mês inválido.' } },
      { status: 400 },
    )
  }
  return forwardUpstream(await getZappyMetrics(month))
}
