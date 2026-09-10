import type { Texel } from '../paint/skinPaint'
import type { SceneImage } from './document'
import type { ScenePaintColor } from './imagePaint'
import { readImagePoint } from './imageRegion'
import { requireScene } from './validation'

/** Samples authorial layer bytes, not a flattened/quantized approximation of the material. */
export function sceneLayerColor(image: SceneImage, layerId: string, point: Texel): ScenePaintColor {
  const [x, y] = readImagePoint(point, image)
  const layer = image.layers.find((entry) => entry.id === layerId)
  requireScene(layer, 'layer', 'Essa camada não existe mais.')
  const offset = y * image.width + x
  if (image.encoding === 'indexed') return layer.pixels[offset]!
  const start = offset * 4
  return [
    layer.pixels[start]!,
    layer.pixels[start + 1]!,
    layer.pixels[start + 2]!,
    layer.pixels[start + 3]!,
  ]
}
