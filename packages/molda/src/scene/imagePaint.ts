import { PALETTE_SIZE } from '../core/palette'
import { type BrushSize, lineTexels, stampTexels, type Texel } from '../paint/skinPaint'
import { requireEditableAppearance, sceneAppearanceUsage } from './appearanceUsage'
import { finishSceneCommand } from './commandContext'
import type { ScenePixelRegion } from './composite'
import type { MoldaSceneDocument, SceneImage } from './document'
import { imageRegionContains, readImageRegion } from './imageRegion'
import {
  SCENE_MATERIAL_IMAGE_FIELDS,
  SCENE_MATERIAL_IMAGE_KINDS,
  type SceneMaterialImageKind,
} from './materialImages'
import * as v from './validation'

export { sceneImageTexel } from './imageCoordinates'

export type ScenePaintRgba = [number, number, number, number]
export type ScenePaintColor = number | ScenePaintRgba
export interface ScenePaintTarget {
  nodeId: string
  materialId: string
  imageId: string
  layerId: string
  imageKind?: SceneMaterialImageKind
}
export interface ScenePaintSample {
  point: Texel
  region: string
  /** Optional cell bounds from 3D picking; wide brushes/fills must not cross into adjacent frames. */
  bounds?: ScenePixelRegion
  /** Espelho de pintura: o ponto refletido no plano do meio, na MESMA peça e na mesma folha. */
  mirror?: Omit<ScenePaintSample, 'mirror'>
}
export interface ScenePaintSegment {
  from: Texel
  to: Texel
  color: ScenePaintColor
  brush: BrushSize
  region?: ScenePixelRegion
}

export function resolveScenePaintTarget(document: MoldaSceneDocument, target: ScenePaintTarget) {
  const imageKind = v.choice(
    target.imageKind ?? 'color',
    SCENE_MATERIAL_IMAGE_KINDS,
    'paint.imageKind',
  )
  const usage = sceneAppearanceUsage(document)
  const material = usage.index.materials.get(target.materialId)
  const image = usage.index.images.get(target.imageId)
  const layer = image?.layers.find((entry) => entry.id === target.layerId)
  v.requireScene(
    usage.byNode.get(target.nodeId)?.has(target.materialId) &&
      material?.[SCENE_MATERIAL_IMAGE_FIELDS[imageKind]] === target.imageId &&
      image &&
      layer,
    'paint',
    'A camada ou seu vínculo mudou. Escolha onde pintar novamente.',
  )
  requireEditableAppearance(usage, usage.images.get(image.id) ?? [])
  v.requireScene(
    layer.visible && layer.opacity > 0,
    'layer',
    'Mostre esta camada e aumente sua opacidade antes de pintar.',
  )
  return { image, layer, material, imageKind }
}

export function validateScenePaintColor(
  image: SceneImage,
  color: ScenePaintColor,
  brush: BrushSize,
  paletteSize: number,
) {
  v.requireScene(
    brush === 1 || brush === 2 || brush === 3,
    'brush',
    'Escolha um tamanho de pincel válido.',
  )
  if (image.encoding === 'indexed') v.number(color, 'color', 0, paletteSize - 1, true)
  else for (const value of v.tuple(color, 4, 'color')) v.number(value, 'color', 0, 255, true)
}

/** Shared pure pencil kernel; only the changed layer gets an owned byte copy, and only once. */
export function paintSceneImageSegment(
  image: SceneImage,
  layerId: string,
  segment: ScenePaintSegment,
  paletteSize: number,
): SceneImage {
  const layer = image.layers.find((entry) => entry.id === layerId)
  v.requireScene(layer, 'layer', 'Essa camada não existe mais.')
  validateScenePaintColor(image, segment.color, segment.brush, paletteSize)
  if (segment.region) readImageRegion(segment.region, image)
  for (const point of [segment.from, segment.to]) {
    v.tuple(point, 2, 'point')
    v.number(point[0], 'point.x', 0, image.width - 1, true)
    v.number(point[1], 'point.y', 0, image.height - 1, true)
  }
  const channels = image.encoding === 'indexed' ? 1 : 4
  const color = typeof segment.color === 'number' ? [segment.color] : segment.color
  let pixels: Uint8Array | null = null
  for (const [x, y] of lineTexels(...segment.from, ...segment.to))
    for (const [px, py] of stampTexels(x, y, segment.brush)) {
      if (
        px < 0 ||
        py < 0 ||
        px >= image.width ||
        py >= image.height ||
        !imageRegionContains(segment.region, px, py)
      )
        continue
      const offset = (py * image.width + px) * channels
      if (color.every((value, i) => value === (pixels ?? layer.pixels)[offset + i])) continue
      pixels ??= layer.pixels.slice()
      pixels.set(color, offset)
    }
  return pixels
    ? {
        ...image,
        layers: image.layers.map((entry) => (entry === layer ? { ...entry, pixels } : entry)),
      }
    : image
}

export function paintSceneImage(
  document: MoldaSceneDocument,
  target: ScenePaintTarget,
  segment: ScenePaintSegment,
) {
  const { image } = resolveScenePaintTarget(document, target)
  const result = paintSceneImageSegment(
    image,
    target.layerId,
    segment,
    PALETTE_SIZE + (document.extraColors?.length ?? 0),
  )
  return result === image
    ? document
    : finishSceneCommand({
        ...document,
        images: document.images.map((entry) => (entry === image ? result : entry)),
      })
}
