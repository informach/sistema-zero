import { isStudioPortablePath, studioPortableFileConflict } from './portable-path'

/** Qualified analysis profile. Exceeding it disables analysis, never removes project files. */
export const PYTHON_LANGUAGE_LIMITS = Object.freeze({
  maxFiles: 50,
  maxLines: 20_000,
  maxFileBytes: 1024 * 1024,
  maxTotalBytes: 8 * 1024 * 1024,
  maxRequestBytes: 9 * 1024 * 1024,
  maxResponseBytes: 2 * 1024 * 1024,
  maxPendingRequests: 16,
  maxQueuedSyncs: 2,
  maxBufferedRequestBytes: 16 * 1024 * 1024,
  maxPathsPerSession: 2_000,
  requestTimeoutMs: 15_000,
  reservationTtlMs: 30_000,
  startupTimeoutMs: 40_000,
  idleTtlMs: 5 * 60_000,
  maxLifetimeMs: 2 * 60 * 60_000,
})

export const PYTHON_LANGUAGE_METHODS = [
  'symbols',
  'references',
  'renameSymbol',
  'diagnostics',
  'projectDiagnostics',
  'completions',
  'hover',
  'definitions',
  'signatureHelp',
] as const
export type PythonLanguageMethod = (typeof PYTHON_LANGUAGE_METHODS)[number]

export interface PythonLanguageFile {
  version: number
  source: string
}
export interface PythonLanguageSnapshot {
  revision: number
  files: Readonly<Record<string, PythonLanguageFile>>
}
export interface PythonLanguagePatch {
  path: string
  /** Increases throughout the connection, including deletion and recreation of a path. */
  version: number
  source: string | null
}
export type PythonLanguageCommand = { version: 1; id: string } & (
  | {
      kind: 'sync'
      entrypoint: string
      baseRevision: number
      revision: number
      changes: PythonLanguagePatch[]
    }
  | {
      kind: 'query'
      revision: number
      path: string
      documentVersion: number
      method: PythonLanguageMethod
      offset?: number
      name?: string
    }
  | { kind: 'cancel'; requestId: string }
  | { kind: 'dispose' }
)

export class PythonLanguageProtocolError extends Error {
  constructor(
    readonly code: 'invalid-request' | 'quota-exceeded' | 'stale-document',
    message: string,
  ) {
    super(message)
    this.name = 'PythonLanguageProtocolError'
  }
}
const invalid = () =>
  new PythonLanguageProtocolError('invalid-request', 'Pedido de análise Python inválido.')
const integer = (value: unknown, minimum = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
const identifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value)
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const keys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key))

export function isPythonLanguageSourcePath(path: string): boolean {
  return (
    isStudioPortablePath(path) &&
    /\.pyi?$/.test(path) &&
    !path
      .split('/')
      .some((part) =>
        ['node_modules', '.git', '.venv', 'venv', '__pycache__', 'site-packages'].includes(
          part.toLowerCase(),
        ),
      )
  )
}

/** No author-controlled JSON-RPC methods, interpreter paths or server configuration cross this API. */
export function parsePythonLanguageCommand(value: unknown): PythonLanguageCommand {
  if (!record(value) || value.version !== 1 || !identifier(value.id)) throw invalid()
  if (value.kind === 'dispose' && keys(value, ['version', 'id', 'kind']))
    return { version: 1, id: value.id, kind: 'dispose' }
  if (
    value.kind === 'cancel' &&
    keys(value, ['version', 'id', 'kind', 'requestId']) &&
    identifier(value.requestId)
  )
    return { version: 1, id: value.id, kind: 'cancel', requestId: value.requestId }
  if (value.kind === 'sync') {
    if (
      !keys(value, [
        'version',
        'id',
        'kind',
        'entrypoint',
        'baseRevision',
        'revision',
        'changes',
      ]) ||
      typeof value.entrypoint !== 'string' ||
      !isPythonLanguageSourcePath(value.entrypoint) ||
      !value.entrypoint.endsWith('.py') ||
      !integer(value.baseRevision) ||
      !integer(value.revision, 1) ||
      value.revision !== value.baseRevision + 1 ||
      !Array.isArray(value.changes) ||
      value.changes.length > PYTHON_LANGUAGE_LIMITS.maxFiles * 2
    )
      throw invalid()
    const seen = new Set<string>()
    const changes = value.changes.map((change): PythonLanguagePatch => {
      if (
        !record(change) ||
        !keys(change, ['path', 'version', 'source']) ||
        typeof change.path !== 'string' ||
        !isPythonLanguageSourcePath(change.path) ||
        !integer(change.version, 1) ||
        !(typeof change.source === 'string' || change.source === null) ||
        seen.has(change.path.toLowerCase())
      )
        throw invalid()
      seen.add(change.path.toLowerCase())
      if (
        typeof change.source === 'string' &&
        new TextEncoder().encode(change.source).byteLength > PYTHON_LANGUAGE_LIMITS.maxFileBytes
      )
        throw new PythonLanguageProtocolError(
          'quota-exceeded',
          'Este arquivo ultrapassa o limite de análise Python.',
        )
      return { path: change.path, version: change.version, source: change.source }
    })
    return {
      version: 1,
      id: value.id,
      kind: 'sync',
      entrypoint: value.entrypoint,
      baseRevision: value.baseRevision,
      revision: value.revision,
      changes,
    }
  }
  if (
    value.kind !== 'query' ||
    !keys(value, [
      'version',
      'id',
      'kind',
      'revision',
      'path',
      'documentVersion',
      'method',
      'offset',
      'name',
    ]) ||
    !integer(value.revision, 1) ||
    !integer(value.documentVersion, 1) ||
    typeof value.path !== 'string' ||
    !isPythonLanguageSourcePath(value.path) ||
    typeof value.method !== 'string' ||
    !PYTHON_LANGUAGE_METHODS.some((method) => method === value.method)
  )
    throw invalid()
  const method = value.method as PythonLanguageMethod
  const positional = !['symbols', 'diagnostics', 'projectDiagnostics'].includes(method)
  if (
    (positional ? !integer(value.offset) : value.offset !== undefined) ||
    (method === 'renameSymbol'
      ? typeof value.name !== 'string' || !value.name.length || value.name.length > 256
      : value.name !== undefined)
  )
    throw invalid()
  return {
    version: 1,
    id: value.id,
    kind: 'query',
    revision: value.revision,
    path: value.path,
    documentVersion: value.documentVersion,
    method,
    ...(positional ? { offset: value.offset as number } : {}),
    ...(method === 'renameSymbol' ? { name: value.name as string } : {}),
  }
}

