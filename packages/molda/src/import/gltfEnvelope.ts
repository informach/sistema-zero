import { GLTF_INPUT_LIMITS, GltfInputError, requireGltf } from './gltfInput'
import { readGltfJson } from './gltfJson'

const MAGIC = 0x46546c67,
  JSON_CHUNK = 0x4e4f534a,
  BIN_CHUNK = 0x004e4942

export interface GltfEnvelope {
  format: 'glb' | 'gltf'
  /** Owned JSON, NOT a validated model. Unknown extensions/extras are inert data. */
  json: Record<string, unknown>
  /** Owned chunk including up to three padding bytes; buffer binding is a separate step. */
  bin: Uint8Array | null
  unknownChunkTypes: number[]
}

/** glTF 2.0 §4.4. No network, resource decoding, extensions or authorial writes. */
export function readGltfEnvelope(bytes: Uint8Array): GltfEnvelope {
  if (bytes.byteLength > GLTF_INPUT_LIMITS.fileBytes)
    throw new GltfInputError('budget', 'file', 'O arquivo ultrapassa o limite de 32 MiB do Molda.')
  if (!(bytes.buffer instanceof ArrayBuffer))
    throw new GltfInputError(
      'unsupported',
      'file',
      'A leitura precisa de um arquivo sem memória compartilhada.',
    )
  requireGltf(bytes.byteLength > 0, 'file', 'O arquivo está vazio.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.byteLength < 4 || view.getUint32(0, true) !== MAGIC)
    return { format: 'gltf', json: readGltfJson(bytes), bin: null, unknownChunkTypes: [] }

  requireGltf(bytes.byteLength >= 12, 'header', 'O cabeçalho GLB está incompleto.')
  if (view.getUint32(4, true) !== 2)
    throw new GltfInputError(
      'unsupported',
      'header.version',
      'Esta versão do contêiner GLB ainda não é suportada.',
    )
  requireGltf(
    view.getUint32(8, true) === bytes.byteLength,
    'header.length',
    'O tamanho declarado do GLB não corresponde ao arquivo.',
  )
  let offset = 12,
    count = 0
  let jsonBytes: Uint8Array | null = null,
    binBytes: Uint8Array | null = null
  const unknownChunkTypes: number[] = []
  while (offset < bytes.byteLength) {
    if (++count > GLTF_INPUT_LIMITS.chunks)
      throw new GltfInputError(
        'budget',
        'chunks',
        'Este arquivo tem blocos demais para abrir no Molda.',
      )
    requireGltf(
      offset + 8 <= bytes.byteLength,
      'chunks',
      'Um cabeçalho de bloco GLB está incompleto.',
    )
    const length = view.getUint32(offset, true),
      type = view.getUint32(offset + 4, true)
    const start = offset + 8,
      end = start + length
    requireGltf(
      length % 4 === 0 && end <= bytes.byteLength,
      'chunks',
      'O tamanho ou alinhamento de um bloco GLB é inválido.',
    )
    requireGltf(
      count !== 1 || type === JSON_CHUNK,
      'chunks',
      'O primeiro bloco GLB precisa ser JSON.',
    )
    if (type === JSON_CHUNK) {
      requireGltf(count === 1, 'chunks', 'O GLB só pode ter um bloco JSON, no início.')
      jsonBytes = bytes.subarray(start, end)
    } else if (type === BIN_CHUNK) {
      requireGltf(
        count === 2,
        'chunks',
        'O bloco binário GLB só pode aparecer uma vez, em segundo lugar.',
      )
      binBytes = bytes.subarray(start, end)
    } else unknownChunkTypes.push(type)
    offset = end
  }
  requireGltf(jsonBytes !== null, 'chunks', 'O GLB não contém um bloco JSON.')
  const json = readGltfJson(jsonBytes)
  // Buffer.slice() would retain caller memory. The typed-array constructor always owns bytes.
  return {
    format: 'glb',
    json,
    bin: binBytes === null ? null : new Uint8Array(binBytes),
    unknownChunkTypes,
  }
}
