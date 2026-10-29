/**
 * A VAGA DE ARTE (29/10/2026, `docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`): um
 * nome, válido no curso, para um desenho que a criança faz para um jogo. O bloco de Pinta da aula
 * PREENCHE a vaga; o bloco de Estúdio declara as vagas que IMPORTA, e o desenho entra nos
 * materiais do jogo com esse nome. É configuração de autoria (Admin e manifesto), nunca fixa no
 * código: os dois blocos servem a muitos cursos.
 *
 * Contrato PURO, sem framework: o members valida a autoria, o admin mostra os campos e o
 * member-shell monta o projeto, todos pela mesma régua.
 */

/** O bloco de Pinta preenche uma vaga. */
export interface PintaArtSlot {
  /** O nome da vaga, que também é o nome da imagem nos materiais do jogo. */
  name: string
  /** A imagem do jogo que o desenho substitui (referência no Admin e o modo `replace`). */
  replaces?: string
}

/** Como o desenho entra no jogo do bloco de Estúdio. */
export type ArtSlotImportMode = 'add' | 'replace'
export const ART_SLOT_IMPORT_MODES: readonly ArtSlotImportMode[] = ['add', 'replace']

/** O bloco de Estúdio importa uma vaga. */
export interface StudioArtSlotImport {
  name: string
  /**
   * `add`: o desenho entra em Materiais › Imagens com o nome da vaga, e a criança faz a troca nos
   * blocos. `replace`: o desenho toma o lugar da imagem que a vaga `replaces`.
   */
  mode: ArtSlotImportMode
}

/** Vagas que um bloco de Estúdio importa, no máximo. */
export const MAX_STUDIO_ART_SLOTS = 8
/**
 * A forma de um nome de imagem do Estúdio (`ASSET_NAME_PATTERN` e o teto de 48 em
 * `packages/studio/src/core/projectAssets.ts`): a vaga VIRA o nome da imagem, então nasce com a
 * mesma régua. Copiado e não importado porque o core não depende do Estúdio.
 */
export const ART_SLOT_NAME_MAX_CHARS = 48
export const ART_SLOT_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/

export function isArtSlotName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= ART_SLOT_NAME_MAX_CHARS &&
    ART_SLOT_NAME_PATTERN.test(value)
  )
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** O que está errado na vaga de um bloco de Pinta (frase para a autoria), ou `null`. */
export function pintaArtSlotIssue(slot: unknown): string | null {
  if (slot === undefined) return null
  if (!record(slot) || Object.keys(slot).some((k) => k !== 'name' && k !== 'replaces'))
    return 'A vaga de arte do desenho está inválida.'
  if (!isArtSlotName(slot.name))
    return `O nome da vaga de arte precisa ter só letras minúsculas, números e hífen, com até ${ART_SLOT_NAME_MAX_CHARS} caracteres.`
  if (slot.replaces !== undefined && !isArtSlotName(slot.replaces))
    return 'A imagem do jogo que o desenho substitui precisa ser um nome de imagem do Estúdio.'
  return null
}

/** O que está errado nas vagas importadas por um bloco de Estúdio (frase para a autoria), ou `null`. */
export function studioArtSlotsIssue(slots: unknown): string | null {
  if (slots === undefined) return null
  if (!Array.isArray(slots) || slots.length === 0 || slots.length > MAX_STUDIO_ART_SLOTS)
    return `O bloco do Estúdio importa de 1 a ${MAX_STUDIO_ART_SLOTS} vagas de arte.`
  const seen = new Set<string>()
  for (const slot of slots) {
    if (!record(slot) || Object.keys(slot).some((k) => k !== 'name' && k !== 'mode'))
      return 'Uma vaga de arte importada está inválida.'
    if (!isArtSlotName(slot.name))
      return `O nome da vaga de arte precisa ter só letras minúsculas, números e hífen, com até ${ART_SLOT_NAME_MAX_CHARS} caracteres.`
    if (!ART_SLOT_IMPORT_MODES.includes(slot.mode as ArtSlotImportMode))
      return `Escolha como a vaga "${slot.name}" entra no jogo: nos materiais ou trocando a imagem.`
    if (seen.has(slot.name)) return `A vaga "${slot.name}" aparece duas vezes neste bloco.`
    seen.add(slot.name)
  }
  return null
}

