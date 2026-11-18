import { readGltfEnvelope } from '../import/gltfEnvelope'
import { GLTF_INPUT_LIMITS, gltfRecord, requireGltf } from '../import/gltfInput'
import { readGltfResources } from '../import/gltfResources'
import { inspectReferenceRaster } from '../import/rasterHeader'
import { encodeGlbContainer } from './glbContainer'

/** Three's GLTFExporter includes BIN alignment in image bufferView.byteLength.
 * Keep alignment in BIN, but describe only the image payload. Never trim nonzero bytes,
 * change pixel data, relax raster readers, or alter the caller's JSON/binary storage. */
export function normalizeGlbImagePadding(bytes: Uint8Array): Uint8Array {
  const envelope = readGltfEnvelope(bytes)
  requireGltf(envelope.format === 'glb', 'file', 'A normalização exige um GLB.')
  const resources = readGltfResources(envelope, [], 'model.glb')
  requireGltf(resources.status === 'ready', 'images', 'O GLB precisa ser autocontido.')
  const { json } = envelope
  const images = json.images === undefined ? [] : (json.images as unknown[])
  let changed = false
  for (const [index, value] of images.entries()) {
    const image = gltfRecord(value, `images[${index}]`)
    if (image.bufferView === undefined) continue
    const payload = resources.images[index]!.bytes
    let length = payload.length
    if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => payload[i] === v)) {
      for (let padding = 0; padding <= 3 && padding < payload.length; padding++) {
        if (padding && payload[payload.length - padding] !== 0) break
        try {
          inspectReferenceRaster(payload.subarray(0, payload.length - padding))
          length = payload.length - padding
          break
        } catch {
          /* A strict reader below still rejects invalid images. */
        }
      }
    } else if (
      payload.length >= 12 &&
      new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getUint32(0) ===
        0x52494646
    ) {
      const end =
        new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getUint32(4, true) + 8
      if (
        end <= payload.length &&
        payload.length - end <= 3 &&
        payload.subarray(end).every((v) => v === 0)
      )
        length = end
    }
    if (length === payload.length) continue
    const views = json.bufferViews as unknown[],
      view = gltfRecord(views[image.bufferView as number], `bufferViews[${image.bufferView}]`)
    view.byteLength = length
    changed = true
  }
  if (!changed) return bytes
  requireGltf(
    envelope.bin !== null && resources.buffers.length === 1,
    'buffers',
    'O GLB gerado precisa de um único buffer BIN.',
  )
  return encodeGlbContainer(json, [envelope.bin], GLTF_INPUT_LIMITS.fileBytes)
}
