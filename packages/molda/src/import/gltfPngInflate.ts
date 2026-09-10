import { withGltfRasterErrors } from './gltfRasterError'
import { inflateRasterPng } from './rasterPngInflate'

export function inflateGltfPng(chunks: readonly Uint8Array[], byteLength: number, path: string) {
  return withGltfRasterErrors(() => inflateRasterPng(chunks, byteLength, path))
}
