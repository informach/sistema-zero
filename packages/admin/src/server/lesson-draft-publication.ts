import 'server-only'
import type { LessonDraft } from '@sistemazero/core/learning'
import { NextResponse } from 'next/server'
import type { LessonContentView } from '@/lib/types'
import { forwardUpstream } from './forward'
import { gatewayFetch } from './gateway'
import { getVideoStatus, mediaErrorResponse, requireMediaSession } from './media'
import { deleteZappyKnowledgeForBlock, syncZappyKnowledgeForBlock } from './zappy-knowledge'
import { scheduleZappyKnowledgeWork, zappyKnowledgeMutationResult } from './zappy-knowledge-status'

export async function publishLessonDraft(
  request: Request,
  lessonId: string,
  action: 'validate' | 'publish',
) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session
  const body: unknown = await request.json().catch(() => null)
  if (
    !body ||
    typeof body !== 'object' ||
    !('expectedRevision' in body) ||
    typeof body.expectedRevision !== 'string' ||
    !('operationId' in body) ||
    typeof body.operationId !== 'string'
  )
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Informe a revisão do rascunho.' } },
      { status: 400 },
    )
  const path = `/members/admin/lessons/${encodeURIComponent(lessonId)}`
  const draft = await gatewayFetch<LessonDraft>(`${path}/draft`)
  if (draft.status !== 200 || !draft.body) return forwardUpstream(draft)
  if (action === 'validate' && draft.body.revision !== body.expectedRevision)
    return NextResponse.json(
      {
        error: {
          code: 'LESSON_DRAFT_CONFLICT',
          message: 'O rascunho mudou. Confira a versão atual antes de publicar.',
        },
      },
      { status: 409 },
    )
  const videoIds =
    draft.body.revision !== body.expectedRevision
      ? []
      : [
          ...new Set(
            draft.body.document.plannedVideos.flatMap((v) => (v.videoId ? [v.videoId] : [])),
          ),
        ]
  const readyVideoIds: string[] = []
  try {
    for (let offset = 0; offset < videoIds.length; offset += 3) {
      const results = await Promise.all(
        videoIds
          .slice(offset, offset + 3)
          .map(async (id) => ({ id, video: await getVideoStatus(id) })),
      )
      for (const result of results)
        if (result.video.status === 'ready') readyVideoIds.push(result.id)
    }
  } catch (error) {
    return mediaErrorResponse(error)
  }
  const previous =
    action === 'publish' ? await gatewayFetch<LessonContentView>(`${path}/content`) : null
  if (previous && (previous.status !== 200 || !previous.body)) return forwardUpstream(previous)
  const result = await gatewayFetch(`${path}/draft/${action}`, {
    method: 'POST',
    body: { expectedRevision: body.expectedRevision, operationId: body.operationId, readyVideoIds },
  })
  if (action !== 'publish' || result.status < 200 || result.status >= 300)
    return forwardUpstream(result)
  scheduleZappyKnowledgeWork(async () => {
    const content = await gatewayFetch<LessonContentView>(`${path}/content`)
    if (content.status !== 200 || !content.body)
      throw new Error('Não foi possível ler a aula publicada para atualizar o Zappy.')
    const active = new Set(content.body.blocks.map((b) => b.id))
    const removed = previous?.body?.blocks.filter((b) => !active.has(b.id)) ?? []
    const failures: unknown[] = []
    for (const block of removed) {
      try {
        await deleteZappyKnowledgeForBlock(block.id)
      } catch (error) {
        failures.push(error)
      }
    }
    for (let offset = 0; offset < content.body.blocks.length; offset += 3) {
      const results = await Promise.allSettled(
        content.body.blocks.slice(offset, offset + 3).map(syncZappyKnowledgeForBlock),
      )
      for (const result of results) if (result.status === 'rejected') failures.push(result.reason)
    }
    if (failures.length) throw new AggregateError(failures, 'Falha ao sincronizar aula publicada')
  }, '[lesson-publication] Falha ao atualizar o Zappy após publicar a aula')
  return forwardUpstream(zappyKnowledgeMutationResult(result, false))
}
