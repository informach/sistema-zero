import { type PixelShape, shapeTexels } from '../paint/shapeTexels'
import { type BrushSize, stampTexels, type Texel } from '../paint/skinPaint'
import type { ScenePixelRegion } from './composite'
import type { SceneImage } from './document'
import { type ScenePaintColor, validateScenePaintColor } from './imagePaint'
import { imageRegionContains, readImagePoint, readImageRegion } from './imageRegion'
import * as v from './validation'

export interface SceneShapeOperation {
  kind: 'shape'
  layerId: string
  shape: PixelShape
  from: Texel
  to: Texel
  color: ScenePaintColor
  brush: BrushSize
  filled: boolean
  region?: ScenePixelRegion
}
export function readSceneShapeOperation(
  raw: unknown,
  image: SceneImage,
  paletteSize: number,
): SceneShapeOperation {
  const row = v.record(raw, 'shape', [
    'kind',
    'layerId',
    'shape',
    'from',
    'to',
    'color',
    'brush',
    'filled',
    'region',
  ])
  v.requireScene(row.kind === 'shape', 'kind', 'Operação de desenho esperada.')
  const layerId = v.id(row.layerId, 'layerId')
  const layer = image.layers.find((entry) => entry.id === layerId)
  v.requireScene(
    layer?.visible && layer.opacity > 0,
    'layer',
    'Escolha uma camada visível para desenhar.',
  )
  const shape = v.choice(row.shape, ['line', 'rectangle', 'ellipse'], 'shape')
  const from = readImagePoint(row.from, image),
    to = readImagePoint(row.to, image)
  validateScenePaintColor(image, row.color as ScenePaintColor, row.brush as BrushSize, paletteSize)
  const color =
    typeof row.color === 'number' ? row.color : ([...(row.color as number[])] as ScenePaintColor)
  return {
    kind: 'shape',
    layerId,
    shape,
    from,
    to,
    color,
    brush: row.brush as BrushSize,
    filled: v.boolean(row.filled, 'filled'),
    ...(row.region === undefined ? {} : { region: readImageRegion(row.region, image) }),
  }
}
export function paintSceneImageShape(
  image: SceneImage,
  operation: SceneShapeOperation,
  paletteSize: number,
): SceneImage {
  const input = readSceneShapeOperation(operation, image, paletteSize)
  const layer = image.layers.find((entry) => entry.id === input.layerId)!
  const channels = image.encoding === 'rgba' ? 4 : 1
  const color = typeof input.color === 'number' ? [input.color] : input.color
  let pixels: Uint8Array | null = null
  for (const [x, y] of shapeTexels(input.shape, input.from, input.to, input.filled))
    for (const [px, py] of stampTexels(
      x,
      y,
      input.filled && input.shape !== 'line' ? 1 : input.brush,
    )) {
      if (
        px < 0 ||
        py < 0 ||
        px >= image.width ||
        py >= image.height ||
        !imageRegionContains(input.region, px, py)
      )
        continue
      const offset = (py * image.width + px) * channels
      if (color.every((c, i) => c === (pixels ?? layer.pixels)[offset + i])) continue
      pixels ??= layer.pixels.slice()
      pixels.set(color, offset)
    }
  return pixels
    ? {
        ...image,
        layers: image.layers.map((entry) => (entry === layer ? { ...layer, pixels } : entry)),
      }
    : image
}
