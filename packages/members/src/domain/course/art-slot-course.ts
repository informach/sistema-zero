import {
  type ArtSlotCourseBlock,
  type ArtSlotCourseIssue,
  artSlotCourseIssues,
  compareArtSlotOrder,
  newArtSlotCourseIssues,
  type PintaArtSlot,
  pintaArtSlotIssue,
  type StudioArtSlotImport,
  studioArtSlotsIssue,
} from '@sistemazero/core/learning'

/**
 * A vaga de arte no CURSO (etapa 2 de `docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`):
 * transforma os blocos guardados nos blocos da régua `artSlotCourseIssues` do core. O SQL de
 * `listArtSlotBlocks` (Drizzle) e o falso em memória passam pelas MESMAS funções daqui.
 */

/** Onde a aula fica no curso. */
export interface ArtSlotLessonPosition {
  lessonId: string
  lessonTitle: string
  moduleOrder: number
  lessonOrder: number
  /** A aula está publicada (ausente vale como publicada). */
  published?: boolean
}

/** O bloco preenche ou importa alguma vaga? (decide se uma gravação precisa da conferência) */
export function hasArtSlots(content: unknown): boolean {
  if (typeof content !== 'object' || content === null) return false
  const block = content as { kind?: unknown; artSlot?: unknown; artSlots?: unknown }
  return (
    (block.kind === 'pinta' && block.artSlot !== undefined) ||
    (block.kind === 'studio' && block.artSlots !== undefined)
  )
}

/**
 * A parte da aula em que o bloco está: o índice da seção que o cita. Sem estrutura, toda a aula
 * é uma parte só (0); bloco fora de todas as partes vai para depois da última.
 */
export function artSlotSectionIndex(sections: unknown, blockId: string): number {
  if (!Array.isArray(sections)) return 0
  const index = sections.findIndex(
    (section) =>
      typeof section === 'object' &&
      section !== null &&
      Array.isArray((section as { blockIds?: unknown }).blockIds) &&
      (section as { blockIds: unknown[] }).blockIds.includes(blockId),
  )
  return index === -1 ? sections.length : index
}

/**
 * As imagens do jogo do Estúdio: os assets de tipo imagem do `initialProject`. ⚠️ Espelha o SQL
 * de `listArtSlotBlocks`, que tira os nomes no banco para não trazer o projeto inteiro (até 1,5
 * MB por bloco). Mexeu num, mexa no outro.
 */
export function studioGameImageNames(project: unknown): string[] {
  const assets = (project as { assets?: unknown } | null)?.assets
  if (!Array.isArray(assets)) return []
  return assets.flatMap((asset) =>
    typeof asset === 'object' &&
    asset !== null &&
    (asset as { kind?: unknown }).kind === 'image' &&
    typeof (asset as { name?: unknown }).name === 'string'
      ? [(asset as { name: string }).name]
      : [],
  )
}

/** Uma linha guardada como a régua do curso a enxerga; `null` quando não há vaga legível. */
export function toArtSlotCourseBlock(row: {
  blockId: string
  lessonId: string
  kind: string
  lessonTitle: string
  order: readonly number[]
  published?: boolean
  artSlot: unknown
  artSlots: unknown
  imageNames: readonly string[]
}): ArtSlotCourseBlock | null {
  const published = row.published === false ? { published: false } : {}
  // Vaga ILEGÍVEL fica de fora: a forma já é recusada ao gravar o bloco, e uma linha antiga
  // quebrada não pode prender quem está consertando outra parte do curso.
  if (row.kind === 'pinta' && row.artSlot != null && pintaArtSlotIssue(row.artSlot) === null)
    return {
      kind: 'pinta',
      blockId: row.blockId,
      lessonId: row.lessonId,
      lessonTitle: row.lessonTitle,
      order: row.order,
      ...published,
      slot: row.artSlot as PintaArtSlot,
    }
  if (row.kind === 'studio' && row.artSlots != null && studioArtSlotsIssue(row.artSlots) === null)
    return {
      kind: 'studio',
      blockId: row.blockId,
      lessonId: row.lessonId,
      lessonTitle: row.lessonTitle,
      order: row.order,
      ...published,
      slots: row.artSlots as StudioArtSlotImport[],
      imageNames: row.imageNames,
    }
  return null
}

