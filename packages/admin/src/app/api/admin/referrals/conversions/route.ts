import { parseLimit, parseOffset } from '@/lib/list-params'
import type { ConversionStatus } from '@/lib/types'
import { forwardUpstream } from '@/server/forward'
import { listConversions } from '@/server/referrals'

const STATUSES = new Set<ConversionStatus>([
  'pending',
  'eligible',
  'paid',
  'canceled',
  'self_blocked',
])

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawStatus = searchParams.get('status')
  const { status, body } = await listConversions({
    status:
      rawStatus && STATUSES.has(rawStatus as ConversionStatus)
        ? (rawStatus as ConversionStatus)
        : undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  return forwardUpstream({ status, body })
}
