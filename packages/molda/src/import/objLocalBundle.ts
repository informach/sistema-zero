import {
  type LocalImportBundle,
  type LocalImportChosenFile,
  type LocalImportFile,
  readLocalImportBundle,
} from './localImportBundle'
import { OBJ_INPUT_LIMITS, ObjInputError } from './objInput'
import { objLocalFilePath } from './objResourcePath'

export type ObjChosenFile = LocalImportChosenFile
export type ObjLocalBundle = LocalImportBundle
export function readObjLocalBundle(
  chosen: readonly ObjChosenFile[],
  signal: AbortSignal,
  previous: readonly LocalImportFile[] = [],
): Promise<ObjLocalBundle> {
  return readLocalImportBundle(chosen, signal, previous, {
    ...OBJ_INPUT_LIMITS,
    path: objLocalFilePath,
    entry: (path) => /\.obj$/i.test(path),
    error: (reason, path, message) => new ObjInputError(reason, path, message),
  })
}
