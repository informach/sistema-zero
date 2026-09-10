import { hexToRgb } from '../core/color'
import type { MoldaPaletteFields } from '../core/model'
import { resolvePaletteColors } from '../core/sanitize'
import type { SceneImage, SceneMaterial } from './document'

/** Straight alpha, sRGB-encoded authoring colors, normalized to 0..1. */
export type SceneRgba = [number, number, number, number]
export interface ScenePixelRegion {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function scenePalette(fields: MoldaPaletteFields): SceneRgba[] {
  return resolvePaletteColors(fields).map((hex, index): SceneRgba => {
    if (index === 0 || !hex) return [0, 0, 0, 0]
    const [r, g, b] = hexToRgb(hex)
    return [r / 255, g / 255, b / 255, 1]
  })
}

export function sceneBaseColor(material: SceneMaterial, palette: readonly SceneRgba[]): SceneRgba {
  if (material.baseColor.kind === 'rgba') return [...material.baseColor.value]
  const color = palette[material.baseColor.index]
  if (!color) throw new Error('Cor de material ausente.')
  return [...color]
}

/**
 * One derived bitmap for the 2D/3D/export consumers. Source-over in the authoring
 * sRGB color space, full precision between layers, quantized only at final output.
 * Background is UNDER paint (legacy index zero), never multiplied into its colors.
 */
export function compositeSceneImage(
  image: SceneImage,
  palette: readonly SceneRgba[],
  background: SceneRgba = [0, 0, 0, 0],
  preserveTransparentRgb = false,
): Uint8Array {
  return compositeSceneImageRegion(
    image,
    palette,
    background,
    { x0: 0, y0: 0, x1: image.width - 1, y1: image.height - 1 },
    preserveTransparentRgb,
  )
}

/** Compact patch, canonical row order. Same source-over arithmetic as a full composition. */
export function compositeSceneImageRegion(
  image: SceneImage,
  palette: readonly SceneRgba[],
  background: SceneRgba,
  region: ScenePixelRegion,
  preserveTransparentRgb = false,
): Uint8Array {
  const { x0, y0, x1, y1 } = region
  if (
    ![x0, y0, x1, y1].every(Number.isSafeInteger) ||
    x0 < 0 ||
    y0 < 0 ||
    x1 < x0 ||
    y1 < y0 ||
    x1 >= image.width ||
    y1 >= image.height
  )
    throw new RangeError('Região de pintura fora da imagem.')
  const width = x1 - x0 + 1
  const out = new Uint8Array(width * (y1 - y0 + 1) * 4)
  const layers = image.layers.filter((layer) => layer.visible && layer.opacity > 0)
  let pixel = y0 * image.width + x0
  let rowEnd = pixel + width
  const rowGap = image.width - width
  for (let offset = 0; offset < out.length; offset += 4, pixel++) {
    if (pixel === rowEnd) {
      pixel += rowGap
      rowEnd = pixel + width
    }
    let alpha = background[3]
    let r = background[0] * alpha
    let g = background[1] * alpha
    let b = background[2] * alpha
    let transparentColor = background
    for (const layer of layers) {
      let color: SceneRgba
      if (image.encoding === 'indexed') {
        const index = layer.pixels[pixel]
        const entry = index === undefined ? undefined : palette[index]
        if (!entry) throw new Error('Pixel com índice de cor ausente.')
        color = entry
      } else {
        const offset = pixel * 4
        const red = layer.pixels[offset]
        const green = layer.pixels[offset + 1]
        const blue = layer.pixels[offset + 2]
        const a = layer.pixels[offset + 3]
        if (red === undefined || green === undefined || blue === undefined || a === undefined)
          throw new Error('Pixel RGBA incompleto.')
        color = [red / 255, green / 255, blue / 255, a / 255]
      }
      const a = color[3] * layer.opacity
      // With cutoff zero, RGB under zero alpha becomes visible. Source-over does
      // not define that RGB: use the top participating RGBA layer, or the base.
      // Indexed zero remains an empty palette entry, not a hidden black coat.
      if (preserveTransparentRgb && image.encoding === 'rgba') transparentColor = color
      r = color[0] * a + r * (1 - a)
      g = color[1] * a + g * (1 - a)
      b = color[2] * a + b * (1 - a)
      alpha = a + alpha * (1 - a)
    }
    if (alpha > 0) {
      out[offset] = Math.round((r / alpha) * 255)
      out[offset + 1] = Math.round((g / alpha) * 255)
      out[offset + 2] = Math.round((b / alpha) * 255)
      out[offset + 3] = Math.round(alpha * 255)
    } else if (preserveTransparentRgb) {
      out[offset] = Math.round(transparentColor[0] * 255)
      out[offset + 1] = Math.round(transparentColor[1] * 255)
      out[offset + 2] = Math.round(transparentColor[2] * 255)
    }
  }
  return out
}
