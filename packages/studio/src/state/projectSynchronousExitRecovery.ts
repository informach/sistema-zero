import { synchronousRecovery, recoverySourceIdentity } from './projectRecoveryGuards'
import { readSynchronousExitJournal } from './synchronousExitJournal'
import { encodeExitJournal } from './exitJournalCodec'
import { conditionalGeneration, conditionalWrite, readValues } from './idbTransaction'
import {
  journal,
  type RecoveryWrite,
  recoverIndexedProjectWrites,
} from './projectStorageCoordinator'
import { projectApplicationsKey, projectHeadKey, projectRecoveryKey } from './projectStorageKeys'
import { isLocalHead } from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import {
  acknowledgeSynchronousExitJournal,
  type ExitJournalEntry,
  ExitJournalError,
} from './synchronousExitJournal'

/** Called only after a confirmed write, when a mirror actually exists. */
export async function retireConfirmedExitCopies(scope: ProjectStorageScope, projectId: string) {
  const entries = readSynchronousExitJournal(scope.exitJournalStorage, scope.identity, projectId)
  const confirmed = new Set<string>()
  for (const entry of entries) {
    const incoming = synchronousRecovery(entry)
    if (await retireMatchingSynchronousRecovery(scope, entry, incoming)) {
      if (!incoming.incompleteBlocks)
        for (const source of incoming.replacesRecovery ?? [])
          confirmed.add(recoverySourceIdentity(source))
    }
  }
  for (const entry of entries) {
    if (
      confirmed.has(
        recoverySourceIdentity({
          key: projectRecoveryKey(entry.projectId, entry.writer),
          token: entry.token,
        }),
      )
    )
      await retireSynchronousRecovery(scope, entry, synchronousRecovery(entry))
  }
}

async function matchesCommittedRecovery(
  scope: ProjectStorageScope,
  recovery: RecoveryWrite,
): Promise<boolean> {
  const puts = recovery.write.puts ?? []
  const deletes = recovery.write.deletes ?? []
  const [head, applications, ...values] = await readValues(scope.store, [
    projectHeadKey(recovery.projectId),
    projectApplicationsKey(recovery.projectId),
    ...puts.map(([key]) => key),
    ...deletes,
  ])
  if (!isLocalHead(head) || head.deleted) return false
  try {
    if (
      !puts.every(
        ([, value], index) => encodeExitJournal(value) === encodeExitJournal(values[index]),
      )
    )
      return false
    if (!deletes.every((_, index) => values[puts.length + index] === undefined)) return false
    const saved = journal(applications)
    return recovery.applications.every((record) =>
      saved.some(
        (other) =>
          other.operationId === record.operationId &&
          encodeExitJournal(other) === encodeExitJournal(record),
      ),
    )
  } catch {
    return false
  }
}

async function retireMatchingSynchronousRecovery(
  scope: ProjectStorageScope,
  entry: ExitJournalEntry,
  incoming: RecoveryWrite,
): Promise<boolean> {
  if (!(await matchesCommittedRecovery(scope, incoming))) return false
  await retireSynchronousRecovery(scope, entry, incoming)
  return true
}

async function retireSynchronousRecovery(
  scope: ProjectStorageScope,
  entry: ExitJournalEntry,
  incoming: RecoveryWrite,
): Promise<void> {
  const key = projectRecoveryKey(incoming.projectId, incoming.head.writer)
  await conditionalWrite(
    scope.store,
    scope.identity,
    conditionalGeneration(scope.identity),
    [key],
    ([current]) => {
      const pending = current as RecoveryWrite | undefined
      if (pending?.head?.token !== entry.token) return { write: {}, result: undefined }
      if (encodeExitJournal(current) !== entry.encoded)
        throw new ExitJournalError(
          'A mesma revisão contém recuperações diferentes. Ambas foram preservadas.',
        )
      return { write: { deletes: [key] }, result: undefined }
    },
  )
  try {
    acknowledgeSynchronousExitJournal(scope.exitJournalStorage, entry)
  } catch (error) {
    console.warn('[studio] cópia confirmada; limpeza de recuperação pendente:', error)
  }
}

