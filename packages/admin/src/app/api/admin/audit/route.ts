import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { listAudit } from '@/server/users'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listAudit({
    actorId: searchParams.get('actorId') ?? undefined,
    action: searchParams.get('action') ?? undefined,
    targetId: searchParams.get('targetId') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  return forwardUpstream({ status, body })
}
