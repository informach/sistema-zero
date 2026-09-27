import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body: unknown = await request.json().catch(() => null)
  return forwardUpstream(
    await gatewayFetch(`/members/admin/lessons/${encodeURIComponent(id)}/draft/unpublish`, {
      method: 'POST',
      body,
    }),
  )
}
