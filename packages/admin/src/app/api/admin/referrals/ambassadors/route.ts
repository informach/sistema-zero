import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { createAmbassador, listAmbassadors } from '@/server/referrals'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listAmbassadors({
    q: searchParams.get('q') ?? undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  return forwardUpstream({ status, body })
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createAmbassador(json)
  return forwardUpstream({ status, body })
}
