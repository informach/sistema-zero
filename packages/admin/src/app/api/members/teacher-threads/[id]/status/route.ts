import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return forwardUpstream(
    await gatewayFetch(`/members/admin/teacher-threads/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: await req.json().catch(() => null),
    }),
  )
}
