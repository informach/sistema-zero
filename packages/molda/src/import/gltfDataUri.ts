import { checkGltfByteBudget, GLTF_INPUT_LIMITS, GltfInputError } from './gltfInput'
import {
  decodeImportDataUri,
  type ImportDataUri,
  type ImportDataUriPolicy,
  inspectImportDataPayload,
} from './importDataUri'

export type GltfDataUri = ImportDataUri
export const GLTF_DATA_URI_POLICY: ImportDataUriPolicy = {
  fileBytes: GLTF_INPUT_LIMITS.fileBytes,
  byteBudget: checkGltfByteBudget,
  error: (reason, path, message) => new GltfInputError(reason, path, message),
}
export function inspectGltfDataPayload(
  payload: string,
  encoding: GltfDataUri['encoding'],
  path: string,
): GltfDataUri {
  return inspectImportDataPayload(payload, encoding, path, GLTF_DATA_URI_POLICY)
}
export function decodeGltfDataUri(data: GltfDataUri, path: string): Uint8Array {
  return decodeImportDataUri(data, path, GLTF_DATA_URI_POLICY)
}
