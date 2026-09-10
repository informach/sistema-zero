import { compositeSceneImage, type SceneRgba } from './composite'
import type { SceneImage, Vec2 } from './document'
import type { SceneRgbaRaster } from './imageImport'
import { SCENE_LIMITS } from './limits'
import * as v from './validation'

export interface SceneAtlasTile {
  imageId: string
  base: SceneRgba
  preserveTransparentRgb?: boolean
}
export interface SceneAtlasSlot extends SceneAtlasTile {
  x: number
  y: number
  width: number
  height: number
}
export interface SceneAtlasLayout {
  width: number
  height: number
  slots: SceneAtlasSlot[]
}

/** Deterministic shelves, one pixel of replicated edge padding, no rotation or resampling. */
export function packSceneImageAtlas(
  images: readonly Pick<SceneImage, 'id' | 'width' | 'height'>[],
  tiles: readonly SceneAtlasTile[],
): SceneAtlasLayout {
  v.requireScene(
    tiles.length > 0 && tiles.length <= SCENE_LIMITS.materials,
    'tiles',
    'Escolha pinturas para juntar.',
  )
  const index = v.uniqueById(images, 'images')
  const sizes = tiles
    .map((tile, order) => {
      const image = index.get(tile.imageId)
      v.requireScene(image, 'imageId', 'Imagem ausente.')
      const width = v.number(image.width, 'width', 1, SCENE_LIMITS.imageSide, true)
      const height = v.number(image.height, 'height', 1, SCENE_LIMITS.imageSide, true)
      return { tile, order, width, height }
    })
    .sort((a, b) => b.height - a.height || b.width - a.width || a.order - b.order)
  let best: SceneAtlasLayout | null = null
  for (let width = 4; width <= SCENE_LIMITS.imageSide; width *= 2) {
    let x = 0,
      y = 0,
      rowHeight = 0
    const slots: SceneAtlasSlot[] = []
    let fits = true
    for (const entry of sizes) {
      const w = entry.width + 2,
        h = entry.height + 2
      if (x + w > width) {
        x = 0
        y += rowHeight
        rowHeight = 0
      }
      if (w > width || y + h > SCENE_LIMITS.imageSide) {
        fits = false
        break
      }
      slots[entry.order] = {
        ...entry.tile,
        x: x + 1,
        y: y + 1,
        width: entry.width,
        height: entry.height,
      }
      x += w
      rowHeight = Math.max(rowHeight, h)
    }
    if (!fits) continue
    const height = 2 ** Math.ceil(Math.log2(y + rowHeight))
    if (!best || width * height < best.width * best.height) best = { width, height, slots }
  }
  v.requireScene(
    best,
    'images',
    'As pinturas não couberam juntas sem reduzir pixels. Use imagens menores.',
  )
  return best
}

export function sceneAtlasUv(layout: SceneAtlasLayout, slot: SceneAtlasSlot, uv: Vec2): Vec2 {
  return [
    (slot.x + uv[0] * slot.width) / layout.width,
    (slot.y + uv[1] * slot.height) / layout.height,
  ]
}

/** Bake the current appearance; original layers remain in the document library, not in this raster. */
export function bakeSceneImageAtlas(
  images: readonly SceneImage[],
  tiles: readonly SceneAtlasTile[],
  palette: readonly SceneRgba[],
): SceneRgbaRaster {
  v.requireScene(
    images.every((image) => !image.flipbook),
    'images',
    'Pinturas animadas precisam manter seus quadros separados.',
  )
  const layout = packSceneImageAtlas(images, tiles)
  const index = new Map(images.map((image) => [image.id, image]))
  const pixels = new Uint8Array(layout.width * layout.height * 4)
  // Unused space must not turn an opaque material into a transparent one.
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255
  let transparent: boolean | undefined
  for (const slot of layout.slots) {
    const source = compositeSceneImage(
      index.get(slot.imageId)!,
      palette,
      slot.base,
      slot.preserveTransparentRgb,
    )
    let hasTransparency = false
    for (let i = 3; i < source.length; i += 4)
      if (source[i]! < 255) {
        hasTransparency = true
        break
      }
    v.requireScene(
      transparent === undefined || transparent === hasTransparency,
      'images',
      'Há pinturas opacas e transparentes nesta peça. Juntá-las mudaria como o modelo aparece; mantenha-as separadas.',
    )
    transparent = hasTransparency
    for (let y = -1; y <= slot.height; y++) {
      const row = Math.max(0, Math.min(slot.height - 1, y)) * slot.width
      for (let x = -1; x <= slot.width; x++) {
        const from = (row + Math.max(0, Math.min(slot.width - 1, x))) * 4
        const to = ((slot.y + y) * layout.width + slot.x + x) * 4
        for (let channel = 0; channel < 4; channel++) pixels[to + channel] = source[from + channel]!
      }
    }
  }
  return { width: layout.width, height: layout.height, pixels }
}
