import { forwardUpstream } from '@/server/forward'
import { reviewMastery } from '@/server/masteries'
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return forwardUpstream(
    await reviewMastery((await context.params).id, await request.json().catch(() => null)),
  )
}
