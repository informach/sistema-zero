import { forwardUpstream } from '@/server/forward'
import { resendAmbassadorLink } from '@/server/referrals'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await resendAmbassadorLink(id)
  return forwardUpstream({ status, body })
}
