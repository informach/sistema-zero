import {
  ART_SLOT_NAME_MAX_CHARS,
  type ArtSlotImportMode,
  isArtSlotName,
  MAX_STUDIO_ART_SLOTS,
} from '@sistemazero/core/learning'

/**
 * As réguas da autoria das vagas de arte (etapa 6 de
 * `docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`), puras para o teste. A régua de
 * forma do nome é a do core; a conferência do curso (repetidas, fora de ordem) é do members, e o
 * "Conferir" do rascunho a mostra antes de publicar.
 */

export { ART_SLOT_NAME_MAX_CHARS, isArtSlotName, MAX_STUDIO_ART_SLOTS }

export interface StudioArtSlotForm {
  name: string
  mode: ArtSlotImportMode
}

/** O que a autora digitou vira um nome de vaga (a mesma forma de um nome de imagem do Estúdio). */
export function normalizeArtSlotName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, ART_SLOT_NAME_MAX_CHARS)
    .replace(/-+$/g, '')
}

/**
 * Sugestão de nome para a vaga a partir da imagem do jogo que a criança vai redesenhar:
 * `chave-dourada` → `minha-chave`, `farol-listrado` → `meu-farol`. Só uma sugestão (a autora
 * edita): palavra terminada em `a` ou `e` leva `minha`, o resto leva `meu`.
 */
export function suggestArtSlotName(replaces: string): string {
  const first = normalizeArtSlotName(replaces).split('-')[0] ?? ''
  if (!first) return ''
  return normalizeArtSlotName(`${/[ae]$/.test(first) ? 'minha' : 'meu'}-${first}`)
}

interface DraftBlock {
  id: string
  content: unknown
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** As imagens dos jogos dos blocos de Estúdio desta aula (as que um desenho pode substituir). */
export function lessonGameImageNames(blocks: readonly DraftBlock[]): string[] {
  const names = new Set<string>()
  for (const block of blocks) {
    if (!record(block.content) || block.content.kind !== 'studio') continue
    const assets = record(block.content.initialProject) ? block.content.initialProject.assets : null
    if (!Array.isArray(assets)) continue
    for (const asset of assets)
      if (record(asset) && asset.kind === 'image' && typeof asset.name === 'string')
        names.add(asset.name)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** As vagas que os blocos de Pinta desta aula preenchem (fora o bloco em edição). */
export function lessonArtSlots(
  blocks: readonly DraftBlock[],
  excludeBlockId?: string,
): { name: string; replaces?: string }[] {
  const out: { name: string; replaces?: string }[] = []
  for (const block of blocks) {
    if (block.id === excludeBlockId || !record(block.content)) continue
    if (block.content.kind !== 'pinta' || !record(block.content.artSlot)) continue
    const { name, replaces } = block.content.artSlot
    if (typeof name !== 'string' || !isArtSlotName(name)) continue
    out.push({ name, ...(typeof replaces === 'string' ? { replaces } : {}) })
  }
  return out
}

/** O primeiro problema das vagas que o bloco de Estúdio importa, ou `null`. */
export function studioArtSlotsFormIssue(slots: readonly StudioArtSlotForm[]): string | null {
  if (slots.length > MAX_STUDIO_ART_SLOTS)
    return `O jogo importa no máximo ${MAX_STUDIO_ART_SLOTS} desenhos.`
  const seen = new Set<string>()
  for (const slot of slots) {
    if (!isArtSlotName(slot.name))
      return `"${slot.name}" não é um nome de vaga válido: use só letras minúsculas, números e hífen.`
    if (seen.has(slot.name)) return `A vaga "${slot.name}" aparece duas vezes.`
    seen.add(slot.name)
  }
  return null
}
