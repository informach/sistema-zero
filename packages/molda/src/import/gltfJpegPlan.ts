import { withGltfRasterErrors } from './gltfRasterError'
import { planRasterJpeg } from './rasterJpegPlan'

export type { RasterJpegPlan as GltfJpegPlan } from './rasterJpegPlan'

export function planGltfJpeg(bytes: Uint8Array, path = 'image') {
  return withGltfRasterErrors(() => planRasterJpeg(bytes, path))
}
