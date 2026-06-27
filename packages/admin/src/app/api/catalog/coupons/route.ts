import { parseLimit, parseOffset } from '@/lib/list-params'
import { createCoupon, listCoupons } from '@/server/catalog'
import { forwardUpstream } from '@/server/forward'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listCoupons({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  return forwardUpstream({ status, body })
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createCoupon(json)
  return forwardUpstream({ status, body })
}
