import { forwardUpstream } from '@/server/forward'
import { getCourseAnalytics } from '@/server/members'

export async function GET() {
  const { status, body } = await getCourseAnalytics()
  return forwardUpstream({ status, body })
}
