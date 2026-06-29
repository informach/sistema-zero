import { forwardUpstream } from '@/server/forward'
import { getMemberRatings } from '@/server/members'

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const { status, body } = await getMemberRatings(userId)
  return forwardUpstream({ status, body })
}
