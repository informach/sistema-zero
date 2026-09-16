import type { LessonDraftDocument } from '@sistemazero/core/learning'
import { sceneDefaultGoalIds, sceneTargets } from '@sistemazero/core/learning/scene'
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
    for (const block of blocks) {
      // ⚠️ `intent` é da SEÇÃO e `type` é da ATIVIDADE: dois eixos com dois nomes parecidos.
      // A seção diz o que ela quer daquele trecho da aula; a atividade diz o que o bloco é.
      // Enquanto "demonstração" era um MODO dentro de `exploration`, cruzar os dois pedia três
      // condições aninhadas; agora é a comparação direta que ela sempre quis ser.
      if (block.content.kind !== 'interactive') continue
      const type = block.content.activity.type
      if (type !== 'demonstration' && type !== 'experimentation') continue
      if (
        (section.intent === 'demonstration' && type !== 'demonstration') ||
        (section.intent === 'exploration' && type !== 'experimentation')
      )
        warnings.push(
          `${section.title}: confira a intenção da seção e o tipo da cena. Demonstração é para observar; experimentação é para agir sobre a cena.`,
        )
      /**
       * ⚠️⚠️ O caso recortou a missão, e a pergunta continua sendo a de fábrica.
       *
       * A pergunta do modelo foi escrita contra a história INTEIRA da cena. Quando o professor
       * reduz a missão a parte das descobertas, ela pode cobrar a regra de algo que a criança
       * não precisou ver — e a regra da casa é que nada caia sem a criança ter VISTO o que a
       * afirmação diz. ⚠️ Avisa e não bloqueia: na maioria das cenas a ideia central sobrevive
       * ao recorte, e só quem escreveu o caso sabe dizer se sobreviveu nesta.
       */
      if (
        type === 'experimentation' &&
        !block.content.checkpoint &&
        // ⚠️ Contra a missão de FÁBRICA, e não contra todas as metas: as metas só de caso
        // (`soNoCaso`) nunca estiveram na missão que a pergunta de fábrica cobre.
        sceneTargets(block.content.activity).length <
          sceneDefaultGoalIds(block.content.activity.scene).length
      )
        warnings.push(
          `${section.title}: a missão cobra parte das descobertas da cena, e a pergunta do fim é a de fábrica. Confira se ela ainda fala do que a criança vai ver, ou escreva a sua.`,
        )
    }
    if (
      section.intent === 'exploration' &&
      !blocks.some(
        (block) =>
          block.content.kind === 'interactive' && block.content.activity.type !== 'question',
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
