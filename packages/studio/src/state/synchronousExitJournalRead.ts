import { decodeExitJournal } from './exitJournalDecode'
import type { ExitJournalEntry } from './synchronousExitJournal'
import {
  EXIT_JOURNAL_PREFIX,
  ExitJournalError,
  exitJournalUnavailable,
} from './synchronousExitJournalProbe'

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
    throw exitJournalUnavailable(error)
  }
  for (const key of keys) {
    if (!key.startsWith(EXIT_JOURNAL_PREFIX)) continue
    const parts = key.slice(EXIT_JOURNAL_PREFIX.length).split('|')
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

/** Enumerate owners before decoding bodies so one future payload can be isolated by ID. */
export function synchronousExitProjectIds(storage: Storage | undefined, scope: string): string[] {
  if (!storage) return []
  const ids = new Set<string>()
  let keys: string[]
  try {
    keys = Object.keys(storage)
  } catch (error) {
    throw exitJournalUnavailable(error)
  }
  for (const key of keys) {
    if (!key.startsWith(EXIT_JOURNAL_PREFIX)) continue
    const parts = key.slice(EXIT_JOURNAL_PREFIX.length).split('|')
    if (parts[1] !== encodeURIComponent(scope)) continue
    try {
      const id = decodeURIComponent(parts[2] ?? '')
      if (!id) throw new Error('Identidade ausente')
      ids.add(id)
    } catch (error) {
      throw new ExitJournalError(
        'Uma cópia de recuperação não tem identidade legível. Ela foi preservada.',
        { cause: error },
      )
    }
  }
  return [...ids]
}
