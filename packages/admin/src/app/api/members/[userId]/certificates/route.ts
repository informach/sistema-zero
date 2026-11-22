import { forwardUpstream } from '@/server/forward'
import { getMemberCertificates } from '@/server/members'

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const query = new URL(req.url).searchParams
  const { status, body } = await getMemberCertificates(userId, {
    audience: query.get('audience') ?? undefined,
    learner: query.get('learner') ?? undefined,
  })
  return forwardUpstream({ status, body })
}
