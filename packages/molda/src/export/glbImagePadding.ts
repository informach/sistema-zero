import { readGltfEnvelope } from '../import/gltfEnvelope'
import { GLTF_INPUT_LIMITS, gltfRecord, requireGltf } from '../import/gltfInput'
import { readGltfResources } from '../import/gltfResources'
import { inspectReferenceRaster } from '../import/rasterHeader'
import { encodeGlbContainer, glbAlignedLength } from './glbContainer'

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

/** Generated GLB only, after its extension profile has been validated by the caller.
 * Async canvas encoders append image views in completion order. Give those views
 * the order of json.images instead. Numeric view indices and every payload byte
 * remain intact; only image references, BIN offsets and alignment are rewritten.
 * Extensions with direct BIN offsets are outside this generated-file contract. */
export function stabilizeGeneratedGlbImages(bytes: Uint8Array): Uint8Array {
  const envelope = readGltfEnvelope(bytes),
    resources = readGltfResources(envelope, [], 'model.glb'),
    json = envelope.json
  requireGltf(
    envelope.format === 'glb' && resources.status === 'ready',
    'file',
    'O GLB gerado precisa ser autocontido.',
  )
  if (resources.status !== 'ready') throw Error('Faltam recursos do GLB gerado.')
  const images = (json.images ?? []) as unknown[],
    views = (json.bufferViews ?? []) as unknown[],
    ordem: number[] = [],
    unicas = new Set<number>()
  for (const [i, value] of images.entries()) {
    const imagem = gltfRecord(value, `images[${i}]`)
    if (imagem.bufferView === undefined) continue
    const indice = imagem.bufferView as number
    if (!unicas.has(indice)) {
      unicas.add(indice)
      ordem.push(indice)
    }
  }
  if (ordem.length < 2) return bytes
  requireGltf(
    resources.buffers.length === 1 && envelope.bin !== null,
    'buffers',
    'A ordem estável exige um único buffer BIN.',
  )
  const slots = [...ordem].sort((a, b) => a - b),
    origemPorSlot = new Map(slots.map((s, i) => [s, ordem[i]!])),
    slotPorOrigem = new Map(ordem.map((s, i) => [s, slots[i]!])),
    segmentos: Uint8Array[] = [],
    novas: Record<string, unknown>[] = []
  let offset = 0
  for (let i = 0; i < views.length; i++) {
    const origem = origemPorSlot.get(i) ?? i,
      definicao = gltfRecord(views[origem], `bufferViews[${origem}]`),
      vista = resources.views[origem]!
    requireGltf(vista.buffer === 0, 'bufferViews', 'O GLB gerado possui mais de um buffer.')
    const payload = resources.buffers[0]!.subarray(
      vista.byteOffset,
      vista.byteOffset + vista.byteLength,
    )
    segmentos.push(payload)
    novas.push({ ...definicao, buffer: 0, byteOffset: offset })
    offset += glbAlignedLength(payload.length)
  }
  for (const [i, value] of images.entries()) {
    const imagem = gltfRecord(value, `images[${i}]`)
    if (imagem.bufferView !== undefined)
      imagem.bufferView = slotPorOrigem.get(imagem.bufferView as number)!
  }
  json.bufferViews = novas
  const buffers = json.buffers as unknown[]
  gltfRecord(buffers[0], 'buffers[0]').byteLength = offset
  return encodeGlbContainer(json, segmentos, GLTF_INPUT_LIMITS.fileBytes)
}