/** Replay the same recovery protocol; no competing model, writer or project store. */
export async function recoverSynchronousProjectWrites(
  scope: ProjectStorageScope,
  projectId?: string,
  knownKeys?: readonly IDBValidKey[],
): Promise<string[]> {
  let entries: ExitJournalEntry[]
  try {
    entries = readSynchronousExitJournal(scope.exitJournalStorage, scope.identity, projectId)
  } catch (error) {
    if (projectId) throw error
    console.warn('[studio] cópia de recuperação preservada:', error)
    return (await recoverIndexedProjectWrites(scope, projectId, knownKeys)).recovered
  }
  // A token identifies an immutable revision, not permission to acknowledge a
  // different snapshot. Check every mirror before replay can consume that token.
  for (const entry of entries) {
    const incoming = synchronousRecovery(entry)
    const native = await readValues(scope.store, [
      projectRecoveryKey(incoming.projectId, incoming.head.writer),
    ])
    const candidate = native[0] as RecoveryWrite | undefined
    if (
      candidate?.projectId === incoming.projectId &&
      candidate.head?.writer === incoming.head.writer &&
      candidate.head.token === incoming.head.token &&
      encodeExitJournal(candidate) !== entry.encoded
    )
      throw new ExitJournalError(
        'A mesma revisão contém recuperações diferentes. Ambas foram preservadas.',
      )
  }
  const identity = (entry: ExitJournalEntry) =>
    recoverySourceIdentity({
      key: projectRecoveryKey(entry.projectId, entry.writer),
      token: entry.token,
    })
  const confirmedSources = new Set<string>()
  const pending: ExitJournalEntry[] = []
  for (const entry of entries) {
    try {
      const incoming = synchronousRecovery(entry)
      if (!(await retireMatchingSynchronousRecovery(scope, entry, incoming))) pending.push(entry)
      else if (!incoming.incompleteBlocks)
        for (const source of incoming.replacesRecovery ?? [])
          confirmedSources.add(recoverySourceIdentity(source))
    } catch (error) {
      if (projectId) throw error
      console.warn('[studio] cópia de recuperação preservada:', error)
    }
  }
  entries = []
  for (const entry of pending) {
    if (confirmedSources.has(identity(entry)))
      await retireSynchronousRecovery(scope, entry, synchronousRecovery(entry))
    else entries.push(entry)
  }
  const groups = new Map<string, RecoveryWrite[]>()
  const groupKey = (value: RecoveryWrite) =>
    JSON.stringify([value.projectId, value.head.writer, value.head.base, value.head.sequence])
  const comparable = (value: RecoveryWrite) =>
    encodeExitJournal({ ...value, head: { ...value.head, token: '' } })
  for (const entry of entries) {
    const value = synchronousRecovery(entry)
    const key = groupKey(value)
    const group = groups.get(key) ?? []
    group.push(value)
    groups.set(key, group)
  }
  const ambiguous = new Set<string>()
  const mustCopy = (value: RecoveryWrite) => {
    const key = groupKey(value)
    if (ambiguous.has(key)) return true
    const peers = groups.get(key)
    if (
      peers?.some(
        (peer) => peer.head.token !== value.head.token && comparable(peer) !== comparable(value),
      )
    ) {
      ambiguous.add(key)
      return true
    }
    return false
  }
  const superseded = new Set(
    entries.flatMap((entry) =>
      (synchronousRecovery(entry).replacesRecovery ?? []).map(recoverySourceIdentity),
    ),
  )
  const deferRecovery = (value: RecoveryWrite) =>
    superseded.has(
      recoverySourceIdentity({
        key: projectRecoveryKey(value.projectId, value.head.writer),
        token: value.head.token,
      }),
    )
  const tokens = new Set(entries.map(identity))
  const first = await recoverIndexedProjectWrites(
    scope,
    projectId,
    knownKeys,
    tokens,
    mustCopy,
    deferRecovery,
  )
  const recovered = new Set(first.recovered)
  const consumed = first.consumed
  for (const entry of entries.filter((entry) => !superseded.has(identity(entry)))) {
    try {
      const incoming = synchronousRecovery(entry)
      if (!consumed.has(identity(entry)) && !(await matchesCommittedRecovery(scope, incoming))) {
        const key = projectRecoveryKey(incoming.projectId, incoming.head.writer)
        await conditionalWrite(
          scope.store,
          scope.identity,
          conditionalGeneration(scope.identity),
          [key],
          ([existing]) => {
            if (existing !== undefined && encodeExitJournal(existing) !== entry.encoded)
              throw new ExitJournalError(
                'Outra recuperação deste escritor ainda está pendente. Ambas foram preservadas.',
              )
            return {
              write: existing === undefined ? { puts: [[key, incoming]] } : {},
              result: undefined,
            }
          },
        )
        const next = await recoverIndexedProjectWrites(
          scope,
          incoming.projectId,
          undefined,
          tokens,
          mustCopy,
          deferRecovery,
        )
        for (const id of next.recovered) recovered.add(id)
        for (const token of next.consumed) consumed.add(token)
        if (!consumed.has(identity(entry)))
          throw new ExitJournalError(
            'A cópia de recuperação ainda não pôde ser aplicada. Ela foi preservada.',
          )
      }
      try {
        acknowledgeSynchronousExitJournal(scope.exitJournalStorage, entry)
      } catch (error) {
        console.warn('[studio] cópia confirmada; limpeza de recuperação pendente:', error)
      }
    } catch (error) {
      if (projectId) throw error
      console.warn('[studio] cópia de recuperação preservada:', error)
    }
  }
  for (const entry of entries) {
    if (superseded.has(identity(entry)) && consumed.has(identity(entry)))
      await retireSynchronousRecovery(scope, entry, synchronousRecovery(entry))
  }
  return [...recovered]
}
