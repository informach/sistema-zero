import { GLTF_INPUT_LIMITS, gltfInteger, gltfList, gltfRecord, requireGltf } from './gltfInput'

export interface GltfBufferView {
  buffer: number
  byteOffset: number
  byteLength: number
  byteStride: number | null
  target: 34962 | 34963 | null
}

/** Byte ranges only. Accessor usage/alignment and image codecs are validated by their readers. */
export function readGltfBufferViews(input: unknown, lengths: readonly number[]): GltfBufferView[] {
  return gltfList(input, 'bufferViews', GLTF_INPUT_LIMITS.bufferViews).map((value, i) => {
    const path = `bufferViews[${i}]`,
      row = gltfRecord(value, path)
    const buffer = gltfInteger(row.buffer, `${path}.buffer`, 0, lengths.length - 1)
    const byteOffset = gltfInteger(
      row.byteOffset === undefined ? 0 : row.byteOffset,
      `${path}.byteOffset`,
    )
    const byteLength = gltfInteger(row.byteLength, `${path}.byteLength`, 1)
    requireGltf(
      byteOffset <= lengths[buffer]! - byteLength,
      path,
      'Este intervalo ultrapassa o tamanho declarado do buffer.',
    )
    const byteStride =
      row.byteStride === undefined
        ? null
        : gltfInteger(row.byteStride, `${path}.byteStride`, 4, 252)
    requireGltf(
      byteStride === null || byteStride % 4 === 0,
      `${path}.byteStride`,
      'O passo dos vértices precisa ser múltiplo de quatro bytes.',
    )
    requireGltf(row.target !== null, `${path}.target`, 'O destino do buffer não pode ser nulo.')
    const target = row.target === undefined ? null : row.target
    requireGltf(
      target === null || target === 34962 || target === 34963,
      `${path}.target`,
      'O destino deste buffer não é reconhecido.',
    )
    requireGltf(
      byteStride === null || target !== 34963,
      path,
      'Um buffer de índices não pode ter passo de vértices.',
    )
    return { buffer, byteOffset, byteLength, byteStride, target }
  })
}
