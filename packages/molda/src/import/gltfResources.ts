import { materializeGltfBuffers, planGltfBuffers } from './gltfBufferPlan'
import type { GltfBufferView } from './gltfBufferViews'
import type { GltfEnvelope } from './gltfEnvelope'
import { readGltfImages } from './gltfImages'
import { requireGltf } from './gltfInput'
import { type GltfLocalFile, GltfResourcePlan } from './gltfResourcePlan'

export interface GltfImageResource {
  name: string | null
  /** These declarations still need comparison with the actual raster content. */
  mimeType: string | null
  uriMimeType: string | null
  /** Read-only by contract: may share the owned storage of another image or buffer. */
  bytes: Uint8Array
}

export type GltfResourcesRead =
  | { status: 'missing'; paths: string[] }
  | {
      status: 'ready'
      buffers: Uint8Array[]
      views: GltfBufferView[]
      images: GltfImageResource[]
      resourceBytes: number
    }

/**
 * Joint byte budget and one owned copy per local path / exact data URI.
 * Not a document/raster validator. Next read accessors and appearance, including
 * image versus numeric view roles; no numeric accessors have been decoded here.
 */
export function readGltfResources(
  envelope: GltfEnvelope,
  files: readonly GltfLocalFile[] = [],
  entryPath = 'model.gltf',
): GltfResourcesRead {
  const resources = new GltfResourcePlan(files, entryPath)
  const bufferPlan = planGltfBuffers(envelope, resources)
  const images = readGltfImages(envelope.json.images, bufferPlan.views, []).map((source, i) => ({
    source,
    resource: source.kind === 'uri' ? resources.uri(source.uri, `images[${i}].uri`, 'image') : null,
  }))
  const result = resources.finish()
  if (result.status === 'missing') return result
  const buffers = materializeGltfBuffers(bufferPlan.buffers, result.owned)
  return {
    status: 'ready',
    buffers,
    views: bufferPlan.views,
    resourceBytes: result.resourceBytes,
    images: images.map(({ source, resource }, i) => {
      let bytes: Uint8Array
      if (source.kind === 'bufferView') {
        const view = bufferPlan.views[source.bufferView]!,
          buffer = buffers[view.buffer]!
        bytes = buffer.subarray(view.byteOffset, view.byteOffset + view.byteLength)
      } else {
        const owned = resource ? result.owned.get(resource.key) : undefined
        requireGltf(
          owned !== undefined,
          `images[${i}]`,
          'A imagem planejada não foi materializada.',
        )
        bytes = owned
      }
      return {
        name: source.name,
        mimeType: source.mimeType,
        uriMimeType: resource?.mimeType ?? null,
        bytes,
      }
    }),
  }
}
