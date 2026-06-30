import { forwardUpstream } from '@/server/forward'
import { deleteUser, updateUser } from '@/server/users'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateUser(id, json)
  return forwardUpstream({ status, body })
}

/** Exclusão EM CASCATA do usuário (superadmin; o gateway/auth re-checam). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await deleteUser(id)
  return forwardUpstream({ status, body })
}
