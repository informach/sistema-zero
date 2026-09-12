import type { LessonDraftDocument } from '@sistemazero/core/learning'
import type { LessonBlockContent } from '@/lib/types'

/** Advice to the author, separate from publication errors and never a fixed lesson template. */
export function lessonEditorialWarnings(
  document: LessonDraftDocument<LessonBlockContent>,
): string[] {
  const warnings: string[] = []
  const videos = document.blocks.flatMap((block) =>
    block.content.kind === 'video' && block.content.src ? [block.content.src] : [],
  )
  if (new Set(videos).size < videos.length)
    warnings.push(
      'Há vídeos repetidos em blocos diferentes. Confira se cada repetição ajuda na ação daquela etapa.',
    )
  const missingMedia = document.plannedVideos.filter(
    (video) =>
      !video.videoId &&
      !document.blocks.some(
        (block) =>
          block.id === video.blockId && block.content.kind === 'video' && block.content.src,
      ),
  )
  if (missingMedia.length)
    warnings.push(
      `${missingMedia.length} vídeo(s) ainda precisam ser gravados ou vinculados. Confira as mídias antes de publicar.`,
    )
  for (const section of document.sections) {
    const blocks = document.blocks.filter((block) => section.blockIds.includes(block.id))
    if (
      section.intent === 'exploration' &&
      !blocks.some(
        (block) =>
          block.content.kind === 'interactive' && block.content.activity.type !== 'checkpoint',
      )
    )
      warnings.push(`${section.title}: inclua uma experiência que permita agir sobre o conceito.`)
    if (blocks.some((block) => block.content.kind === 'rich_text'))
      warnings.push(
        `${section.title}: no Kids, considere vídeo para explicar e Zappy para orientar em vez de texto corrido.`,
      )
    if (
      blocks.some((block) => block.content.kind === 'dialogue' && block.content.text.length > 280)
    )
      warnings.push(
        `${section.title}: a fala está longa. Divida a orientação em ações e deixe a explicação no vídeo.`,
      )
    if (blocks.filter((block) => block.content.kind === 'interactive').length > 1)
      warnings.push(
        `${section.title}: confira se está claro por qual experiência a criança deve começar.`,
      )
  }
  const intents = document.sections.map((section) => section.intent)
  const delivery = intents.lastIndexOf('delivery')
  const closing = intents.lastIndexOf('closing')
  if (delivery >= 0 && closing >= 0 && closing < delivery)
    warnings.push(
      'Confira o fechamento: a entrega deve anteceder o quiz final quando os dois fazem parte da aula.',
    )
  return warnings
}
