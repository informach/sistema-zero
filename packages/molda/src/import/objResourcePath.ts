import { literalLocalFilePath, literalResourcePath } from './literalResourcePath'
import { LocalFilePathError } from './localFilePath'
import { ObjInputError } from './objInput'

function objPath<T>(read: () => T): T {
  try {
    return read()
  } catch (error) {
    if (!(error instanceof LocalFilePathError)) throw error
    throw new ObjInputError(error.reason, error.path, error.message, { cause: error })
  }
}
export function objLocalFilePath(value: string, path = 'files.path'): string {
  return objPath(() => literalLocalFilePath(value, path))
}
export function objResourcePath(value: string, entryPath: string, path: string): string {
  return objPath(() => literalResourcePath(value, entryPath, path))
}
