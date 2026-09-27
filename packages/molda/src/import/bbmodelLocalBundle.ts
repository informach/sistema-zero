import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'
import { bbmodelLocalFilePath } from './bbmodelResourcePath'
import {
  type LocalImportBundle,
  type LocalImportChosenFile,
  type LocalImportFile,
  readLocalImportBundle,
} from './localImportBundle'

export type BbmodelChosenFile = LocalImportChosenFile
export type BbmodelLocalBundle = LocalImportBundle
export function readBbmodelLocalBundle(
  chosen: readonly BbmodelChosenFile[],
  signal: AbortSignal,
  previous: readonly LocalImportFile[] = [],
): Promise<BbmodelLocalBundle> {
  return readLocalImportBundle(chosen, signal, previous, {
    ...BBMODEL_INPUT_LIMITS,
    path: bbmodelLocalFilePath,
    entry: (path) => /\.bbmodel$/i.test(path),
    error: (reason, path, message) => new BbmodelInputError(reason, path, message),
  })
}
