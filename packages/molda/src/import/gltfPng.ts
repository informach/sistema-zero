import { withGltfRasterErrors } from './gltfRasterError'
import { decodeRasterPng, decodeRasterPngPlan } from './rasterPng'
import type { RasterPngPlan } from './rasterPngPlan'

export type { RasterPixels as GltfPngRaster } from './rasterPng'

/** glTF adapter. Raw samples have no ICC/gamma/EXIF, animation, flip or premultiplication. */
export function decodeGltfPng(bytes: Uint8Array, path = 'image') {
  return withGltfRasterErrors(() => decodeRasterPng(bytes, path))
}
export function decodeGltfPngPlan(plan: RasterPngPlan, path: string) {
  return withGltfRasterErrors(() => decodeRasterPngPlan(plan, path))
}
