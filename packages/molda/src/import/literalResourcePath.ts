import {
  LocalFilePathError,
  localFilePath,
  localPathText,
  normalizeLocalPathSegments,
} from './localFilePath'

const scheme = /^[a-z][a-z0-9+.-]*:/i
function requireRelative(value: string, path: string): void {
  if (value.startsWith('/') || scheme.test(value))
    throw new LocalFilePathError(
      'unsupported',
      path,
      'Escolha um caminho relativo dentro do conjunto local.',
    )
}
export function literalLocalFilePath(value: string, path: string): string {
  const result = localFilePath(value, path)
  requireRelative(result, path)
  return result
}
/** Literal references, never URIs. Only references adapt Windows separators. */
export function literalResourcePath(
  value: string,
  entryPath: string,
  path: string,
  baseMode: 'entry-directory' | 'entry-as-directory' = 'entry-directory',
): string {
  if (typeof value !== 'string')
    throw new LocalFilePathError('invalid', path, 'O caminho precisa ser texto.')
  const reference = value.replaceAll('\\', '/')
  localPathText(reference, path)
  requireRelative(reference, path)
  const entry = literalLocalFilePath(entryPath, 'entryPath').split('/')
  const base = baseMode === 'entry-directory' ? entry.slice(0, -1) : entry
  const result = normalizeLocalPathSegments([...base, ...reference.split('/')], path)
  localPathText(result, path)
  requireRelative(result, path)
  return result
}
