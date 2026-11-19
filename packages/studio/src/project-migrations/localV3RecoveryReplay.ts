import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import { readAllKeys, readValues } from '../state/idbTransaction'
import { encodeProjectJsonGraph } from '../state/projectJsonGraph'
import { nativeRecovery, synchronousRecovery } from '../state/projectRecoveryGuards'
import { projectRecoveryKey, projectRecoveryPrefix } from '../state/projectStorageKeys'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { recoverSynchronousProjectWrites } from '../state/projectSynchronousExitRecovery'
import {
  acknowledgeSynchronousExitJournal,
  type ExitJournalEntry,
} from '../state/synchronousExitJournal'
import { readSynchronousExitJournal } from '../state/synchronousExitJournalRead'
import { localSnapshotsEqual, promoteLocalMigration } from './localTransaction'
import { migrateLocalV3Project } from './localV3'
import { archiveLocalV3Recovery, prepareLocalV3Recovery } from './localV3Recovery'

interface Source {
  entry: ExitJournalEntry
  native: boolean
  synchronous?: ExitJournalEntry
}

const identity = (entry: ExitJournalEntry) =>
  JSON.stringify([entry.projectId, entry.writer, entry.token])
const pending = (id: string, message: string) =>
  new ProjectDocumentError('migration-pending', message, id)

function isLegacy(entry: ExitJournalEntry): boolean {
  const value = entry.value
  if (!isDocumentRecord(value) || !isDocumentRecord(value.write)) return false
  const puts = value.write.puts
  return (
    Array.isArray(puts) &&
    puts.some(
      (pair) =>
        Array.isArray(pair) && typeof pair[0] === 'string' && pair[0].startsWith('sz:v3:project-'),
    )
  )
}

/** Read support precedes activation: consumes v3 sources only after confirmed v4 replay. */
export async function recoverLocalV3ProjectWrites(
  sourceScope: ProjectStorageScope,
  projectId?: string,
  knownKeys?: readonly IDBValidKey[],
): Promise<string[]> {
  // Every awaited operation keeps the original profile/backend, even if the UI changes.
  const scope = Object.freeze({ ...sourceScope })
  const sources = new Map<string, Source>()
  const current: ExitJournalEntry[] = []
  for (const entry of readSynchronousExitJournal(
    scope.exitJournalStorage,
    scope.identity,
    projectId,
  )) {
    if (!isLegacy(entry)) {
      synchronousRecovery(entry, 4)
      current.push(entry)
      continue
    }
    synchronousRecovery(entry, 3)
    sources.set(identity(entry), { entry, native: false, synchronous: entry })
  }
  const prefix = projectId ? `${projectRecoveryPrefix(3)}${projectId}:` : projectRecoveryPrefix(3)
  const keys = (knownKeys ?? (await readAllKeys(scope.store))).filter(
    (key): key is string => typeof key === 'string' && key.startsWith(prefix),
  )
  const values = await readValues(scope.store, keys)
  // Missing is different from an existing record whose invalid payload is undefined.
  const stillPresent = values.some((value) => value === undefined)
    ? new Set(await readAllKeys(scope.store))
    : undefined
  for (const [index, value] of values.entries()) {
    // Captured keys may outlive a journal consumed by another replay/tab.
    if (value === undefined && !stillPresent?.has(keys[index]!)) continue
    const recovery = nativeRecovery(value, keys[index]!, 3)
    if (projectId !== undefined && recovery.projectId !== projectId) continue
    const entry: ExitJournalEntry = {
      key: keys[index]!,
      value,
      encoded: encodeProjectJsonGraph(value),
      projectId: recovery.projectId,
      writer: recovery.head.writer,
      token: recovery.head.token,
    }
    const previous = sources.get(identity(entry))
    if (previous && !localSnapshotsEqual(previous.entry.value, value))
      throw pending(
        entry.projectId,
        'A mesma revisão guarda rascunhos diferentes. Ambos foram preservados.',
      )
    sources.set(identity(entry), { ...previous, entry: previous?.entry ?? entry, native: true })
  }
  // Validate/capture every source before migrating a base or writing an archive.
  const prepared = []
  for (const source of sources.values())
    prepared.push({ source, recovery: await prepareLocalV3Recovery(source.entry, scope) })
  const changed = new Set<string>()
  for (const id of new Set(prepared.map(({ source }) => source.entry.projectId))) {
    const target = await migrateLocalV3Project(id, scope)
    if (target) changed.add(target)
  }
  const origins = new Map<ExitJournalEntry, (typeof prepared)[number]>()
  for (const origin of prepared) {
    const { source, recovery } = origin
    await archiveLocalV3Recovery(scope, recovery, source.native)
    const entry = { ...source.entry, value: recovery.projected }
    origins.set(entry, origin)
    current.push(entry)
  }
  const recovered = await recoverSynchronousProjectWrites(scope, projectId, undefined, {
    version: 4,
    entries: current,
    acknowledge: async (entry) => {
      const origin = origins.get(entry)
      if (!origin) {
        acknowledgeSynchronousExitJournal(scope.exitJournalStorage, entry)
        return
      }
      const { source, recovery } = origin
      const key = projectRecoveryKey(entry.projectId, entry.writer, 3)
      const [archive, native] = await readValues(scope.store, [recovery.backupKey, key])
      if (
        !localSnapshotsEqual(archive, recovery.archive) ||
        (source.native && native !== undefined && !localSnapshotsEqual(native, recovery.original))
      )
        throw pending(entry.projectId, 'A fonte antiga mudou. Sua nova revisão foi preservada.')
      const expected: Array<[IDBValidKey, unknown]> = [[recovery.backupKey, archive]]
      if (source.native) expected.push([key, native])
      if (
        !(await promoteLocalMigration(
          scope.store,
          expected,
          source.native && native !== undefined ? { deletes: [key] } : {},
          scope.identity,
        ))
      )
        throw pending(entry.projectId, 'A fonte mudou durante a confirmação. Ela foi preservada.')
      if (source.synchronous)
        acknowledgeSynchronousExitJournal(scope.exitJournalStorage, source.synchronous)
    },
  })
  for (const id of recovered) changed.add(id)
  return [...changed]
}
