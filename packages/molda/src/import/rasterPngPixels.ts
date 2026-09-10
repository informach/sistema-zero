import { requireRaster } from './rasterInput'
import type { RasterPngPass } from './rasterPngPasses'
import type { RasterPngPlan } from './rasterPngPlan'

function unfilter(
  raw: Uint8Array,
  start: number,
  row: number,
  pass: RasterPngPass,
  pixelBytes: number,
  path: string,
) {
  const filter = raw[start - 1]!
  requireRaster(filter <= 4, path, 'A linha PNG usa um filtro inválido.')
  if (filter === 0) return
  for (let i = 0; i < pass.rowBytes; i++) {
    const left = i >= pixelBytes ? raw[start + i - pixelBytes]! : 0
    const above = row > 0 ? raw[start + i - pass.rowBytes - 1]! : 0
    let predictor: number
    if (filter === 1) predictor = left
    else if (filter === 2) predictor = above
    else if (filter === 3) predictor = Math.floor((left + above) / 2)
    else {
      const corner =
        row > 0 && i >= pixelBytes ? raw[start + i - pass.rowBytes - 1 - pixelBytes]! : 0
      const estimate = left + above - corner
      const dl = Math.abs(estimate - left),
        da = Math.abs(estimate - above),
        dc = Math.abs(estimate - corner)
      predictor = dl <= da && dl <= dc ? left : da <= dc ? above : corner
    }
    raw[start + i] = (raw[start + i]! + predictor) & 255
  }
}

/** Reconstruct in owned filtered bytes, then scatter to the final top-down RGBA image. */
export function readRasterPngPixels(plan: RasterPngPlan, raw: Uint8Array, path: string) {
  const { width, height, depth, colorType, channels, palette, alpha, transparent } = plan
  const rgba =
    depth === 16 ? new Uint16Array(width * height * 4) : new Uint8Array(width * height * 4)
  const maximum = depth === 16 ? 65535 : 255,
    sampleMask = 2 ** depth - 1
  const grayScale = depth < 8 ? 255 / sampleMask : 1
  const pixelBytes = Math.ceil((channels * depth) / 8)
  for (const pass of plan.passes) {
    for (let row = 0; row < pass.height; row++) {
      const start = pass.offset + row * (pass.rowBytes + 1) + 1
      unfilter(raw, start, row, pass, pixelBytes, path)
      const sample = (index: number) => {
        if (depth === 16) return raw[start + index * 2]! * 256 + raw[start + index * 2 + 1]!
        if (depth === 8) return raw[start + index]!
        const bit = index * depth
        return (raw[start + (bit >> 3)]! >> (8 - depth - (bit % 8))) & sampleMask
      }
      for (let x = 0; x < pass.width; x++) {
        const at = x * channels,
          first = sample(at)
        let r: number,
          g: number,
          b: number,
          a = maximum
        if (colorType === 3) {
          requireRaster(
            palette !== null && first * 3 + 2 < palette.length,
            path,
            'Um pixel PNG aponta para fora da paleta.',
          )
          r = palette[first * 3]!
          g = palette[first * 3 + 1]!
          b = palette[first * 3 + 2]!
          a = alpha?.[first] ?? 255
        } else if (colorType === 0 || colorType === 4) {
          r = g = b = first * grayScale
          if (colorType === 4) a = sample(at + 1)
          else if (transparent?.[0] === first) a = 0
        } else {
          r = first
          g = sample(at + 1)
          b = sample(at + 2)
          if (colorType === 6) a = sample(at + 3)
          else if (
            transparent &&
            r === transparent[0] &&
            g === transparent[1] &&
            b === transparent[2]
          )
            a = 0
        }
        const target = ((pass.y + row * pass.stepY) * width + pass.x + x * pass.stepX) * 4
        rgba[target] = r
        rgba[target + 1] = g
        rgba[target + 2] = b
        rgba[target + 3] = a
      }
    }
  }
  return rgba
}
