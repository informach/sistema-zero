import {
  compositeSceneImage,
  compositeSceneImageRegion,
  type ScenePixelRegion,
  type SceneRgba,
} from './composite'
import type { SceneImage } from './document'

export interface SceneRasterSource {
  image: SceneImage
  paletteKey: string
  base: SceneRgba
  preserveTransparentRgb?: boolean
}
export interface SceneRasterPatch {
  width: number
  height: number
  pixels: Uint8Array
  /** Absent means complete bitmap. Present pixels are tightly packed within these inclusive bounds. */
  region?: ScenePixelRegion
}

/** No side registry, mutation hints or history chain: comparison also works for undo/import/worker results. */
export function changedSceneImageRegion(
  before: SceneImage,
  after: SceneImage,
): ScenePixelRegion | null | 'all' {
  if (before === after) return null
  if (
    before.id !== after.id ||
    before.width !== after.width ||
    before.height !== after.height ||
    before.encoding !== after.encoding ||
    before.layers.length !== after.layers.length
  )
    return 'all'
  const channels = after.encoding === 'indexed' ? 1 : 4
  let x0 = after.width,
    y0 = after.height,
    x1 = -1,
    y1 = -1
  for (let layerIndex = 0; layerIndex < after.layers.length; layerIndex++) {
    const layer = after.layers[layerIndex]!,
      previous = before.layers[layerIndex]!
    if (
      layer.id !== previous.id ||
      layer.opacity !== previous.opacity ||
      layer.visible !== previous.visible
    )
      return 'all'
    if (!layer.visible || layer.opacity === 0 || layer.pixels === previous.pixels) continue
    if (layer.pixels.length !== previous.pixels.length) return 'all'
    for (let i = 0; i < layer.pixels.length; i++) {
      if (layer.pixels[i] === previous.pixels[i]) continue
      const pixel = Math.floor(i / channels),
        x = pixel % after.width,
        y = Math.floor(pixel / after.width)
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 }
}

export function prepareSceneImageRaster(
  source: SceneRasterSource,
  palette: readonly SceneRgba[],
  previous?: SceneRasterSource,
): SceneRasterPatch | null {
  const region =
    previous &&
    previous.paletteKey === source.paletteKey &&
    Boolean(previous.preserveTransparentRgb) === Boolean(source.preserveTransparentRgb) &&
    source.base.every((c, i) => c === previous.base[i])
      ? changedSceneImageRegion(previous.image, source.image)
      : 'all'
  if (region === null) return null
  const { image, base } = source
  return {
    width: image.width,
    height: image.height,
    pixels:
      region === 'all'
        ? compositeSceneImage(image, palette, base, source.preserveTransparentRgb)
        : compositeSceneImageRegion(image, palette, base, region, source.preserveTransparentRgb),
    ...(region === 'all' ? {} : { region }),
  }
}
