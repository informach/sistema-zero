import { forwardUpstream } from '@/server/forward'
import { manageEntitlement } from '@/server/members'

/** Revogar/expirar/estender uma matrícula → `PATCH /members/admin/entitlements/:id`. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await manageEntitlement(id, json)
  return forwardUpstream({ status, body })
}
