import type { Texel } from '../paint/skinPaint'
import type { ScenePixelRegion, SceneRgba } from './composite'
import type { SceneImage } from './document'
import {
  paintSceneImageGradient,
  readSceneGradientOperation,
  type SceneGradientOperation,
} from './imageGradient'
import { type ScenePaintColor, validateScenePaintColor } from './imagePaint'
import { imageRegionContains, readImageRegion } from './imageRegion'
import {
  paintSceneImageShape,
  readSceneShapeOperation,
  type SceneShapeOperation,
} from './imageShapes'
import {
  paintSceneImageStamp,
  readSceneStampOperation,
  type SceneStampOperation,
} from './imageStamp'
import { SCENE_LIMITS } from './limits'
import * as v from './validation'

export type SceneImageOperation =
  | { kind: 'rgba' }
  | {
      kind: 'fill'
      layerId: string
      point: Texel
      color: ScenePaintColor
      tolerance: number
      region?: ScenePixelRegion
    }
  | SceneShapeOperation
  | SceneGradientOperation
  | SceneStampOperation

export function readSceneImageOperation(
  raw: unknown,
  image: SceneImage,
  paletteSize: number,
): SceneImageOperation {
  const row = v.record(raw, 'operation')
  const kind = v.choice(row.kind, ['rgba', 'fill', 'shape', 'gradient', 'stamp'], 'operation.kind')
  if (kind === 'stamp') return readSceneStampOperation(raw, image)
  if (kind === 'gradient') return readSceneGradientOperation(raw, image)
  if (kind === 'shape') return readSceneShapeOperation(raw, image, paletteSize)
  v.record(
    row,
    'operation',
    kind === 'rgba' ? ['kind'] : ['kind', 'layerId', 'point', 'color', 'tolerance', 'region'],
  )
  if (kind === 'rgba') return { kind }
  const layerId = v.id(row.layerId, 'layerId')
  const layer = image.layers.find((entry) => entry.id === layerId)
  v.requireScene(
    layer?.visible && layer.opacity > 0,
    'layer',
    'Escolha uma camada visível para preencher.',
  )
  const point = v.tuple(row.point, 2, 'point') as Texel
  v.number(point[0], 'point.x', 0, image.width - 1, true)
  v.number(point[1], 'point.y', 0, image.height - 1, true)
  validateScenePaintColor(image, row.color as ScenePaintColor, 1, paletteSize)
  const color =
    typeof row.color === 'number' ? row.color : ([...(row.color as number[])] as ScenePaintColor)
  const tolerance = v.number(
    row.tolerance,
    'tolerance',
    0,
    image.encoding === 'indexed' ? 0 : 255,
    true,
  )
  return {
    kind,
    layerId,
    point,
    color,
    tolerance,
    ...(row.region === undefined ? {} : { region: readImageRegion(row.region, image) }),
  }
}

/** Preserve each layer, palette color and opacity. Never quantize back to indexed colors. */
export function convertSceneImageRgba(
  image: SceneImage,
  palette: readonly SceneRgba[],
): SceneImage {
  if (image.encoding === 'rgba') return image
  v.requireScene(
    image.width * image.height * image.layers.length * 4 <= SCENE_LIMITS.pixelBytes,
    'image',
    'Essa conversão ultrapassa o espaço de pintura.',
  )
  const table = palette.map((color) => color.map((channel) => Math.round(channel * 255)))
  return {
    ...image,
    encoding: 'rgba',
    layers: image.layers.map((layer) => {
      const pixels = new Uint8Array(image.width * image.height * 4)
      for (let i = 0; i < layer.pixels.length; i++) {
        const color = table[layer.pixels[i]!]
        v.requireScene(color, 'pixel', 'Índice de cor ausente.')
        pixels.set(color, i * 4)
      }
      return { ...layer, pixels }
    }),
  }
}

/** Four-connected fill compares source bytes, never partially filled pixels. Bounded iterative queue. */
export function fillSceneImage(
  image: SceneImage,
  operation: Extract<SceneImageOperation, { kind: 'fill' }>,
  paletteSize: number,
): SceneImage {
  readSceneImageOperation(operation, image, paletteSize)
  const layer = image.layers.find((entry) => entry.id === operation.layerId)!
  const channels = image.encoding === 'indexed' ? 1 : 4
  const color = typeof operation.color === 'number' ? [operation.color] : operation.color
  const start = operation.point[1] * image.width + operation.point[0]
  const target = layer.pixels.subarray(start * channels, (start + 1) * channels)
  if (operation.tolerance === 0 && color.every((c, i) => c === target[i])) return image
  const size = image.width * image.height
  const visited = new Uint8Array(size)
  const queue = new Uint32Array(size)
  let head = 0,
    tail = 0
  const enqueue = (pixel: number) => {
    if (visited[pixel]) return
    visited[pixel] = 1
    if (
      !imageRegionContains(operation.region, pixel % image.width, Math.floor(pixel / image.width))
    )
      return
    for (let c = 0; c < channels; c++)
      if (Math.abs(layer.pixels[pixel * channels + c]! - target[c]!) > operation.tolerance) return
    queue[tail++] = pixel
  }
  enqueue(start)
  let pixels: Uint8Array | null = null
  while (head < tail) {
    const pixel = queue[head++]!
    const offset = pixel * channels
    if (color.some((c, i) => c !== layer.pixels[offset + i])) {
      pixels ??= layer.pixels.slice()
      pixels.set(color, offset)
    }
    const x = pixel % image.width
    if (x > 0) enqueue(pixel - 1)
    if (x + 1 < image.width) enqueue(pixel + 1)
    if (pixel >= image.width) enqueue(pixel - image.width)
    if (pixel + image.width < size) enqueue(pixel + image.width)
  }
  return pixels
    ? {
        ...image,
        layers: image.layers.map((entry) => (entry === layer ? { ...layer, pixels } : entry)),
      }
    : image
}

export function operateSceneImage(
  image: SceneImage,
  operation: SceneImageOperation,
  palette: readonly SceneRgba[],
) {
  switch (operation.kind) {
    case 'rgba':
      return convertSceneImageRgba(image, palette)
    case 'fill':
      return fillSceneImage(image, operation, palette.length)
    case 'shape':
      return paintSceneImageShape(image, operation, palette.length)
    case 'gradient':
      return paintSceneImageGradient(image, operation)
    case 'stamp':
      return paintSceneImageStamp(image, operation)
  }
}
