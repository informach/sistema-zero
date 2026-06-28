import { forwardUpstream } from '@/server/forward'
import { getPaymentsStats } from '@/server/payments'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await getPaymentsStats({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  })
  return forwardUpstream({ status, body })
}
