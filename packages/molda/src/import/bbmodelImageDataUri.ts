import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'
import {
  decodeImportDataUri,
  type ImportDataUri,
  type ImportDataUriPolicy,
  inspectRasterDataUri,
} from './importDataUri'

const policy: ImportDataUriPolicy = {
  fileBytes: BBMODEL_INPUT_LIMITS.fileBytes,
  byteBudget(length, path) {
    if (length > BBMODEL_INPUT_LIMITS.fileBytes)
      throw new BbmodelInputError(
        'budget',
        path,
        'Os recursos deste arquivo ultrapassam o limite de 32 MiB do Molda.',
      )
  },
  error: (reason, path, message) => new BbmodelInputError(reason, path, message),
}
export function inspectBbmodelImageDataUri(uri: string, path: string) {
  return inspectRasterDataUri(uri, path, policy)
}
export function decodeBbmodelImageDataUri(data: ImportDataUri, path: string): Uint8Array {
  return decodeImportDataUri(data, path, policy)
}
