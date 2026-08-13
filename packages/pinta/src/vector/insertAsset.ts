/**
 * "Trazer um desenho": inserir um asset da galeria DENTRO do desenho de vetor
 * aberto.
 *
 * Duas portas, pela decisão da dona: desenho de VETOR entra como as formas de
 * verdade (agrupadas, ainda editáveis ponto a ponto) e desenho de PIXEL ART
 * entra como uma FIGURA (move, gira, muda de tamanho, não se edita por dentro).
 *
 * ⭐ Os dois caminhos ASSAM o conteúdo na hora: nada guarda referência viva ao
 * asset de origem. Por isso não existe ciclo A→B→A, apagar o original não
 * fura o desenho, e o rasterizador do export consegue ler a figura.
 *
 * ⭐ O que entra é EXATAMENTE o que a miniatura da galeria mostra
 * (`core/assetThumb`): o seletor fica WYSIWYG, sem regra escondida.
 *
 * O plano (`insertPlanFor`) é PURO e testável; só o `resolveInsertSource`
 * precisa de navegador (rasteriza o bitmap num PNG data URL).
 */
import { thumbnailBitmap, thumbnailShapes } from '../core/assetThumb'
import { newId } from '../core/id'
import { type PintaAsset, type PintaBitmap, resolveAssetPalette } from '../core/project'
import { bitmapToPngDataUrl } from '../export/png'
import { boundsUnion, scaleShape, shapeBounds, translateShape } from './geometry'
import { MAX_IMAGE_SRC_CHARS, type VectorShape, visibleShapes } from './model'

/** O que a galeria oferece, ainda sem rasterizar nada. */
export type InsertPlan =
  | { kind: 'shapes'; width: number; height: number; shapes: VectorShape[] }
  | { kind: 'pixel'; width: number; height: number; bitmap: PintaBitmap; colors: readonly string[] }

/** O conteúdo já pronto para virar forma. */
export type InsertSource =
  | { kind: 'shapes'; width: number; height: number; shapes: VectorShape[] }
  | { kind: 'image'; width: number; height: number; src: string }

export type InsertKind = 'shapes' | 'image'

/** Predicado barato para listas: inspeciona estrutura, nunca achata bitmaps. */
export function insertKindFor(asset: PintaAsset): InsertKind | null {
  switch (asset.kind) {
    case 'vector-background':
      return 'shapes'
    case 'vector-sprite':
      return asset.animations[0]?.frames[0] ? 'shapes' : null
    case 'vector-tileset':
      return asset.tiles[0] ? 'shapes' : null
    case 'pixel-sprite':
      return asset.animations[0]?.frames[0] ? 'image' : null
    case 'pixel-background':
      return asset.cels.length > 0 ? 'image' : null
    case 'tileset':
      return asset.tiles[0] ? 'image' : null
    case 'tilemap':
      return null
  }
}

/** A inserção nasce ocupando metade do lado curto do documento. */
const TARGET_FRACTION = 0.5
const MIN_SCALE = 0.05
const MAX_SCALE = 8

/**
 * `null` = este asset não pode ser inserido.
 *
 * O MAPA fica de fora: o card dele mostra um MINIMAPA (um pixel colorido por
 * célula), então inserir "o que a miniatura mostra" daria uma grade de cores
 * sem sentido; e desenhar o mapa de verdade custaria até 6144px de PNG, acima
 * do teto da figura. Além disso um mapa é uma cena, não um adesivo.
 */
export function insertPlanFor(asset: PintaAsset): InsertPlan | null {
  const shapes = thumbnailShapes(asset)
  if (shapes) return { kind: 'shapes', ...shapes }
  const bitmap = thumbnailBitmap(asset)
  if (bitmap) {
    return {
      kind: 'pixel',
      width: bitmap.width,
      height: bitmap.height,
      bitmap,
      colors: resolveAssetPalette(asset),
    }
  }
  return null
}

/**
 * BROWSER: transforma o plano na fonte final. `null` quando não há canvas
 * (happy-dom) ou quando o PNG passou do teto que o sanitize aceita — recusar
 * aqui é o que impede a figura de sumir sozinha no próximo load.
 */
export function resolveInsertSource(plan: InsertPlan): InsertSource | null {
  if (plan.kind === 'shapes') return plan
  // Escala 1: pixel art vive entre 16 e 512px, então o PNG fica pequeno, e o
  // `image-rendering: pixelated` amplia sem borrar.
  const src = bitmapToPngDataUrl(plan.bitmap, plan.colors, 1)
  if (!src || src.length > MAX_IMAGE_SRC_CHARS) return null
  return { kind: 'image', width: plan.width, height: plan.height, src }
}

/** Fator para o desenho caber confortavelmente no documento de destino. */
function fitScale(
  source: { width: number; height: number },
  target: { width: number; height: number },
): number {
  const longest = Math.max(source.width, source.height)
  if (longest <= 0) return 1
  const wanted = (Math.min(target.width, target.height) * TARGET_FRACTION) / longest
  return Math.min(Math.max(wanted, MIN_SCALE), MAX_SCALE)
}

/**
 * As formas do desenho de origem, prontas para entrar: ids novos, UM grupo só
 * (a inserção se move como uma peça) e centralizadas no documento.
 *
 * ⚠️ Os grupos internos do original são ACHATADOS nesse grupo único; desagrupar
 * solta tudo. É o preço de "entra grudado", que é o que a dona pediu.
 */
export function shapesForInsert(
  source: Extract<InsertSource, { kind: 'shapes' }>,
  target: { width: number; height: number },
): VectorShape[] {
  const visible = visibleShapes(source.shapes)
  if (visible.length === 0) return []
  const scale = fitScale(source, target)
  const groupId = newId()
  const scaled = visible.map((shape) => ({
    ...scaleShape({ ...structuredClone(shape), id: newId() }, { x: 0, y: 0 }, scale, scale),
    groupId,
  }))
  const bounds = boundsUnion(scaled.map(shapeBounds))
  const dx = target.width / 2 - (bounds.x + bounds.width / 2)
  const dy = target.height / 2 - (bounds.y + bounds.height / 2)
  return scaled.map((shape) => translateShape(shape, dx, dy))
}

/** A FIGURA pronta para entrar: escalada e centralizada no documento. */
export function imageShapeForInsert(
  source: Extract<InsertSource, { kind: 'image' }>,
  target: { width: number; height: number },
): VectorShape {
  const scale = fitScale(source, target)
  const w = source.width * scale
  const h = source.height * scale
  return {
    id: newId(),
    // A figura já tem cor própria: preenchimento e contorno saem do caminho.
    fill: 'none',
    stroke: null,
    opacity: 1,
    rotation: 0,
    type: 'image',
    x: Math.round((target.width - w) / 2),
    y: Math.round((target.height - h) / 2),
    w,
    h,
    src: source.src,
    pixelated: true,
  }
}

/**
 * A lista do seletor: tira o que não dá para inserir (o mapa), tira o desenho
 * ABERTO (inserir a si mesmo só confunde, e num cenário dobraria as formas a
 * cada toque) e filtra pela busca, sem acento.
 */
export function insertableAssets(
  assets: readonly PintaAsset[],
  currentId: string,
  query: string,
  normalize: (value: string) => string,
): PintaAsset[] {
  const needle = normalize(query)
  return assets.filter((asset) => {
    if (asset.id === currentId) return false
    if (!insertKindFor(asset)) return false
    if (!needle) return true
    const haystack = normalize(`${asset.name} ${asset.projectRef?.name ?? ''}`)
    return haystack.includes(needle)
  })
}
