import type { Texel } from '../paint/skinPaint'
import type { ScenePixelRegion } from './composite'
import type { SceneImage } from './document'
import { type ScenePaintRgba, validateScenePaintColor } from './imagePaint'
import { readImagePoint, readImageRegion } from './imageRegion'
import * as v from './validation'

export interface SceneGradientOperation {
  kind: 'gradient'
  layerId: string
  from: Texel
  to: Texel
  color: ScenePaintRgba
  endColor: ScenePaintRgba
  region?: ScenePixelRegion
}
export function readSceneGradientOperation(
  raw: unknown,
  image: SceneImage,
): SceneGradientOperation {
  const row = v.record(raw, 'gradient', [
    'kind',
    'layerId',
    'from',
    'to',
    'color',
    'endColor',
    'region',
  ])
  v.requireScene(
    row.kind === 'gradient' && image.encoding === 'rgba',
    'gradient',
    'Converta a imagem para cores livres antes de criar um gradiente.',
  )
  const layerId = v.id(row.layerId, 'layerId')
  const layer = image.layers.find((layer) => layer.id === layerId)
  v.requireScene(
    layer?.visible && layer.opacity > 0,
    'layer',
    'Escolha uma camada visível para desenhar.',
  )
  validateScenePaintColor(image, row.color as ScenePaintRgba, 1, 0)
  validateScenePaintColor(image, row.endColor as ScenePaintRgba, 1, 0)
  return {
    kind: 'gradient',
    layerId,
    from: readImagePoint(row.from, image),
    to: readImagePoint(row.to, image),
    color: [...(row.color as ScenePaintRgba)],
    endColor: [...(row.endColor as ScenePaintRgba)],
    ...(row.region === undefined ? {} : { region: readImageRegion(row.region, image) }),
  }
}

/** Linear sRGB gradient with premultiplied alpha, exact endpoint bytes and one final quantization. */
export function paintSceneImageGradient(
  image: SceneImage,
  operation: SceneGradientOperation,
): SceneImage {
  const input = readSceneGradientOperation(operation, image)
  const dx = input.to[0] - input.from[0],
    dy = input.to[1] - input.from[1],
    length = dx * dx + dy * dy
  v.requireScene(length > 0, 'gradient', 'Marque dois pontos diferentes para criar o gradiente.')
  const layer = image.layers.find((layer) => layer.id === input.layerId)!
  const region = input.region ?? { x0: 0, y0: 0, x1: image.width - 1, y1: image.height - 1 }
  const first = input.color,
    last = input.endColor
  let pixels: Uint8Array | null = null
  for (let y = region.y0; y <= region.y1; y++)
    for (let x = region.x0; x <= region.x1; x++) {
      const t = Math.max(
        0,
        Math.min(1, ((x - input.from[0]) * dx + (y - input.from[1]) * dy) / length),
      )
      const alpha = first[3] * (1 - t) + last[3] * t
      const offset = (y * image.width + x) * 4
      for (let c = 0; c < 4; c++) {
        const value =
          t === 0
            ? first[c]!
            : t === 1
              ? last[c]!
              : c === 3
                ? Math.round(alpha)
                : alpha === 0
                  ? 0
                  : Math.round((first[c]! * first[3] * (1 - t) + last[c]! * last[3] * t) / alpha)
        if (value === layer.pixels[offset + c]) continue
        pixels ??= layer.pixels.slice()
        pixels[offset + c] = value
      }
    }
  return pixels
    ? {
        ...image,
        layers: image.layers.map((entry) => (entry === layer ? { ...layer, pixels } : entry)),
      }
    : image
}
