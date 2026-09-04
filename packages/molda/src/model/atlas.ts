/**
 * O ATLAS: a folha única que junta as peles pintadas do modelo (uma região por
 * face pintada) e um swatch 4×4 por cor da paleta (a face NÃO pintada aponta
 * para o centro do swatch da cor base da peça: um modelo sem pintura vira um
 * atlas minúsculo). É o que o palco mostra (uma DataTexture) e o que o `.glb`
 * leva.
 *
 * Empacotamento em PRATELEIRAS, determinístico (ordena por altura, largura e
 * chave), com 1 texel de folga em volta de cada região (defesa contra filtro
 * linear), tentando 64 → 128 → 256 → 512; se não couber, `atlas-full` e a
 * criança recebe o recado de diminuir os texels por bloco.
 *
 * O gêmeo NÃO tem região própria: a face dele usa a região da face espelhada
 * da fonte com o `u` invertido (é o que "espelhar" significa).
 */

import { MOLDA_LIMITS } from '../core/limits'
import type { FaceId, MoldaModelAsset, MoldaPart } from '../core/model'
import { resolvePaletteColors } from '../core/sanitize'
import { MIRRORED_FACE } from './twins'

export const SWATCH_SIZE = 4
export const ATLAS_PADDING = 1
export const ATLAS_SIZES: readonly [number, ...number[]] = (() => {
  const sizes: number[] = []
  for (let size = 64; size <= MOLDA_LIMITS.atlasMax; size *= 2) sizes.push(size)
  if (sizes.length === 0) throw new Error('O teto do atlas precisa ser de pelo menos 64')
  return sizes as [number, ...number[]]
})()

export interface AtlasRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface AtlasLayout {
  /** Lado do atlas (quadrado, potência de 2). */
  size: number
  /** Um swatch por índice de cor (o 0 existe mas nunca é usado). */
  swatches: AtlasRegion[]
  /** Região por `faceKey` das faces pintadas das peças FONTE. */
  faces: Map<string, AtlasRegion>
  /** Descreve os itens: se não mudou, o layout não muda. */
  key: string
}

export type AtlasResult =
  | { ok: true; layout: AtlasLayout }
  | { ok: false; reason: 'atlas-full'; key: string }

export function faceKey(partId: string, face: FaceId): string {
  return `${partId}:${face}`
}

interface AtlasItem {
  key: string
  width: number
  height: number
}

function atlasItems(model: MoldaModelAsset): { swatches: AtlasItem[]; faces: AtlasItem[] } {
  const colors = resolvePaletteColors(model)
  const swatches: AtlasItem[] = colors.map((_hex, index) => ({
    key: `swatch:${index}`,
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
  }))
  const faces: AtlasItem[] = []
  for (const part of model.parts) {
    if (part.mirrorOf) continue
    for (const [face, skin] of Object.entries(part.faces)) {
      if (!skin) continue
      faces.push({ key: faceKey(part.id, face as FaceId), width: skin.width, height: skin.height })
    }
  }
  return { swatches, faces }
}

/** Muda quando entra/sai uma face pintada, um tamanho de pele ou o número de cores. */
export function atlasKey(model: MoldaModelAsset): string {
  const { swatches, faces } = atlasItems(model)
  const parts = faces.map((item) => `${item.key}=${item.width}x${item.height}`).sort()
  return `${swatches.length}|${parts.join(',')}`
}

function sortItems(items: AtlasItem[]): AtlasItem[] {
  return [...items].sort(
    (a, b) =>
      b.height - a.height || b.width - a.width || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  )
}

function tryPack(items: AtlasItem[], size: number): Map<string, AtlasRegion> | null {
  const placed = new Map<string, AtlasRegion>()
  let x = 0
  let y = 0
  let shelfHeight = 0
  for (const item of items) {
    const w = item.width + ATLAS_PADDING * 2
    const h = item.height + ATLAS_PADDING * 2
    if (w > size || h > size) return null
    if (x + w > size) {
      y += shelfHeight
      x = 0
      shelfHeight = 0
    }
    if (y + h > size) return null
    placed.set(item.key, {
      x: x + ATLAS_PADDING,
      y: y + ATLAS_PADDING,
      width: item.width,
      height: item.height,
    })
    x += w
    shelfHeight = Math.max(shelfHeight, h)
  }
  return placed
}

export function packAtlas(model: MoldaModelAsset): AtlasResult {
  const { swatches, faces } = atlasItems(model)
  const key = atlasKey(model)
  const items = sortItems([...swatches, ...faces])
  for (const size of ATLAS_SIZES) {
    const placed = tryPack(items, size)
    if (!placed) continue
    const layout: AtlasLayout = {
      size,
      swatches: swatches.map((item) => placed.get(item.key) as AtlasRegion),
      faces: new Map(faces.map((item) => [item.key, placed.get(item.key) as AtlasRegion])),
      key,
    }
    return { ok: true, layout }
  }
  return { ok: false, reason: 'atlas-full', key }
}

interface Shelf {
  y: number
  x: number
  height: number
  limit: number
}

