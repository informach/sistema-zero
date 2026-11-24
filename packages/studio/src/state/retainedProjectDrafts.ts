import { readAllKeys, readValues } from './idbTransaction'
import { nativeRecovery, synchronousRecovery } from './projectRecoveryGuards'
import type { RecoveryWrite } from './projectStorageCoordinator'
import { projectRecoveryKey } from './projectStorageKeys'
import type { LocalHead } from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { acknowledgeSynchronousExitJournal, type ExitJournalEntry } from './synchronousExitJournal'
import { readSynchronousExitJournal } from './synchronousExitJournalRead'

/** One staged exit revision of a retained project: its native copy and/or synchronous mirrors. */
export interface RetainedDraft {
  recovery: RecoveryWrite
  native?: readonly [key: string, value: unknown]
  journal: ExitJournalEntry[]
}

/**
 * Exit copies of a retained project, keyed by revision. Unreadable records are left out: they
 * stay untouched on disk and the regular recovery boundary reports them.
 */
export async function readRetainedDrafts(
  scope: ProjectStorageScope,
  id: string,
): Promise<RetainedDraft[]> {
  const prefix = projectRecoveryKey(id, '')
  const keys = (await readAllKeys(scope.store)).filter(
    (key): key is string => typeof key === 'string' && key.startsWith(prefix),
  )
  const values = keys.length ? await readValues(scope.store, keys) : []
  const drafts = new Map<string, RetainedDraft>()
  const identity = (recovery: RecoveryWrite) => `${recovery.head.writer}|${recovery.head.token}`
  for (const [index, key] of keys.entries()) {
    try {
      const recovery = nativeRecovery(values[index], key)
      if (recovery.projectId === id)
        drafts.set(identity(recovery), { recovery, native: [key, values[index]], journal: [] })
    } catch {
      /* Preserved as is. */
    }
  }
  let entries: ExitJournalEntry[] = []
  try {
    entries = readSynchronousExitJournal(scope.exitJournalStorage, scope.identity, id)
  } catch {
    /* An unavailable journal is never acknowledged; its native mirrors still count. */
  }
  for (const entry of entries) {
    try {
      const recovery = synchronousRecovery(entry)
      const found = drafts.get(identity(recovery))
      if (found) found.journal.push(entry)
      else drafts.set(identity(recovery), { recovery, journal: [entry] })
    } catch {
      /* Preserved as is. */
    }
  }
  return [...drafts.values()]
}

/**
 * Where an exit copy stands against the retained editor head: `covered` when the durable head
 * already contains it, `adoptable` when it continues that head, `competing` when another lineage
 * wrote it (the regular recovery keeps it as a separate copy).
 */
export function retainedDraftRelation(
  head: LocalHead,
  draft: LocalHead,
): 'covered' | 'adoptable' | 'competing' {
  if (draft.token === head.token) return 'covered'
  if (draft.writer === head.writer && draft.base === head.base)
    return draft.sequence <= head.sequence ? 'covered' : 'adoptable'
  return draft.base === head.token ? 'adoptable' : 'competing'
}

/** After the durable commit: a changed or unavailable mirror is kept, never a failed save. */
export function acknowledgeRetainedJournal(
  scope: ProjectStorageScope,
  drafts: readonly RetainedDraft[],
): void {
  for (const entry of drafts.flatMap((draft) => draft.journal)) {
    try {
      acknowledgeSynchronousExitJournal(scope.exitJournalStorage, entry)
    } catch (error) {
      console.warn('[studio] cópia de recuperação preservada:', error)
    }
  }
}
