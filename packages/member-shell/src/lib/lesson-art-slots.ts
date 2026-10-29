import type { ArtSlotImportMode } from '@sistemazero/core/learning'
import type { EditableStudioProject } from '@sistemazero/studio'

/**
 * O desenho da vaga de arte entrando no jogo do bloco de Estúdio (etapa 5 de
 * `docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`). Puro: recebe as imagens já
 * convertidas pelo exportador do Pinta e devolve o projeto com os materiais certos.
 */

/** A imagem pronta para o Estúdio (o payload do `exportLoadedAssetForStudio` do Pinta). */
export interface LessonArtImage {
  dataUrl: string
  width: number
  height: number
  sprite?: unknown
}

export interface LessonArtSlot {
  name: string
  mode: ArtSlotImportMode
  replaces: string | null
  /** `null`: a vaga está vazia (sem entrega, ou o desenho não pôde ser convertido). */
  image: LessonArtImage | null
}

type Asset = NonNullable<EditableStudioProject['assets']>[number]

/**
 * O teto da soma das imagens de um projeto do Estúdio (`MAX_ASSETS_TOTAL_CHARS` em
 * `packages/studio/src/core/projectAssets.ts`, interno ao pacote). Acima dele, o saneamento do
 * Estúdio PULA as imagens seguintes em silêncio, então o desenho que estouraria fica de fora aqui,
 * e a criança lê o recado de que o desenho não veio (review de 29/10/2026).
 */
export const STUDIO_ASSETS_TOTAL_CHARS = 33_000_000
/** O teto de quantidade de materiais (`MAX_ASSETS_COUNT` do Estúdio), pelo mesmo motivo. */
export const STUDIO_ASSETS_MAX_COUNT = 128

function drawing(base: Pick<Asset, 'id' | 'name'>, image: LessonArtImage): Asset {
  return {
    id: base.id,
    name: base.name,
    kind: 'image',
    dataUrl: image.dataUrl,
    width: image.width,
    height: image.height,
    source: 'lesson-art',
    ...(image.sprite ? { sprite: image.sprite as Asset['sprite'] } : {}),
  }
}

const same = (a: Asset, b: Asset) =>
  a.dataUrl === b.dataUrl &&
  a.width === b.width &&
  a.height === b.height &&
  a.source === b.source &&
  JSON.stringify(a.sprite ?? null) === JSON.stringify(b.sprite ?? null)

/**
 * Põe cada desenho no lugar da vaga:
 * - `add`: a imagem com o nome da vaga entra (ou é atualizada) nos materiais. Uma imagem da
 *   CRIANÇA com o mesmo nome (enviada por ela) nunca é trocada.
 * - `replace`: a imagem `replaces` passa a mostrar o desenho, com o mesmo id e nome; os blocos
 *   que já a usavam mostram o desenho sem nenhuma troca.
 * Vaga vazia não tira nada: o desenho que já entrou numa abertura anterior fica (os blocos podem
 * estar usando), e no `replace` a imagem original segue. Sem mudança, o MESMO objeto volta (o
 * projeto não vira "alterado" só por abrir). Projeto Pro ou Python fica como está.
 */
export function applyLessonArt<Project extends EditableStudioProject>(
  project: Project,
  slots: readonly LessonArtSlot[],
  options: { maxAssetsTotalChars?: number; onTooBig?: (slot: string) => void } = {},
): Project {
  if (project.kind === 'pro' || project.programmingLanguage === 'python') return project
  const assets = [...(project.assets ?? [])]
  const limit = options.maxAssetsTotalChars ?? STUDIO_ASSETS_TOTAL_CHARS
  let total = assets.reduce((sum, asset) => sum + (asset.dataUrl?.length ?? 0), 0)
  let changed = false
  for (const slot of slots) {
    if (!slot.image) continue
    const target = slot.mode === 'add' ? slot.name : slot.replaces
    if (!target) continue
    const index = assets.findIndex((asset) => asset.name === target)
    const current = index === -1 ? undefined : assets[index]
    if (slot.mode === 'add' && current && current.source !== 'lesson-art') continue
    const next = drawing(current ?? { id: `lesson-art-${slot.name}`, name: slot.name }, slot.image)
    if (current && same(current, next)) continue
    const grows = next.dataUrl.length - (current?.dataUrl?.length ?? 0)
    if (total + grows > limit || (!current && assets.length >= STUDIO_ASSETS_MAX_COUNT)) {
      options.onTooBig?.(slot.name)
      continue
    }
    if (current) assets[index] = next
    else if (slot.mode === 'add') assets.push(next)
    else continue
    total += grows
    changed = true
  }
  return changed ? { ...project, assets } : project
}