/**
 * Um bloco do curso que mexe com vagas, como a conferência do CURSO o enxerga (etapa 2). A
 * `order` é a posição no curso, comparada da esquerda para a direita: módulo, aula, parte e
 * bloco. `imageNames` são as imagens do jogo do Estúdio (`initialProject.assets` de tipo imagem).
 */
export type ArtSlotCourseBlock =
  | {
      kind: 'pinta'
      blockId: string
      lessonId: string
      lessonTitle: string
      order: readonly number[]
      slot: PintaArtSlot
    }
  | {
      kind: 'studio'
      blockId: string
      lessonId: string
      lessonTitle: string
      order: readonly number[]
      slots: readonly StudioArtSlotImport[]
      imageNames: readonly string[]
    }

/**
 * Um problema das vagas no curso. A `key` identifica o problema sem depender da frase: quem grava
 * compara as chaves de antes e de depois, e só recusa o que a gravação CRIOU (um curso que já
 * nasceu torto não prende quem está consertando outra coisa).
 */
export interface ArtSlotCourseIssue {
  key: string
  message: string
}

export function compareArtSlotOrder(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

type PintaCourseBlock = Extract<ArtSlotCourseBlock, { kind: 'pinta' }>

/** Os problemas das vagas de arte de um curso, na ordem em que os blocos aparecem. */
export function artSlotCourseIssues(blocks: readonly ArtSlotCourseBlock[]): ArtSlotCourseIssue[] {
  const ordered = [...blocks].sort((a, b) => compareArtSlotOrder(a.order, b.order))
  const fillers = new Map<string, PintaCourseBlock>()
  const issues: ArtSlotCourseIssue[] = []
  for (const block of ordered) {
    if (block.kind !== 'pinta') continue
    const first = fillers.get(block.slot.name)
    if (!first) {
      fillers.set(block.slot.name, block)
      continue
    }
    issues.push({
      key: `duplicate:${block.slot.name}:${block.blockId}`,
      message:
        `As aulas "${first.lessonTitle}" e "${block.lessonTitle}" preenchem a mesma vaga de arte ` +
        `"${block.slot.name}". Cada vaga recebe um desenho só no curso: dê outro nome a uma delas.`,
    })
  }
  for (const block of ordered) {
    if (block.kind !== 'studio') continue
    const game = `O Estúdio da aula "${block.lessonTitle}"`
    for (const slot of block.slots) {
      const filler = fillers.get(slot.name)
      if (!filler) {
        issues.push({
          key: `missing:${block.blockId}:${slot.name}`,
          message: `${game} importa a vaga de arte "${slot.name}", mas nenhum desenho do curso preenche essa vaga.`,
        })
        continue
      }
      if (compareArtSlotOrder(filler.order, block.order) > 0)
        issues.push({
          key: `order:${block.blockId}:${slot.name}:${filler.blockId}`,
          message:
            `${game} importa a vaga de arte "${slot.name}", que só é preenchida depois, na aula ` +
            `"${filler.lessonTitle}". O desenho precisa vir antes do jogo que o usa.`,
        })
      if (slot.mode === 'add') {
        if (block.imageNames.includes(slot.name))
          issues.push({
            key: `add-collision:${block.blockId}:${slot.name}`,
            message:
              `O jogo do Estúdio da aula "${block.lessonTitle}" já tem uma imagem chamada ` +
              `"${slot.name}". Dê outro nome à vaga, ou escolha trocar a imagem.`,
          })
        continue
      }
      const replaces = filler.slot.replaces
      if (!replaces)
        issues.push({
          key: `replace-missing:${block.blockId}:${slot.name}:${filler.blockId}`,
          message:
            `${game} troca uma imagem pelo desenho da vaga "${slot.name}", mas o desenho da aula ` +
            `"${filler.lessonTitle}" não diz qual imagem do jogo ele substitui.`,
        })
      else if (!block.imageNames.includes(replaces))
        issues.push({
          key: `replace-unknown:${block.blockId}:${slot.name}:${replaces}`,
          message:
            `O desenho da vaga "${slot.name}" substitui a imagem "${replaces}", que não existe no ` +
            `jogo do Estúdio da aula "${block.lessonTitle}".`,
        })
    }
  }
  return issues
}

/** Os problemas de `after` que `before` não tinha: o que uma gravação criou. */
export function newArtSlotCourseIssues(
  before: readonly ArtSlotCourseIssue[],
  after: readonly ArtSlotCourseIssue[],
): ArtSlotCourseIssue[] {
  const known = new Set(before.map((issue) => issue.key))
  return after.filter((issue) => !known.has(issue.key))
}
