import { decodeExitJournal, encodeExitJournal } from './exitJournalCodec'

const PREFIX = 'sz:studio-exit:'
export interface ExitJournalIdentity {
  projectId: string
  writer: string
  token: string
}
export interface ExitJournalEntry extends ExitJournalIdentity {
  key: string
  encoded: string
  value: unknown
}
export class ExitJournalError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ExitJournalError'
  }
}
function unavailable(cause?: unknown): ExitJournalError {
  return new ExitJournalError(
    'Não foi possível guardar a cópia de recuperação. Mantenha esta aba aberta até salvar ou exportar o projeto.',
    { cause },
  )
}
function keyFor(scope: string, identity: ExitJournalIdentity): string {
  return (
    PREFIX +
    ['1', scope, identity.projectId, identity.writer, identity.token]
      .map(encodeURIComponent)
      .join('|')
  )
}
export function captureExitJournalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}
export function hasSynchronousExitJournal(storage: Storage | undefined, scope: string): boolean {
  if (!storage) return false
  try {
    return Object.keys(storage).some(
      (key) =>
        key.startsWith(PREFIX) &&
        key.slice(PREFIX.length).split('|')[1] === encodeURIComponent(scope),
    )
  } catch {
    return true
  } // The recovery boundary reports inaccessible storage explicitly.
}
/** Immutable token keys make acknowledgement safe across independent tabs. */
export function stageSynchronousExitJournal(
  storage: Storage | undefined,
  scope: string,
  identity: ExitJournalIdentity,
  value: unknown,
): string {
  if (!storage) throw unavailable()
  let encoded: string
  try {
    encoded = encodeExitJournal(value)
  } catch (error) {
    throw new ExitJournalError(
      'A cópia de recuperação completa não pôde ser preparada. Salve ou exporte antes de fechar esta aba.',
      { cause: error },
    )
  }
  const key = keyFor(scope, identity)
  try {
    const previous = storage.getItem(key)
    if (previous !== null && previous !== encoded)
      throw new ExitJournalError(
        'Duas cópias de recuperação usam a mesma revisão. As cópias foram preservadas.',
      )
    if (previous === encoded) return key
    storage.setItem(key, encoded)
    if (storage.getItem(key) !== encoded) throw unavailable()
    return key
  } catch (error) {
    if (error instanceof ExitJournalError) throw error
    throw unavailable(error)
  }
}
export function readSynchronousExitJournal(
  storage: Storage | undefined,
  scope: string,
  projectId?: string,
): ExitJournalEntry[] {
  if (!storage) return []
  const result: ExitJournalEntry[] = []
  let keys: string[]
  try {
    keys = Object.keys(storage)
  } catch (error) {
    throw unavailable(error)
  }
  for (const key of keys) {
    if (!key.startsWith(PREFIX)) continue
    const parts = key.slice(PREFIX.length).split('|')
    if (
      parts[1] !== encodeURIComponent(scope) ||
      (projectId !== undefined && parts[2] !== encodeURIComponent(projectId))
    )
      continue
    if (parts.length !== 5 || parts[0] !== '1')
      throw new ExitJournalError(
        'Existe uma cópia de recuperação de outra versão. Ela foi preservada.',
      )
    try {
      const encoded = storage.getItem(key)
      if (encoded === null) continue // An immutable entry may already have been acknowledged.
      const identity = {
        projectId: decodeURIComponent(parts[2] ?? ''),
        writer: decodeURIComponent(parts[3] ?? ''),
        token: decodeURIComponent(parts[4] ?? ''),
      }
      if (!identity.projectId || !identity.writer || !identity.token)
        throw new Error('Identidade ausente')
      result.push({ key, encoded, value: decodeExitJournal(encoded), ...identity })
    } catch (error) {
      throw new ExitJournalError(
        'Uma cópia de recuperação não pôde ser lida. Ela foi preservada; não edite uma versão antiga antes de recuperá-la.',
        { cause: error },
      )
    }
  }
  return result
}
export function acknowledgeSynchronousExitJournal(
  storage: Storage | undefined,
  entry: ExitJournalEntry,
): void {
  if (!storage) throw unavailable()
  if (storage.getItem(entry.key) === null) return
  if (storage.getItem(entry.key) !== entry.encoded)
    throw new ExitJournalError('A cópia de recuperação mudou. Ela foi preservada.')
  // Writers never replace a token key. A later revision has a different key.
  storage.removeItem(entry.key)
}
