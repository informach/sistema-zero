import { readGltfBufferViews } from './gltfBufferViews'
import type { GltfEnvelope } from './gltfEnvelope'
import {
  checkGltfByteBudget,
  GLTF_INPUT_LIMITS,
  GltfInputError,
  gltfInteger,
  gltfList,
  gltfRecord,
  requireGltf,
} from './gltfInput'
import type { GltfResourcePlan } from './gltfResourcePlan'

export function planGltfBuffers(envelope: GltfEnvelope, resources: GltfResourcePlan) {
  const buffers = gltfList(envelope.json.buffers, 'buffers', GLTF_INPUT_LIMITS.resources).map(
    (value, i) => {
      const path = `buffers[${i}]`,
        row = gltfRecord(value, path)
      const byteLength = gltfInteger(row.byteLength, `${path}.byteLength`, 1)
      checkGltfByteBudget(byteLength, `${path}.byteLength`)
      let key: string
      if (row.uri === undefined) {
        if (i !== 0 || envelope.format !== 'glb')
          throw new GltfInputError(
            'unsupported',
            path,
            'Este buffer precisa de uma fonte de dados que ainda não é suportada.',
          )
        requireGltf(envelope.bin !== null, path, 'O bloco binário declarado não está no GLB.')
        const bin = envelope.bin
        requireGltf(
          bin.length >= byteLength && bin.length - byteLength <= 3,
          path,
          'O tamanho do bloco binário não corresponde ao buffer declarado.',
        )
        for (let j = byteLength; j < bin.length; j++)
          requireGltf(
            bin[j] === 0,
            path,
            'O preenchimento final do bloco binário precisa ser zero.',
          )
        key = resources.bin(bin.subarray(0, byteLength), path)
      } else {
        requireGltf(
          typeof row.uri === 'string',
          `${path}.uri`,
          'O endereço do recurso precisa ser texto.',
        )
        key = resources.uri(row.uri, `${path}.uri`, 'buffer', byteLength).key
      }
      return { key, byteLength }
    },
  )
  const views = readGltfBufferViews(
    envelope.json.bufferViews,
    buffers.map((buffer) => buffer.byteLength),
  )
  return { buffers, views }
}

/** Only after the same plan's finish returned ready. Views share its one owned copy. */
export function materializeGltfBuffers(
  buffers: ReturnType<typeof planGltfBuffers>['buffers'],
  owned: ReadonlyMap<string, Uint8Array>,
): Uint8Array[] {
  return buffers.map(({ key, byteLength }) => {
    const bytes = owned.get(key)
    requireGltf(bytes !== undefined, 'resources', 'O recurso planejado não foi materializado.')
    return bytes.subarray(0, byteLength)
  })
}
