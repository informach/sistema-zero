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
