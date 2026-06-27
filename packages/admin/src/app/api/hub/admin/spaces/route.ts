import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { createSpace, listSpaces } from '@/server/hub'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listSpaces({
    q: searchParams.get('q') ?? undefined,
    audience: searchParams.get('audience') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  return forwardUpstream({ status, body })
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createSpace(json)
  return forwardUpstream({ status, body })
}
