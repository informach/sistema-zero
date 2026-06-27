import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { listPending } from '@/server/hub'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listPending({
    spaceId: searchParams.get('spaceId') ?? undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  return forwardUpstream({ status, body })
}
