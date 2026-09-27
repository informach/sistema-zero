import type { Texel } from '../paint/skinPaint'
import type { ScenePixelRegion } from './composite'
import type { SceneImage } from './document'
import { type SceneRgbaRaster, validateSceneRgbaRaster } from './imageImport'
import { intersectImageRegions, readImagePoint, readImageRegion } from './imageRegion'
import * as v from './validation'

export interface SceneStampSettings {
  scale: number
  turns: 0 | 1 | 2 | 3
  flipX: boolean
  flipY: boolean
}
export interface SceneStampOperation extends SceneStampSettings {
  kind: 'stamp'
  layerId: string
  point: Texel
  raster: SceneRgbaRaster
  region?: ScenePixelRegion
}
export function readSceneStampOperation(raw: unknown, image: SceneImage): SceneStampOperation {
  const row = v.record(raw, 'stamp', [
    'kind',
    'layerId',
    'point',
    'raster',
    'scale',
    'turns',
    'flipX',
    'flipY',
    'region',
  ])
  v.requireScene(
    row.kind === 'stamp' && image.encoding === 'rgba',
    'stamp',
    'Converta a imagem para cores livres antes de usar um carimbo.',
  )
  const layerId = v.id(row.layerId, 'layerId')
  const layer = image.layers.find((layer) => layer.id === layerId)
  v.requireScene(
    layer?.visible && layer.opacity > 0,
    'layer',
    'Escolha uma camada visível para carimbar.',
  )
  const raster = validateSceneRgbaRaster(row.raster)
  const point = readImagePoint(row.point, image)
  const scale = v.number(row.scale, 'scale', 1, 4, true)
  const turns = v.number(row.turns, 'turns', 0, 3, true) as SceneStampSettings['turns']
  const flipX = v.boolean(row.flipX, 'flipX'),
    flipY = v.boolean(row.flipY, 'flipY')
  const region = row.region === undefined ? undefined : readImageRegion(row.region, image)
  return {
    kind: 'stamp',
    layerId,
    point,
    raster: { ...raster, pixels: raster.pixels.slice() },
    scale,
    turns,
    flipX,
    flipY,
    ...(region ? { region } : {}),
  }
}
export function sceneStampSize(
  raster: Pick<SceneRgbaRaster, 'width' | 'height'>,
  settings: Pick<SceneStampSettings, 'scale' | 'turns'>,
) {
  return {
    width: (settings.turns % 2 ? raster.height : raster.width) * settings.scale,
    height: (settings.turns % 2 ? raster.width : raster.height) * settings.scale,
  }
}
export function sceneStampBounds(
  point: Texel,
  size: { width: number; height: number },
): ScenePixelRegion {
  const x0 = point[0] - Math.floor(size.width / 2),
    y0 = point[1] - Math.floor(size.height / 2)
  return { x0, y0, x1: x0 + size.width - 1, y1: y0 + size.height - 1 }
}

/** One source-over application, clockwise quarter-turns then screen-axis flips. Integer pixel replication only. */
export function paintSceneImageStamp(
  image: SceneImage,
  operation: SceneStampOperation,
): SceneImage {
  const input = readSceneStampOperation(operation, image)
  const { raster, scale, turns, flipX, flipY } = input
  const bounds = sceneStampBounds(input.point, sceneStampSize(raster, input))
  const region = input.region ?? { x0: 0, y0: 0, x1: image.width - 1, y1: image.height - 1 }
  const clipped = intersectImageRegions(bounds, region)
  if (!clipped) return image
  const { x0, x1, y0, y1 } = clipped
  const rotatedWidth = turns % 2 ? raster.height : raster.width
  const rotatedHeight = turns % 2 ? raster.width : raster.height
  const layer = image.layers.find((entry) => entry.id === input.layerId)!
  let pixels: Uint8Array | null = null
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = Math.floor((x - bounds.x0) / scale),
        dy = Math.floor((y - bounds.y0) / scale)
      const rx = flipX ? rotatedWidth - 1 - dx : dx,
        ry = flipY ? rotatedHeight - 1 - dy : dy
      const sx =
        turns === 0
          ? rx
          : turns === 1
            ? raster.width - 1 - ry
            : turns === 2
              ? raster.width - 1 - rx
              : ry
      const sy =
        turns === 0
          ? ry
          : turns === 1
            ? rx
            : turns === 2
              ? raster.height - 1 - ry
              : raster.height - 1 - rx
      const source = (sy * raster.width + sx) * 4,
        target = (y * image.width + x) * 4
      const sa = raster.pixels[source + 3]!
      if (sa === 0) continue
      const da = layer.pixels[target + 3]!
      const alpha = sa * 255 + da * (255 - sa)
      for (let c = 0; c < 4; c++) {
        const value =
          c === 3
            ? Math.round(alpha / 255)
            : Math.round(
                (raster.pixels[source + c]! * sa * 255 +
                  layer.pixels[target + c]! * da * (255 - sa)) /
                  alpha,
              )
        if (value === layer.pixels[target + c]) continue
        pixels ??= layer.pixels.slice()
        pixels[target + c] = value
      }
    }
  return pixels
    ? {
        ...image,
        layers: image.layers.map((entry) => (entry === layer ? { ...layer, pixels } : entry)),
      }
    : image
}
