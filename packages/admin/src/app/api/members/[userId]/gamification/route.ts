import { forwardUpstream } from '@/server/forward'
import { getMemberGamification } from '@/server/members'

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const audience = new URL(req.url).searchParams.get('audience') === 'kids' ? 'kids' : 'adult'
  const { status, body } = await getMemberGamification(userId, audience)
  return forwardUpstream({ status, body })
}
