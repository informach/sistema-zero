import { forwardUpstream } from '@/server/forward'
import { getDailyPaymentsStats } from '@/server/payments'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await getDailyPaymentsStats({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    productId: searchParams.get('productId') ?? undefined,
  })
  return forwardUpstream({ status, body })
}
