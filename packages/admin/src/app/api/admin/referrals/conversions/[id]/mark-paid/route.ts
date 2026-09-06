import { forwardUpstream } from '@/server/forward'
import { markConversionPaid } from '@/server/referrals'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => ({}))
  const { status, body } = await markConversionPaid(id, json)
  return forwardUpstream({ status, body })
}
