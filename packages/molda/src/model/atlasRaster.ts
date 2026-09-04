/**
 * O atlas em PIXELS (RGBA8, sRGB): os swatches com as cores da paleta e cada
 * face pintada com a pele resolvida (índice 0 = cor base da peça). A folga de
 * 1 texel em volta de cada região é preenchida por DILATAÇÃO da borda, para
 * um filtro linear no runtime não puxar a cor do vizinho.
 */
import { hexToRgb } from '../core/color'
import type { FaceId, MoldaModelAsset, MoldaPart } from '../core/model'
import { resolvePaletteColors } from '../core/sanitize'
import { ATLAS_PADDING, type AtlasLayout, type AtlasRegion, faceKey } from './atlas'

export interface DirtyRows {
  /** Retângulo inclusivo do atlas tocado, já incluindo a dilatação. */
  x0: number
  x1: number
  y0: number
  y1: number
}

type Rgb = [number, number, number]

function writeRegion(
  pixels: Uint8Array,
  size: number,
  region: AtlasRegion,
  colorAt: (x: number, y: number) => Rgb,
): DirtyRows {
  const y0 = Math.max(0, region.y - ATLAS_PADDING)
  const y1 = Math.min(size - 1, region.y + region.height - 1 + ATLAS_PADDING)
  const x0 = Math.max(0, region.x - ATLAS_PADDING)
  const x1 = Math.min(size - 1, region.x + region.width - 1 + ATLAS_PADDING)
  for (let y = y0; y <= y1; y += 1) {
    const sy = Math.min(Math.max(y - region.y, 0), region.height - 1)
    for (let x = x0; x <= x1; x += 1) {
      const sx = Math.min(Math.max(x - region.x, 0), region.width - 1)
      const [r, g, b] = colorAt(sx, sy)
      const offset = (y * size + x) * 4
      pixels[offset] = r
      pixels[offset + 1] = g
      pixels[offset + 2] = b
      pixels[offset + 3] = 255
    }
  }
  return { x0, x1, y0, y1 }
}

export function rasterSwatch(
  pixels: Uint8Array,
  layout: AtlasLayout,
  index: number,
  hex: string,
): DirtyRows | null {
  const region = layout.swatches[index]
  if (!region) return null
  const rgb = hexToRgb(hex || '#000000')
  return writeRegion(pixels, layout.size, region, () => rgb)
}

/** Uma face pintada de uma peça FONTE. `null` se a face não tem região. */
export function rasterFaceRegion(
  pixels: Uint8Array,
  layout: AtlasLayout,
  colors: readonly string[],
  part: MoldaPart,
  face: FaceId,
): DirtyRows | null {
  const skin = part.faces[face]
  const region = layout.faces.get(faceKey(part.id, face))
  if (!skin || !region) return null
  const base = hexToRgb(colors[part.color] ?? '#888888')
  const palette = colors.map((hex) => (hex ? hexToRgb(hex) : base))
  return writeRegion(pixels, layout.size, region, (x, y) => {
    const index = skin.data[y * skin.width + x] ?? 0
    if (index === 0) return base
    return palette[index] ?? base
  })
}

/** O atlas inteiro. */
export function rasterAtlas(model: MoldaModelAsset, layout: AtlasLayout): Uint8Array {
  const pixels = new Uint8Array(layout.size * layout.size * 4)
  const colors = resolvePaletteColors(model)
  colors.forEach((hex, index) => {
    rasterSwatch(pixels, layout, index, hex || '#000000')
  })
  for (const part of model.parts) {
    if (part.mirrorOf) continue
    for (const face of Object.keys(part.faces) as FaceId[]) {
      rasterFaceRegion(pixels, layout, colors, part, face)
    }
  }
  return pixels
}
