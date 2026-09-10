import { type GltfDataUri, inspectGltfDataPayload } from './gltfDataUri'
import { GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'

/** No byte allocation here: all resources must fit the aggregate budget before decoding. */
export function inspectGltfBufferDataUri(uri: string, path: string): GltfDataUri {
  if (uri.length > GLTF_INPUT_LIMITS.fileBytes)
    throw new GltfInputError(
      'budget',
      path,
      'O recurso embutido é grande demais para abrir no Molda.',
    )
  const prefix = /^data:application\/(?:octet-stream|gltf-buffer);base64,/i.exec(uri)
  if (!prefix)
    throw new GltfInputError(
      'unsupported',
      path,
      'Este tipo de recurso embutido ainda não é suportado.',
    )
  return inspectGltfDataPayload(uri.slice(prefix[0].length), 'base64', path)
}
