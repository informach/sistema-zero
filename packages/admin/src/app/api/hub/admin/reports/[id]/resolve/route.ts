import { forwardUpstream } from '@/server/forward'
import { resolveReport } from '@/server/hub'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const json = await req.json().catch(() => null)
  const { status, body } = await resolveReport((await ctx.params).id, json)
  return forwardUpstream({ status, body })
}
