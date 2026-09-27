import type { GltfAccessor } from './gltfAccessors'
import type { GltfBufferView } from './gltfBufferViews'
import { readGltfImages } from './gltfImages'
import { gltfRecord } from './gltfInput'
import { readGltfMaterials } from './gltfMaterials'
import { readGltfSamplers, readGltfTextures } from './gltfTextures'

/** Structural appearance metadata only. No images are resolved, decoded or rendered here. */
export function readGltfAppearance(
  input: unknown,
  views: readonly GltfBufferView[],
  accessors: readonly GltfAccessor[],
) {
  const row = gltfRecord(input, 'glTF')
  const images = readGltfImages(row.images, views, accessors)
  const samplers = readGltfSamplers(row.samplers)
  const textures = readGltfTextures(row.textures, images.length, samplers.length)
  const materials = readGltfMaterials(row.materials, textures.length)
  return { images, samplers, textures, materials }
}
