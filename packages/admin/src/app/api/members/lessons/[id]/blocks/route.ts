import type { BlockView } from '@/lib/types'
import { forwardUpstream } from '@/server/forward'
import { createBlock } from '@/server/members'
import { syncZappyKnowledgeForBlock } from '@/server/zappy-knowledge'
import { zappyKnowledgeMutationResult } from '@/server/zappy-knowledge-status'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await createBlock(id, json)
  let synced = true
  if (status >= 200 && status < 300) {
    await syncZappyKnowledgeForBlock(body as BlockView).catch((error) => {
      synced = false
      console.error('[zappy-knowledge] falha após criar bloco', { error })
    })
  }
  return forwardUpstream(zappyKnowledgeMutationResult({ status, body }, synced))
}
