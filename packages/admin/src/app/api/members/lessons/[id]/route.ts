import { forwardUpstream } from '@/server/forward'
import { deleteLesson } from '@/server/members'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await deleteLesson(id)
  return forwardUpstream({ status, body })
}
