import { BbmodelInputError } from './bbmodelInput'
import type { BbmodelResourcesRead } from './bbmodelResources'
import { decodeRasterBatch, type RasterSource } from './rasterBatch'
import { RasterInputError } from './rasterInput'
import type { RasterPixels } from './rasterPng'

export interface BbmodelRasters {
  /** Original texture index → decoded raster. Different textures may share pixels read-only. */
  textures: ReadonlyMap<number, number>
  rasters: RasterPixels[]
  pixelBytes: number
}

/**
 * Consume the private, unchanged ready resource result after texture selection.
 * No metadata-size inference, color conversion, UV/frame/layer interpretation or IO.
 */
export function decodeBbmodelRasters(
  bundle: Extract<BbmodelResourcesRead, { status: 'ready' }>,
): BbmodelRasters {
  function* sources(): Generator<RasterSource<number>> {
    const seen = new Set<number>()
    for (const binding of bundle.textures) {
      if (seen.has(binding.resource)) continue
      const resource = bundle.resources[binding.resource]!
      seen.add(binding.resource)
      yield {
        key: binding.resource,
        path:
          resource.path === null
            ? `textures[${binding.texture}].source`
            : `files[${JSON.stringify(resource.path)}]`,
        bytes: resource.bytes,
        mimeTypes: [resource.mimeType],
      }
    }
  }
  try {
    // The shared batch plans every unique header and the aggregate pixel budget before decode.
    const decoded = decodeRasterBatch(sources())
    const textures = new Map<number, number>()
    for (const binding of bundle.textures)
      textures.set(binding.texture, decoded.images.get(binding.resource)!)
    return { textures, rasters: decoded.rasters, pixelBytes: decoded.pixelBytes }
  } catch (error) {
    if (!(error instanceof RasterInputError)) throw error
    throw new BbmodelInputError(error.reason, error.path, error.message, { cause: error })
  }
}
