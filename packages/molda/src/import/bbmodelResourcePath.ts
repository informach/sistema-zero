import type { BbmodelVersion } from './bbmodelEnvelope'
import { BbmodelInputError } from './bbmodelInput'
import { literalLocalFilePath, literalResourcePath } from './literalResourcePath'
import { LocalFilePathError } from './localFilePath'

function bbmodelPath<T>(read: () => T): T {
  try {
    return read()
  } catch (error) {
    if (!(error instanceof LocalFilePathError)) throw error
    throw new BbmodelInputError(error.reason, error.path, error.message, { cause: error })
  }
}
export function bbmodelLocalFilePath(value: string, path = 'files.path'): string {
  return bbmodelPath(() => literalLocalFilePath(value, path))
}
/** 4.9 used the entry file as a directory; 4.10+ uses its containing directory. */
export function bbmodelResourcePath(
  value: string,
  entryPath: string,
  version: BbmodelVersion,
  path: string,
): string {
  return bbmodelPath(() =>
    literalResourcePath(
      value,
      entryPath,
      path,
      version === '4.9' ? 'entry-as-directory' : 'entry-directory',
    ),
  )
}
