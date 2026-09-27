import type { NativeImportIdentity } from '../import/importDocumentBase'
import { LOCAL_FILE_PATH_LIMIT } from '../import/localFilePath'
import { OBJ_INPUT_LIMITS, ObjInputError } from '../import/objInput'
import type { ObjLocalFile } from '../import/objLocalResources'
import { type ObjNativeOptions, readObjNativeOptions } from '../import/objNativeOptions'
import { objLocalFilePath } from '../import/objResourcePath'
import * as v from '../scene/validation'
import {
  type NativeImportToken,
  readNativeImportFiles,
  readNativeImportIdentity,
  readNativeImportToken,
} from './nativeImportRequest'

export type ObjImportToken = NativeImportToken
export const readObjImportToken = readNativeImportToken
export interface ObjImportRequest extends ObjImportToken {
  bytes: Uint8Array
  files: readonly ObjLocalFile[]
  entryPath: string
  identity: NativeImportIdentity
  options: ObjNativeOptions
}

export function readObjImportRequest(raw: unknown, snapshot = false): ObjImportRequest {
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
    token = readObjImportToken(row),
    identity = readNativeImportIdentity(row.identity, token.documentId),
    // The normalizer validates every nested field; this cast is input, never trusted output.
    options = readObjNativeOptions(row.options as ObjNativeOptions),
    entryPath = objLocalFilePath(
      v.text(row.entryPath, 'entryPath', LOCAL_FILE_PATH_LIMIT),
      'entryPath',
    )
  return {
    ...token,
    identity,
    options,
    entryPath,
    ...readNativeImportFiles(
      row.bytes,
      row.files,
      {
        fileBytes: OBJ_INPUT_LIMITS.fileBytes,
        totalBytes: OBJ_INPUT_LIMITS.selectedFileBytes,
        files: OBJ_INPUT_LIMITS.resources,
        pathChars: LOCAL_FILE_PATH_LIMIT,
        path: objLocalFilePath,
        excludedPath: entryPath,
        budgetError: (path) =>
          new ObjInputError(
            'budget',
            path,
            'Os arquivos escolhidos ultrapassam o orçamento de transporte.',
          ),
      },
      snapshot,
    ),
  }
}
