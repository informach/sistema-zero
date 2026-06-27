import { updateOffer } from '@/server/catalog'
import { forwardUpstream } from '@/server/forward'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateOffer(id, json)
  return forwardUpstream({ status, body })
}
