import { encodeExitJournal } from './exitJournalCodec'

export const EXIT_JOURNAL_PREFIX = 'sz:studio-exit:'
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
export function exitJournalUnavailable(cause?: unknown): ExitJournalError {
  return new ExitJournalError(
    'Não foi possível guardar a cópia de recuperação. Mantenha esta aba aberta até salvar ou exportar o projeto.',
    { cause },
  )
}
function keyFor(scope: string, identity: ExitJournalIdentity): string {
  return (
    EXIT_JOURNAL_PREFIX +
    ['1', scope, identity.projectId, identity.writer, identity.token]
      .map(encodeURIComponent)
      .join('|')
  )
}
export function captureExitJournalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch (error) {
    // Inaccessible storage is different from an environment without Web Storage.
    // Otherwise a later session could silently open an old IndexedDB revision
    // while its newer exit copy is present but forbidden by browser policy.
    const fail = (): never => {
      throw exitJournalUnavailable(error)
    }
    return new Proxy({} as Storage, { get: fail, ownKeys: fail })
  }
}
export function hasSynchronousExitJournal(storage: Storage | undefined, scope: string): boolean {
  if (!storage) return false
  try {
    return Object.keys(storage).some(
      (key) =>
        key.startsWith(EXIT_JOURNAL_PREFIX) &&
        key.slice(EXIT_JOURNAL_PREFIX.length).split('|')[1] === encodeURIComponent(scope),
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
  if (!storage) throw exitJournalUnavailable()
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
    if (storage.getItem(key) !== encoded) throw exitJournalUnavailable()
    return key
  } catch (error) {
    if (error instanceof ExitJournalError) throw error
    throw exitJournalUnavailable(error)
  }
}
export function acknowledgeSynchronousExitJournal(
  storage: Storage | undefined,
  entry: ExitJournalEntry,
): void {
  if (!storage) throw exitJournalUnavailable()
  if (storage.getItem(entry.key) === null) return
  if (storage.getItem(entry.key) !== entry.encoded)
    throw new ExitJournalError('A cópia de recuperação mudou. Ela foi preservada.')
  // Writers never replace a token key. A later revision has a different key.
  storage.removeItem(entry.key)
}
