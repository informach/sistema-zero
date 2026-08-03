import type { BlockView } from '@/lib/types'
import { forwardUpstream } from '@/server/forward'
import { createBlock } from '@/server/members'
import { syncZappyKnowledgeForBlock } from '@/server/zappy-knowledge'
import {
  scheduleZappyKnowledgeWork,
  zappyKnowledgeMutationResult,
} from '@/server/zappy-knowledge-status'

export const maxDuration = 300

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await createBlock(id, json)
  let synced = true
  if (status >= 200 && status < 300) {
    synced = false
    scheduleZappyKnowledgeWork(
      () => syncZappyKnowledgeForBlock(body as BlockView),
      '[zappy-knowledge] falha após criar bloco',
    )
  }
  return forwardUpstream(zappyKnowledgeMutationResult({ status, body }, synced))
}
