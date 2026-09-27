import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const { id, evidenceId } = await context.params
  const query = new URL(req.url).searchParams
  return forwardUpstream(
    await gatewayFetch(
      `/members/admin/lessons/${encodeURIComponent(id)}/learning-evidence/${encodeURIComponent(evidenceId)}`,
      { query: { userId: query.get('userId'), accountId: query.get('accountId') } },
    ),
  )
}
