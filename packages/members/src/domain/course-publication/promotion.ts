import {
  type CourseMediaOrigin,
  remapCourseMedia,
} from '@sistemazero/core/course/publication-media'
import { zappyVimeoVideoId } from '@sistemazero/core/zappy'
import type { CourseSnapshot } from './course-sync'

export interface CoursePromotionMedia {
  origin: CourseMediaOrigin
  replacements: Record<string, string>
  videos: Record<string, string>
  salesPageUrl?: string
}

/** Only active teaching content is transferred. Generated voices are rebuilt with the destination profile. */
export function promotionMediaSource(source: CourseSnapshot): CourseSnapshot {
  const copy = structuredClone(source)
  delete copy.archivedModules
  delete copy.archivedLessons
  for (const lesson of copy.lessons) {
    for (const document of [lesson.published, lesson.draft?.document]) {
      if (!document) continue
      for (const block of document.blocks) {
        if (block.content.kind === 'dialogue' || block.content.kind === 'quiz')
          delete block.content.vozes
        if (
          block.content.kind === 'interactive' &&
          block.content.activity &&
          typeof block.content.activity === 'object'
        )
          delete (block.content.activity as Record<string, unknown>).vozes
        if (block.content.kind === 'video') {
          const id = zappyVimeoVideoId(String(block.content.provider), String(block.content.src))
          if (!id) throw new Error('Vídeo sem identidade Vimeo na promoção')
          if (/^\d+$/.test(String(block.content.src)))
            block.content.src = `https://player.vimeo.com/video/${id}`
        }
      }
    }
  }
  return copy
}

/** Explicit validated replacements, never a search-and-replace of a hostname. */
export function promotedCourseSource(
  source: CourseSnapshot,
  media: CoursePromotionMedia,
): CourseSnapshot {
  const input = promotionMediaSource(source)
  const copy = remapCourseMedia(input, media.origin, new Map(Object.entries(media.replacements)))
  for (const lesson of copy.lessons) {
    for (const document of [lesson.published, lesson.draft?.document]) {
      if (!document) continue
      for (const video of document.plannedVideos) {
        if (!video.videoId) continue
        const target = media.videos[video.videoId]
        const id = target ? zappyVimeoVideoId('vimeo', target) : null
        if (!id || id === video.videoId)
          throw new Error('Vídeo planejado ainda sem cópia de produção')
        video.videoId = id
      }
    }
  }
  if (source.course.metadata?.salesPageUrl) {
    if (!media.salesPageUrl)
      throw new Error('A página de vendas ainda não foi preparada para produção')
    const url = new URL(media.salesPageUrl)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !url.pathname.startsWith('/kids/')
    )
      throw new Error('Página de vendas Kids de produção inválida')
    copy.course.metadata = { ...copy.course.metadata, salesPageUrl: url.href }
  }
  return copy
}
