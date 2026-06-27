import { forwardUpstream } from '@/server/forward'
import { getPaymentsOps } from '@/server/payments'

export async function GET() {
  const { status, body } = await getPaymentsOps()
  return forwardUpstream({ status, body })
}
