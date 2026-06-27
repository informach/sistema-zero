import { forwardUpstream } from '@/server/forward'
import { getFiscalStats } from '@/server/nfse'

export async function GET() {
  const { status, body } = await getFiscalStats()
  return forwardUpstream({ status, body })
}
