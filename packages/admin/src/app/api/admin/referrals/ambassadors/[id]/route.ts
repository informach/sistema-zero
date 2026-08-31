import { forwardUpstream } from '@/server/forward'
import { getAmbassador, patchAmbassador } from '@/server/referrals'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getAmbassador(id)
  return forwardUpstream({ status, body })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await patchAmbassador(id, json)
  return forwardUpstream({ status, body })
}
