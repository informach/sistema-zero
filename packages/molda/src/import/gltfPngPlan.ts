import { withGltfRasterErrors } from './gltfRasterError'
import { planRasterPng } from './rasterPngPlan'

export type { RasterPngPlan as GltfPngPlan } from './rasterPngPlan'

export function planGltfPng(bytes: Uint8Array, path = 'image') {
  return withGltfRasterErrors(() => planRasterPng(bytes, path))
}
