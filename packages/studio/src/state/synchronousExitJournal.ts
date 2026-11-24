import { encodeExitJournal } from './exitJournalCodec'
import {
  EXIT_JOURNAL_PREFIX,
  ExitJournalError,
  exitJournalUnavailable,
} from './synchronousExitJournalProbe'

export {
  captureExitJournalStorage,
  EXIT_JOURNAL_PREFIX,
  ExitJournalError,
  exitJournalUnavailable,
  hasSynchronousExitJournal,
} from './synchronousExitJournalProbe'

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
function keyFor(scope: string, identity: ExitJournalIdentity): string {
  return (
    EXIT_JOURNAL_PREFIX +
    ['1', scope, identity.projectId, identity.writer, identity.token]
      .map(encodeURIComponent)
      .join('|')
  )
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