function previousRegion(previous: AtlasLayout, item: AtlasItem): AtlasRegion | undefined {
  if (item.key.startsWith('swatch:')) {
    const index = Number(item.key.slice('swatch:'.length))
    return previous.swatches[index]
  }
  return previous.faces.get(item.key)
}

/**
 * Acrescenta regiões sem mexer nas que já estavam no atlas. Se as prateleiras
 * restantes não comportarem a mudança, volta ao empacotamento completo (que
 * também pode aumentar o lado do atlas ou devolver `atlas-full`).
 */
export function packAtlasIncremental(model: MoldaModelAsset, previous: AtlasLayout): AtlasResult {
  const key = atlasKey(model)
  if (previous.key === key) return { ok: true, layout: previous }
  if (previous.size > MOLDA_LIMITS.atlasMax) return packAtlas(model)
  const { swatches, faces } = atlasItems(model)
  const items = [...swatches, ...faces]
  const placed = new Map<string, AtlasRegion>()
  for (const item of items) {
    const region = previousRegion(previous, item)
    if (!region || region.width !== item.width || region.height !== item.height) continue
    placed.set(item.key, region)
  }

  const shelvesByY = new Map<number, Shelf>()
  for (const region of placed.values()) {
    const y = region.y - ATLAS_PADDING
    const endX = region.x + region.width + ATLAS_PADDING
    const shelf = shelvesByY.get(y)
    const height = region.height + ATLAS_PADDING * 2
    if (shelf) {
      shelf.x = Math.max(shelf.x, endX)
      shelf.height = Math.max(shelf.height, height)
    } else shelvesByY.set(y, { y, x: endX, height, limit: 0 })
  }
  const shelves = [...shelvesByY.values()].sort((a, b) => a.y - b.y)
  for (let index = 0; index < shelves.length; index += 1) {
    const shelf = shelves[index] as Shelf
    shelf.limit = (shelves[index + 1]?.y ?? previous.size) - shelf.y
  }

  for (const item of sortItems(items.filter((candidate) => !placed.has(candidate.key)))) {
    const width = item.width + ATLAS_PADDING * 2
    const height = item.height + ATLAS_PADDING * 2
    let shelf = shelves.find(
      (candidate) => height <= candidate.limit && candidate.x + width <= previous.size,
    )
    if (!shelf) {
      const y = shelves.reduce((end, candidate) => Math.max(end, candidate.y + candidate.height), 0)
      if (width > previous.size || y + height > previous.size) return packAtlas(model)
      shelf = { y, x: 0, height: 0, limit: previous.size - y }
      shelves.push(shelf)
    }
    placed.set(item.key, {
      x: shelf.x + ATLAS_PADDING,
      y: shelf.y + ATLAS_PADDING,
      width: item.width,
      height: item.height,
    })
    shelf.x += width
    shelf.height = Math.max(shelf.height, height)
  }

  return {
    ok: true,
    layout: {
      size: previous.size,
      swatches: swatches.map((item) => placed.get(item.key) as AtlasRegion),
      faces: new Map(faces.map((item) => [item.key, placed.get(item.key) as AtlasRegion])),
      key,
    },
  }
}

/**
 * Layout mínimo usado pelo palco quando as peles excedem o teto. Ele mantém
 * todos os swatches e a chave do modelo completo, mas não reserva regiões de
 * pintura: assim nenhuma peça some e todas continuam visíveis pela cor base.
 */
export function packAtlasFallback(model: MoldaModelAsset): AtlasLayout {
  const baseColorsOnly: MoldaModelAsset = {
    ...model,
    parts: model.parts.map((part) => ({ ...part, faces: {} })),
  }
  const packed = packAtlas(baseColorsOnly)
  if (!packed.ok) throw new Error('Os swatches excederam o teto interno do atlas')
  return { ...packed.layout, key: atlasKey(model) }
}

/** A região (da fonte) que esta face desenha, e se o `u` é invertido (gêmeo). */
export function faceRegion(
  layout: AtlasLayout,
  part: MoldaPart,
  source: MoldaPart,
  face: FaceId,
): { region: AtlasRegion; flipU: boolean } | null {
  const twin = part.mirrorOf !== undefined
  const sourceFace = twin ? (MIRRORED_FACE[face] ?? face) : face
  const region = layout.faces.get(faceKey(source.id, sourceFace))
  return region ? { region, flipU: twin } : null
}

/**
 * UV local (u, v em [0, 1]) → UV do atlas. Face sem pele cai no CENTRO do
 * swatch da cor base (UV degenerada: a face inteira sai da mesma cor).
 */
export function mapFaceUv(
  layout: AtlasLayout,
  part: MoldaPart,
  source: MoldaPart,
  face: FaceId,
  u: number,
  v: number,
): [number, number] {
  const found = faceRegion(layout, part, source, face)
  if (found) {
    const uu = found.flipU ? 1 - u : u
    return [
      (found.region.x + uu * found.region.width) / layout.size,
      (found.region.y + v * found.region.height) / layout.size,
    ]
  }
  const swatch = layout.swatches[source.color] ?? layout.swatches[1]
  if (!swatch) return [0, 0]
  return [(swatch.x + SWATCH_SIZE / 2) / layout.size, (swatch.y + SWATCH_SIZE / 2) / layout.size]
}