/** Apply to an immutable candidate and validate globally before changing the live LSP process. */
export function applyPythonLanguagePatch(
  snapshot: PythonLanguageSnapshot,
  versions: ReadonlyMap<string, number>,
  command: Extract<PythonLanguageCommand, { kind: 'sync' }>,
): { snapshot: PythonLanguageSnapshot; versions: Map<string, number> } {
  if (snapshot.revision !== command.baseRevision)
    throw new PythonLanguageProtocolError('stale-document', 'A revisão da análise Python mudou.')
  const files: Record<string, PythonLanguageFile> = Object.assign(
    Object.create(null),
    snapshot.files,
  )
  const nextVersions = new Map(versions)
  for (const change of command.changes) {
    if (change.version <= (nextVersions.get(change.path) ?? 0))
      throw new PythonLanguageProtocolError('stale-document', 'A versão do arquivo Python mudou.')
    nextVersions.set(change.path, change.version)
    if (change.source === null) delete files[change.path]
    else files[change.path] = { version: change.version, source: change.source }
  }
  const seen = new Set<string>()
  if (studioPortableFileConflict(Object.keys(files))) throw invalid()
  let bytes = 0,
    lines = 0
  for (const [path, file] of Object.entries(files)) {
    if (seen.has(path.toLowerCase())) throw invalid()
    seen.add(path.toLowerCase())
    bytes += new TextEncoder().encode(file.source).byteLength
    if (file.source) {
      lines++
      for (let index = 0; index < file.source.length; index++) {
        const character = file.source[index]
        if (character === '\r' && file.source[index + 1] === '\n') index++
        if ((character === '\r' || character === '\n') && index < file.source.length - 1) lines++
      }
    }
  }
  if (
    nextVersions.size > PYTHON_LANGUAGE_LIMITS.maxPathsPerSession ||
    seen.size > PYTHON_LANGUAGE_LIMITS.maxFiles ||
    bytes > PYTHON_LANGUAGE_LIMITS.maxTotalBytes ||
    lines > PYTHON_LANGUAGE_LIMITS.maxLines
  )
    throw new PythonLanguageProtocolError(
      'quota-exceeded',
      'Este projeto ultrapassa o limite de análise Python. Seus arquivos foram preservados.',
    )
  return { snapshot: { revision: command.revision, files }, versions: nextVersions }
}

export function assertPythonLanguageQueryCurrent(
  snapshot: PythonLanguageSnapshot,
  command: Extract<PythonLanguageCommand, { kind: 'query' }>,
) {
  const file = snapshot.files[command.path]
  if (snapshot.revision !== command.revision || !file || file.version !== command.documentVersion)
    throw new PythonLanguageProtocolError(
      'stale-document',
      'O arquivo mudou durante a análise Python.',
    )
  if (command.offset !== undefined) {
    const offset = command.offset
    if (
      offset > file.source.length ||
      (file.source[offset - 1] === '\r' && file.source[offset] === '\n') ||
      (file.source.charCodeAt(offset - 1) >= 0xd800 &&
        file.source.charCodeAt(offset - 1) <= 0xdbff &&
        file.source.charCodeAt(offset) >= 0xdc00 &&
        file.source.charCodeAt(offset) <= 0xdfff)
    )
      throw invalid()
  }
  return file
}
