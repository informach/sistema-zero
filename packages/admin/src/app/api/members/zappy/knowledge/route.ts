import { forwardUpstream } from '@/server/forward'
import { backfillZappyKnowledge, getZappyKnowledgeReport } from '@/server/zappy-knowledge'

export async function GET() {
  return forwardUpstream(await getZappyKnowledgeReport())
}

export async function POST(req: Request) {
  const raw = (await req.json().catch(() => ({}))) as { cursor?: unknown }
  if (raw.cursor !== undefined && typeof raw.cursor !== 'string') {
    return Response.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }
  return forwardUpstream(
    await backfillZappyKnowledge({ ...(raw.cursor ? { cursor: raw.cursor } : {}) }),
  )
}
