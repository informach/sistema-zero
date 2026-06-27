import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { listPaymentsWithGuarantee } from '@/server/payments'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listPaymentsWithGuarantee({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    method: searchParams.get('method') ?? undefined,
    consumerId: searchParams.get('consumerId') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  return forwardUpstream({ status, body })
}
