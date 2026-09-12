import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const query = new URL(req.url).searchParams
  return forwardUpstream(
    await gatewayFetch(`/members/admin/lessons/${encodeURIComponent(id)}/learning-evidence`, {
      query: {
        userId: query.get('userId'),
        accountId: query.get('accountId'),
        beforeId: query.get('beforeId'),
      },
    }),
  )
}
