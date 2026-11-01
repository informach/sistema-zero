import { moduleAnimation } from '@sistemazero/core/course/module-animation'
import {
  type CourseTransferContext,
  CourseTransferResultSchema,
  type CourseTransferTask,
} from '@sistemazero/core/course/publication'
import { inventoryCourseMedia } from '@sistemazero/core/course/publication-media'
import type { PublicationWorkTask } from '../ports/course-publication.port'
import { type CourseSnapshot, hash } from './course-sync'
import type { PublicationTaskSeed } from './jobs'
import { type CoursePromotionMedia, promotionMediaSource } from './promotion'

/** Inventory before any copy. Repeated aliases and planned-only videos share one task. */
export function courseTransferTasks(
  source: CourseSnapshot,
  context: CourseTransferContext,
): PublicationTaskSeed[] {
  const input = promotionMediaSource(source)
  const hints = new Map<string, { kind: 'module-animation' | 'animation-poster'; sha256: string }>()
  for (const row of input.modules) {
    const animation = moduleAnimation(row.animation)
    if (!animation) continue
    hints.set(animation.url, { kind: 'module-animation', sha256: animation.sha256 })
    hints.set(animation.poster.url, { kind: 'animation-poster', sha256: animation.poster.sha256 })
  }
  const resources: CourseTransferTask[] = inventoryCourseMedia(input, context.origin).map(
    (resource) => {
      if (resource.kind === 'vimeo')
        return { kind: 'vimeo-copy', videoId: resource.videoId!, sources: resource.sources }
      const roles = resource.sources.flatMap((url) => (hints.has(url) ? [hints.get(url)!] : []))
      if (roles.some((role) => role.kind !== roles[0]?.kind || role.sha256 !== roles[0]?.sha256))
        throw new Error('A mesma arte tem versões ou papéis conflitantes')
      return {
        kind: 'r2-copy',
        visibility: resource.kind === 'r2-private' ? 'private' : 'public',
        key: resource.key!,
        sources: resource.sources,
        destinationKind: roles[0]?.kind ?? 'file',
        ...(roles[0] ? { sha256: roles[0].sha256 } : {}),
      }
    },
  )
  const videos = new Set(
    resources.flatMap((resource) => (resource.kind === 'vimeo-copy' ? [resource.videoId] : [])),
  )
  for (const lesson of input.lessons)
    for (const video of lesson.published.plannedVideos) {
      if (video.videoId && !videos.has(video.videoId)) {
        resources.push({ kind: 'vimeo-copy', videoId: video.videoId, sources: [] })
        videos.add(video.videoId)
      }
    }
  if (resources.length > 5000) throw new Error('O curso excede o teto de recursos por publicação')
  return resources.map((input) => ({ id: `${input.kind}:${hash(input)}`, kind: input.kind, input }))
}

/** Results are bound to the exact task, never accepted merely because they contain valid URLs. */
export function courseTransferProof(
  context: CourseTransferContext,
  tasks: readonly PublicationWorkTask[],
): CoursePromotionMedia {
  const replacements: Record<string, string> = {}
  const videos: Record<string, string> = {}
  for (const task of tasks) {
    if (!['r2-copy', 'vimeo-copy'].includes(task.kind)) continue
    if (task.status !== 'completed') throw new Error('A transferência ainda não terminou')
    const input = task.input
    const result = CourseTransferResultSchema.parse(task.result)
    if (
      input.kind !== result.kind ||
      (result.kind === 'r2-copy' &&
        (input.key !== result.sourceKey || input.visibility !== result.visibility)) ||
      (result.kind === 'vimeo-copy' &&
        (input.videoId !== result.sourceVideoId || result.videoId === result.sourceVideoId))
    )
      throw new Error('A cópia pertence a outro recurso')
    const url = result.kind === 'vimeo-copy' ? result.embedUrl : result.url
    if (!Array.isArray(input.sources) || input.sources.some((source) => typeof source !== 'string'))
      throw new Error('Referências de transferência inválidas')
    for (const source of input.sources) {
      if (replacements[source] && replacements[source] !== url)
        throw new Error('A mesma referência tem dois destinos')
      replacements[source] = url
    }
    if (result.kind === 'vimeo-copy') videos[result.sourceVideoId] = result.embedUrl
  }
  return {
    origin: context.origin,
    replacements,
    videos,
    ...(context.salesPageUrl ? { salesPageUrl: context.salesPageUrl } : {}),
  }
}
