import { forwardUpstream } from '@/server/forward'
import { getMemberCertificates } from '@/server/members'

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const { status, body } = await getMemberCertificates(userId)
  return forwardUpstream({ status, body })
}
