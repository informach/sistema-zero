import { forwardUpstream } from '@/server/forward'
import { backfillZappyKnowledge, getZappyKnowledgeReport } from '@/server/zappy-knowledge'

export async function GET() {
  return forwardUpstream(await getZappyKnowledgeReport())
}

export async function POST() {
  return forwardUpstream(await backfillZappyKnowledge())
}
