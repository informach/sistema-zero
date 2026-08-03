import type { BlockView } from '@/lib/types'
import { forwardUpstream } from '@/server/forward'
import { deleteBlock, updateBlock } from '@/server/members'
import { deleteZappyKnowledgeForBlock, syncZappyKnowledgeForBlock } from '@/server/zappy-knowledge'
import {
  scheduleZappyKnowledgeWork,
  zappyKnowledgeMutationResult,
} from '@/server/zappy-knowledge-status'

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 300

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateBlock(id, json)
  let synced = true
  if (status >= 200 && status < 300) {
    synced = false
    scheduleZappyKnowledgeWork(
      () => syncZappyKnowledgeForBlock(body as BlockView),
      '[zappy-knowledge] falha após atualizar bloco',
    )
  }
  return forwardUpstream(zappyKnowledgeMutationResult({ status, body }, synced))
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await deleteBlock(id)
  let synced = true
  if (status >= 200 && status < 300) {
    await deleteZappyKnowledgeForBlock(id).catch((error) => {
      synced = false
      console.error('[zappy-knowledge] falha após excluir bloco', { error })
    })
  }
  return forwardUpstream(zappyKnowledgeMutationResult({ status, body }, synced))
}
