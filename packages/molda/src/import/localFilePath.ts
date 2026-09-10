/** Shared local bundle syntax. Never touches the filesystem or treats names as URLs. */
export const LOCAL_FILE_PATH_LIMIT = 4096
export class LocalFilePathError extends Error {
  constructor(
    readonly reason: 'invalid' | 'unsupported' | 'budget',
    readonly path: string,
    message: string,
  ) {
    super(message)
    this.name = 'LocalFilePathError'
  }
}
function requirePath(condition: unknown, path: string, message: string): asserts condition {
  if (!condition) throw new LocalFilePathError('invalid', path, message)
}
export function localPathText(value: string, path: string): void {
  requirePath(
    typeof value === 'string' && value.length > 0,
    path,
    'O caminho do arquivo está vazio.',
  )
  if (value.length > LOCAL_FILE_PATH_LIMIT)
    throw new LocalFilePathError(
      'budget',
      path,
      'O caminho deste arquivo é longo demais para abrir no Molda.',
    )
  for (const char of value) {
    const code = char.charCodeAt(0)
    requirePath(
      code >= 32 && code !== 127 && char !== '\\',
      path,
      'O caminho contém caracteres não permitidos.',
    )
  }
}
export function normalizeLocalPathSegments(segments: string[], path: string): string {
  const last = segments[segments.length - 1]
  requirePath(
    last !== '.' && last !== '..',
    path,
    'O caminho aponta para uma pasta, não um arquivo.',
  )
  const result: string[] = []
  for (const segment of segments) {
    if (segment === '.') continue
    if (segment === '..') {
      if (!result.length)
        throw new LocalFilePathError('unsupported', path, 'O recurso fica fora da pasta escolhida.')
      result.pop()
    } else {
      requirePath(segment.length > 0, path, 'O caminho contém um nome de pasta ou arquivo vazio.')
      result.push(segment)
    }
  }
  requirePath(result.length > 0, path, 'O caminho precisa apontar para um arquivo.')
  return result.join('/')
}
export function localFilePath(value: string, path: string): string {
  localPathText(value, path)
  if (value.startsWith('/'))
    throw new LocalFilePathError(
      'unsupported',
      path,
      'Escolha arquivos dentro da mesma pasta do projeto.',
    )
  return normalizeLocalPathSegments(value.split('/'), path)
}
