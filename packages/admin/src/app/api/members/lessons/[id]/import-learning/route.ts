import type { LessonContentView } from '@/lib/types'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'
import { syncZappyKnowledgeForBlock } from '@/server/zappy-knowledge'
import {
  scheduleZappyKnowledgeWork,
  zappyKnowledgeMutationResult,
} from '@/server/zappy-knowledge-status'

export const maxDuration = 300

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body: unknown = await request.json().catch(() => null)
  const lessonPath = `/members/admin/lessons/${encodeURIComponent(id)}`
  const result = await gatewayFetch<{ blocks: Array<{ id: string }> }>(
    `${lessonPath}/import-learning`,
    {
      method: 'POST',
      body,
    },
  )
  if (result.status < 200 || result.status >= 300) return forwardUpstream(result)
  const importedIds = new Set(result.body?.blocks.map((block) => block.id))
  scheduleZappyKnowledgeWork(async () => {
    const content = await gatewayFetch<LessonContentView>(`${lessonPath}/content`)
    if (content.status !== 200 || !content.body) {
      throw new Error(`Falha ao carregar aula importada para o Zappy (${content.status})`)
    }
    const sources = content.body.blocks.filter(
      (block) =>
        importedIds.has(block.id) &&
        (block.content.kind === 'rich_text' || block.content.kind === 'interactive'),
    )
    const failures: unknown[] = []
    for (let offset = 0; offset < sources.length; offset += 3) {
      const batch = await Promise.allSettled(
        sources.slice(offset, offset + 3).map(syncZappyKnowledgeForBlock),
      )
      for (const source of batch) {
        if (source.status === 'rejected') failures.push(source.reason)
      }
    }
    if (failures.length) throw new AggregateError(failures, 'Falha ao sincronizar aula importada')
  }, '[zappy-knowledge] falha após importar aula')
  return forwardUpstream(zappyKnowledgeMutationResult(result, false))
}
