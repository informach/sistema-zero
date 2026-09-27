import { GltfInputError, requireGltf } from './gltfInput'
import {
  LocalFilePathError,
  localFilePath,
  localPathText,
  normalizeLocalPathSegments,
} from './localFilePath'

function gltfPath<T>(read: () => T): T {
  try {
    return read()
  } catch (error) {
    if (!(error instanceof LocalFilePathError)) throw error
    throw new GltfInputError(error.reason, error.path, error.message, { cause: error })
  }
}

/** Selected file names are literal, case-sensitive paths, not percent-encoded URIs. */
export function gltfLocalFilePath(value: string, path = 'files.path'): string {
  return gltfPath(() => localFilePath(value, path))
}

/** Resolve inside the explicitly selected bundle only. Never a URL or filesystem lookup. */
export function gltfResourcePath(uri: string, entryPath: string, path: string): string {
  return gltfPath(() => resolveGltfResourcePath(uri, entryPath, path))
}
function resolveGltfResourcePath(uri: string, entryPath: string, path: string): string {
  localPathText(uri, path)
  if (uri.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(uri) || /[?#]/.test(uri))
    throw new GltfInputError(
      'unsupported',
      path,
      'O Molda lê recursos locais escolhidos por você, sem baixar links externos.',
    )
  const segments = uri.split('/').map((segment) => {
    let decoded: string
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      throw new GltfInputError(
        'invalid',
        path,
        'O caminho contém uma sequência de caracteres inválida.',
      )
    }
    localPathText(decoded, path)
    requireGltf(
      !decoded.includes('/'),
      path,
      'Um nome de arquivo não pode esconder separadores de pasta.',
    )
    return decoded
  })
  const base = gltfLocalFilePath(entryPath, 'entryPath').split('/').slice(0, -1)
  const result = normalizeLocalPathSegments([...base, ...segments], path)
  localPathText(result, path)
  return result
}
