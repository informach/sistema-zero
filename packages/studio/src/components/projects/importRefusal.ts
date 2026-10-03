import {
  isDocumentRecord,
  ProjectDocumentError,
  ProjectTooLargeError,
} from '../../core/projectDocument'

/**
 * Recusas da importação, em frase de criança. O texto técnico das recusas (o caminho no
 * documento, o tipo de bloco, o motivo do validador) é para quem diagnostica e vai só para o
 * console: na tela ele aparecia cru ("fora da allowlist", "$.installedExtensions") e não dizia
 * nada a quem tentava abrir o próprio jogo. Aqui só se escolhe a FRASE; as regras de recusa
 * continuam onde estão (validação e migrações do documento).
 */
export type ImportRefusalKey =
  | 'projects.importNotJson'
  | 'projects.importRefused.newer'
  | 'projects.importRefused.blocks'
  | 'projects.importRefused.parts'
  | 'projects.importRefused.tooBig'
  | 'projects.importRefused.generic'

/** O arquivo passou do teto de tamanho antes mesmo de ser lido como projeto. */
export class ImportTooBigError extends Error {
  constructor() {
    super('arquivo excede o tamanho máximo permitido')
    this.name = 'ImportTooBigError'
  }
}

/**
 * Um JSON que nem tem a forma de projeto (sem nome ou sem arquivos) é "este arquivo não é um
 * projeto do Estúdio", a mesma frase do arquivo que nem é JSON. É a mesma checagem de entrada do
 * `prepareProjectDocument`; só serve para escolher a frase, quem recusa é ele.
 */
export function looksLikeStudioProject(value: unknown): boolean {
  return isDocumentRecord(value) && typeof value.name === 'string' && isDocumentRecord(value.files)
}

export function importRefusalKey(err: unknown): ImportRefusalKey {
  // Grande demais é PERMANENTE: a frase genérica mandaria tentar de novo para sempre.
  if (err instanceof ImportTooBigError || err instanceof ProjectTooLargeError)
    return 'projects.importRefused.tooBig'
  if (err instanceof ProjectDocumentError) {
    if (err.code === 'future-format') return 'projects.importRefused.newer'
    if (err.path === '$.blocksState' || err.path.startsWith('$.blocksState.'))
      return 'projects.importRefused.blocks'
    return 'projects.importRefused.parts'
  }
  return 'projects.importRefused.generic'
}

/** O detalhe que a tela não mostra, para o console de quem investiga. */
export function importRefusalDetail(err: unknown): Record<string, string> {
  if (err instanceof ProjectDocumentError)
    return { code: err.code, path: err.path, message: err.message }
  if (err instanceof Error) return { name: err.name, message: err.message }
  return { value: String(err) }
}
