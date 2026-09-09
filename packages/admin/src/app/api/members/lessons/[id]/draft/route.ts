import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  return forwardUpstream(
    await gatewayFetch(`/members/admin/lessons/${encodeURIComponent(id)}/draft`),
  )
}
export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params
  const body: unknown = await request.json().catch(() => null)
  return forwardUpstream(
    await gatewayFetch(`/members/admin/lessons/${encodeURIComponent(id)}/draft`, {
      method: 'PATCH',
      body,
    }),
  )
}
