import { forwardUpstream } from '@/server/forward'
import { getSubscriptionStats } from '@/server/payments'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await getSubscriptionStats({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  })
  return forwardUpstream({ status, body })
}
