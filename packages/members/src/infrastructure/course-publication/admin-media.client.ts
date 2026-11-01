import {
  CoursePublicationMediaPlanSchema,
  CoursePublicationMediaResultSchema,
} from '@sistemazero/core/course/publication'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import type { LessonDraftDocument } from '@sistemazero/core/learning'
import type { Environment } from '../../domain/course-publication/course-sync'
import type { CoursePublicationMediaPort } from '../../domain/ports/course-publication.port'
import type { PublicationHttpFetch } from './http-fetch'

export function createAdminPublicationMediaClient(
  config: { url: string; token: string; environment: Environment },
  fetcher: PublicationHttpFetch = fetch,
): CoursePublicationMediaPort {
  const url = new URL('/api/internal/course-publication/media', config.url)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    config.token.length < 32
  )
    throw new Error('Configuração de mídia inválida')
  const call = async (body: unknown, signal: AbortSignal, profileHash?: string) => {
    const response = await fetcher(url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(80_000)]),
      headers: {
        'content-type': 'application/json',
        'x-course-publication-token': config.token,
        'x-course-environment': config.environment,
        ...(profileHash ? { 'x-course-media-profile': profileHash } : {}),
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error('O serviço de mídia não concluiu a preparação')
    const data = (await readJsonBodyWithLimit(response, 16 * 1024 * 1024, signal)) as {
      environment?: unknown
      result?: unknown
    }
    if (data?.environment !== config.environment)
      throw new Error('A resposta de mídia veio de outro ambiente')
    return data.result
  }
  return {
    plan: async (documents, signal) =>
      CoursePublicationMediaPlanSchema.parse(
        await call({ action: 'plan', documents: documents.map(mediaDocument) }, signal),
      ),
    execute: async (task, signal, profileHash) =>
      CoursePublicationMediaResultSchema.parse(
        await call({ action: 'execute', task }, signal, profileHash),
      ),
  }
}
function mediaDocument(document: LessonDraftDocument) {
  return {
    title: document.title,
    slug: document.slug,
    estimatedMinutes: document.estimatedMinutes,
    blocks: document.blocks.filter((block) =>
      ['dialogue', 'rich_text', 'video', 'quiz', 'interactive'].includes(block.content.kind),
    ),
    attachments: document.attachments.filter((attachment) => attachment.zappyStudentNotebook),
  }
}
