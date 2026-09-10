import { SCENE_LIMITS } from '../scene/limits'
import { GltfInputError, gltfInteger, requireGltf } from './gltfInput'
import { withGltfRasterErrors } from './gltfRasterError'
import type { GltfImageResource } from './gltfResources'
import { decodeRasterBatch, type RasterBatch, type RasterSource } from './rasterBatch'

export type GltfRasters = RasterBatch<number>

/** Format-specific selection/MIME boundary around the shared, fully preflighted pixel decoder. */
export function decodeGltfRasters(
  resources: readonly GltfImageResource[],
  selected: readonly number[],
): GltfRasters {
  if (selected.length > SCENE_LIMITS.images)
    throw new GltfInputError('budget', 'images', 'Há imagens selecionadas demais para o Molda.')
  function* sources(): Generator<RasterSource<number>> {
    const seen = new Set<number>()
    for (const value of selected) {
      const index = gltfInteger(value, 'images.selection', 0, resources.length - 1)
      if (seen.has(index)) continue
      const source = resources[index]
      requireGltf(source !== undefined, `images[${index}]`, 'A imagem selecionada está ausente.')
      seen.add(index)
      yield {
        key: index,
        path: `images[${index}]`,
        bytes: source.bytes,
        mimeTypes: [source.mimeType, source.uriMimeType],
      }
    }
  }
  return withGltfRasterErrors(() => decodeRasterBatch(sources()))
}
