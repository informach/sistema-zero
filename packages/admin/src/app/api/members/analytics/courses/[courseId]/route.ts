import { forwardUpstream } from '@/server/forward'
import { getCourseFunnel } from '@/server/members'

export async function GET(_req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const { status, body } = await getCourseFunnel(courseId)
  return forwardUpstream({ status, body })
}
