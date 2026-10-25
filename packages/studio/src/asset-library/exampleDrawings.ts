import { PINTA_EXAMPLE_NAME_PATTERN } from '@sistemazero/core/studio/pinta-source-ref'
import type { ProjectAsset } from '#core'

/**
 * Desenhos dos JOGOS DE EXEMPLO que nasceram no Pinta (hoje, a galeria Pygame-ce). O material
 * do projeto aponta para o documento de origem pelo `libId`
 * `example-<galeria>:<jogo>:<desenho>` (com `source: 'library'`, a convenção dos exemplos;
 * o saneamento o preserva no salvar, na nuvem e na exportação). Não é um `personal:`: a
 * sincronia com a biblioteca pessoal não o vê, e nada é copiado para o Pinta até a criança
 * pedir "Editar" (aí ele vira um material `personal:<id>` comum, com a receita do Pinta).
 *
 * O documento é `<jogo>-<desenho>` no `.pinta.json` do jogo (o `drawings` do módulo gerado),
 * e o PNG é `assets/<desenho>.png` (packages/pinta/scripts/pygame-gallery).
 */
export type ExampleDrawingGallery = 'pygame'

export interface ExampleDrawingRef {
  gallery: ExampleDrawingGallery
  game: string
  drawing: string
}

const GALLERIES: readonly ExampleDrawingGallery[] = ['pygame']
// A mesma regra com que o Pinta guarda a marca de origem da cópia (uma regra só, no core).
const PART = PINTA_EXAMPLE_NAME_PATTERN

export function exampleDrawingLibId(ref: ExampleDrawingRef): string {
  return `example-${ref.gallery}:${ref.game}:${ref.drawing}`
}

/** A referência do material, ou `null` (não é desenho de exemplo). */
export function exampleDrawingRefOf(
  asset: Pick<ProjectAsset, 'kind' | 'source' | 'libId'>,
): ExampleDrawingRef | null {
  if (asset.kind !== 'image' || asset.source !== 'library' || !asset.libId) return null
  const match = /^example-([a-z]+):([^:]+):([^:]+)$/.exec(asset.libId)
  if (!match) return null
  const gallery = match[1] as ExampleDrawingGallery
  const [, , game, drawing] = match
  if (!GALLERIES.includes(gallery) || !PART.test(game!) || !PART.test(drawing!)) return null
  return { gallery, game: game!, drawing: drawing! }
}

/**
 * A origem das cópias no Pinta (`example-<galeria>:<jogo>`): o Pinta marca cada cópia com ela
 * e o id do documento, e é isso que faz um mesmo documento ter UMA cópia na galeria da criança.
 */
export function exampleDrawingOrigin(ref: ExampleDrawingRef): string {
  return `example-${ref.gallery}:${ref.game}`
}

/** O id do documento de origem dentro do `.pinta.json` do jogo. */
export function exampleDrawingDocumentId(ref: ExampleDrawingRef): string {
  return `${ref.game}-${ref.drawing}`
}

/**
 * O `.pinta.json` do jogo, carregado SÓ quando a criança pede para editar: ele mora num pedaço
 * próprio (`PYGAME_GAME_DRAWINGS`), que abrir o jogo não baixa.
 */
export async function loadExampleDrawingsJson(ref: ExampleDrawingRef): Promise<string> {
  const { PYGAME_GAME_DRAWINGS } = await import('../examples/python/pygameGames.loaders.generated')
  // `constructor`/`toString` passam no padrão do nome: só as chaves PRÓPRIAS do mapa.
  const loader = Object.hasOwn(PYGAME_GAME_DRAWINGS, ref.game)
    ? PYGAME_GAME_DRAWINGS[ref.game]
    : undefined
  if (typeof loader !== 'function')
    throw new Error('Este jogo de exemplo não está mais disponível.')
  const drawings: unknown = await loader()
  if (typeof drawings !== 'string' || !drawings)
    throw new Error('Os desenhos deste jogo não estão disponíveis para editar.')
  return drawings
}
