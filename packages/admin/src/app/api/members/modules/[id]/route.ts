import { forwardUpstream } from '@/server/forward'
import { deleteModule, updateModule } from '@/server/members'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateModule(id, json)
  return forwardUpstream({ status, body })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await deleteModule(id)
  return forwardUpstream({ status, body })
}
