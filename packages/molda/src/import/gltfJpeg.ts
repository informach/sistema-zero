import { withGltfRasterErrors } from './gltfRasterError'
import { decodeRasterJpeg, decodeRasterJpegPlan } from './rasterJpeg'
import type { RasterJpegPlan } from './rasterJpegPlan'

export type { RasterJpegRaster as GltfJpegRaster } from './rasterJpeg'

export function decodeGltfJpeg(bytes: Uint8Array, path = 'image') {
  return withGltfRasterErrors(() => decodeRasterJpeg(bytes, path))
}
export function decodeGltfJpegPlan(bytes: Uint8Array, plan: RasterJpegPlan, path: string) {
  return withGltfRasterErrors(() => decodeRasterJpegPlan(bytes, plan, path))
}