/** Os blocos de vaga de UMA aula, a partir do conteúdo (rascunho conferido e o falso). */
export function lessonArtSlotBlocks(
  lesson: ArtSlotLessonPosition,
  blocks: readonly { id: string; content: unknown }[],
  sections: unknown,
): ArtSlotCourseBlock[] {
  return blocks.flatMap((block, blockOrder) => {
    if (!hasArtSlots(block.content)) return []
    const content = block.content as {
      kind: string
      artSlot?: unknown
      artSlots?: unknown
      initialProject?: unknown
    }
    const parsed = toArtSlotCourseBlock({
      blockId: block.id,
      lessonId: lesson.lessonId,
      kind: content.kind,
      lessonTitle: lesson.lessonTitle,
      order: [
        lesson.moduleOrder,
        lesson.lessonOrder,
        artSlotSectionIndex(sections, block.id),
        blockOrder,
      ],
      ...(lesson.published === false ? { published: false } : {}),
      artSlot: content.artSlot,
      artSlots: content.artSlots,
      imageNames: content.kind === 'studio' ? studioGameImageNames(content.initialProject) : [],
    })
    return parsed ? [parsed] : []
  })
}

/**
 * O que publicar este rascunho criaria nas vagas do curso, sem gravar nada: as vagas de agora,
 * com os blocos da aula trocados pelos do rascunho. É o "Conferir" antes do "Publicar"; quem
 * decide de verdade é a conferência da publicação, sob a trava do curso.
 */
export function draftArtSlotIssues(
  current: readonly ArtSlotCourseBlock[],
  lesson: ArtSlotLessonPosition,
  blocks: readonly { id: string; content: unknown }[],
  sections: unknown,
): ArtSlotCourseIssue[] {
  // O rascunho é conferido como se fosse publicado: é o que o "Publicar" vai fazer.
  const draft = lessonArtSlotBlocks({ ...lesson, published: true }, blocks, sections)
  if (!draft.length && !current.some((block) => block.lessonId === lesson.lessonId)) return []
  return newArtSlotCourseIssues(
    artSlotCourseIssues(current),
    artSlotCourseIssues([
      ...current.filter((block) => block.lessonId !== lesson.lessonId),
      ...draft,
    ]),
  )
}

/**
 * O bloco de Pinta que preenche cada vaga para a CRIANÇA: o primeiro em ordem de curso (módulo,
 * aula, parte, bloco) entre os de aula PUBLICADA. Lê os mesmos blocos da conferência
 * (`listArtSlotBlocks`: sem arquivados, com a parte da aula), então a autoria e a aula escolhem o
 * mesmo desenho (review de 29/10/2026: a busca antiga pegava bloco arquivado e ignorava a parte).
 */
export function artSlotFillers(
  blocks: readonly ArtSlotCourseBlock[],
  names: readonly string[],
): Map<string, { blockId: string; replaces: string | null }> {
  const fillers = new Map<string, { blockId: string; replaces: string | null }>()
  const ordered = blocks
    .filter((block) => block.kind === 'pinta' && block.published !== false)
    .sort((a, b) => compareArtSlotOrder(a.order, b.order))
  for (const block of ordered) {
    if (block.kind !== 'pinta' || !names.includes(block.slot.name)) continue
    if (!fillers.has(block.slot.name))
      fillers.set(block.slot.name, {
        blockId: block.blockId,
        replaces: block.slot.replaces ?? null,
      })
  }
  return fillers
}
