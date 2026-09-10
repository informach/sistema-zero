import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

type Context = { params: Promise<{ id: string }> }
export async function GET(request: Request, { params }: Context) {
  const { id } = await params
  const query = new URL(request.url).searchParams
  const search = new URLSearchParams({
    userId: query.get('userId') ?? '',
    accountId: query.get('accountId') ?? '',
  })
  return forwardUpstream(
    await gatewayFetch(
      `/members/admin/lessons/${encodeURIComponent(id)}/learning-report?${search}`,
    ),
  )
}
