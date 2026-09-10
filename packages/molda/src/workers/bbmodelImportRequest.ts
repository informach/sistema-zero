import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from '../import/bbmodelInput'
import { type BbmodelNativeOptions, readBbmodelNativeOptions } from '../import/bbmodelNativeOptions'
import { bbmodelLocalFilePath } from '../import/bbmodelResourcePath'
import type { BbmodelLocalFile } from '../import/bbmodelResources'
import type { NativeImportIdentity } from '../import/importDocumentBase'
import { LOCAL_FILE_PATH_LIMIT } from '../import/localFilePath'
import * as v from '../scene/validation'
import {
  type NativeImportToken,
  readNativeImportFiles,
  readNativeImportIdentity,
  readNativeImportToken,
} from './nativeImportRequest'

export type BbmodelImportToken = NativeImportToken
export const readBbmodelImportToken = readNativeImportToken
export interface BbmodelImportRequest extends BbmodelImportToken {
  bytes: Uint8Array
  files: readonly BbmodelLocalFile[]
  entryPath: string
  identity: NativeImportIdentity
  options: BbmodelNativeOptions
}

/** All nested choices and selected-byte limits before any snapshot or worker creation. */
export function readBbmodelImportRequest(raw: unknown, snapshot = false): BbmodelImportRequest {
  const row = v.record(raw, 'request', [
      'documentId',
      'revision',
      'requestId',
      'bytes',
      'files',
      'entryPath',
      'identity',
      'options',
    ]),
    token = readBbmodelImportToken(row),
    identity = readNativeImportIdentity(row.identity, token.documentId),
    // The strict reader checks every field; the cast describes input, never trusted output.
    options = readBbmodelNativeOptions(row.options as BbmodelNativeOptions),
    entryPath = bbmodelLocalFilePath(
      v.text(row.entryPath, 'entryPath', LOCAL_FILE_PATH_LIMIT),
      'entryPath',
    )
  v.requireScene(
    row.bytes instanceof Uint8Array && row.bytes.byteLength > 0,
    'bytes',
    'Escolha um arquivo com bytes, não vazio.',
  )
  const files = readNativeImportFiles(
    row.bytes,
    row.files,
    {
      fileBytes: BBMODEL_INPUT_LIMITS.fileBytes,
      totalBytes: BBMODEL_INPUT_LIMITS.selectedFileBytes,
      files: BBMODEL_INPUT_LIMITS.resources,
      pathChars: LOCAL_FILE_PATH_LIMIT,
      path: bbmodelLocalFilePath,
      excludedPath: entryPath,
      budgetError: (path) =>
        new BbmodelInputError(
          'budget',
          path,
          'Os arquivos escolhidos ultrapassam o orçamento de transporte.',
        ),
    },
    snapshot,
  )
  return { ...token, identity, options, entryPath, ...files }
}
