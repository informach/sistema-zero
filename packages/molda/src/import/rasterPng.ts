import { inflateRasterPng } from './rasterPngInflate'
import { readRasterPngPixels } from './rasterPngPixels'
import { planRasterPng, type RasterPngPlan } from './rasterPngPlan'

export type RasterPixels = { width: number; height: number } & (
  | { depth: 8; rgba: Uint8Array }
  | { depth: 16; rgba: Uint16Array }
)

/**
 * Raw raster samples: no ICC/gamma/EXIF transform, APNG playback, row flip or
 * premultiplication. Sixteen-bit samples remain exact until explicit conversion.
 * One bounded PNG only; the scene importer must budget all decoded images first.
 */
export function decodeRasterPng(bytes: Uint8Array, path = 'image'): RasterPixels {
  return decodeRasterPngPlan(planRasterPng(bytes, path), path)
}

/** Consume only the private, unchanged views just checked by planRasterPng. */
export function decodeRasterPngPlan(plan: RasterPngPlan, path: string): RasterPixels {
  const raw = inflateRasterPng(plan.idat, plan.byteLength, path)
  const rgba = readRasterPngPixels(plan, raw, path)
  return rgba instanceof Uint16Array
    ? { width: plan.width, height: plan.height, depth: 16, rgba }
    : { width: plan.width, height: plan.height, depth: 8, rgba }
}
