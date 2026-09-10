import { GLTF_INPUT_LIMITS, GltfInputError, gltfRecord } from './gltfInput'
import { checkGltfVersion } from './gltfVersion'
import { readImportJson } from './importJson'

const policy = {
  jsonDepth: GLTF_INPUT_LIMITS.jsonDepth,
  jsonStructure: GLTF_INPUT_LIMITS.jsonStructure,
  error: (reason: 'invalid' | 'budget', path: string, message: string) =>
    new GltfInputError(reason, path, message),
}

export function readGltfJson(bytes: Uint8Array): Record<string, unknown> {
  const json = gltfRecord(readImportJson(bytes, policy), 'json')
  checkGltfVersion(json)
  return json
}
