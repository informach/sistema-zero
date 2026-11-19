import { sha256Hex } from '@sistemazero/core/creations'
import { localSnapshotsEqual } from '../project-migrations/localTransaction'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { encodeRecoverySnapshot } from './exitJournalCodec'
import { readValues } from './idbTransaction'
import { nativeRecovery, recoverySourceIdentity } from './projectRecoveryGuards'
import { projectFromRecovery, type RecoveryWrite } from './projectStorageCoordinator'
import { projectRecoveryKey } from './projectStorageKeys'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { ExitJournalError } from './synchronousExitJournal'
import { readSynchronousExitJournal } from './synchronousExitJournalRead'

type Source = { key: string; token: string }
export interface PreparedRecoverySources {
  readonly keys: readonly string[]
  readonly puts: ReadonlyArray<readonly [string, unknown]>
  assertUnchanged(staged: unknown, parents: readonly unknown[]): void
  canRetire(source: Source): boolean
}

/** Validate rare ancestry outside the live CAS; no capture/pagehide work is added. */
export async function prepareRecoverySources(
  scope: ProjectStorageScope,
  incoming: RecoveryWrite,
  sources: readonly Source[],
  stagedKey: string,
): Promise<PreparedRecoverySources> {
  const keys = [...new Set(sources.map((source) => source.key))]
  const values = await readValues(scope.store, keys)
  const snapshots = new Map(keys.map((key, index) => [key, values[index]]))
  const physical = sources.filter((source) => source.key !== stagedKey)
  const positions = new Map(physical.map((source, index) => [source.key, index]))
  positions.set(stagedKey, -1)
  const mirrors = new Map<string, unknown[]>()
  for (const entry of readSynchronousExitJournal(
    scope.exitJournalStorage,
    scope.identity,
    incoming.projectId,
  )) {
    const identity = recoverySourceIdentity(
      {
        key: projectRecoveryKey(entry.projectId, entry.writer),
        token: entry.token,
      },
      entry.projectId,
    )
    const group = mirrors.get(identity) ?? []
    group.push(entry.value)
    mirrors.set(identity, group)
  }
  const retireable = new Set<string>()
  const checked = new Set<string>()
  const archives = new Map<string, unknown>()
  async function validate(value: unknown, source: Source) {
    const parent = nativeRecovery(value, source.key)
    if (parent.projectId !== incoming.projectId || parent.head.token !== source.token)
      throw new ExitJournalError(
        'A origem da recuperação não corresponde ao projeto. Ela foi preservada.',
      )
    if (!(await prepareEditableStudioProject(projectFromRecovery(parent))))
      throw new ExitJournalError('Uma origem da recuperação não pode ser lida. Ela foi preservada.')
  }
  for (const source of sources) {
    const identity = recoverySourceIdentity(source, incoming.projectId)
    if (checked.has(identity)) continue
    checked.add(identity)
    const value = snapshots.get(source.key)
    const parent = value as RecoveryWrite | undefined
    const nativeMatches =
      parent?.projectId === incoming.projectId && parent.head?.token === source.token
    const copies = mirrors.get(identity) ?? []
    if (nativeMatches) {
      await validate(value, source)
      retireable.add(identity)
    }
    let previous = nativeMatches ? value : undefined
    for (const copy of copies) {
      if (previous !== undefined && !localSnapshotsEqual(previous, copy))
        throw new ExitJournalError(
          'A mesma origem contém recuperações diferentes. Ambas foram preservadas.',
        )
      await validate(copy, source)
      previous = copy
    }
    if (previous !== undefined) {
      const parent = nativeRecovery(previous, source.key)
      const digest = await sha256Hex(
        JSON.stringify([incoming.projectId, parent.head.writer, source.token]),
      )
      const key = `sz:project-backup:${incoming.projectId}:recovery-${digest}`
      const encoded = encodeRecoverySnapshot(previous)
      archives.set(key, {
        version: 1,
        kind: 'recovery-source',
        projectId: incoming.projectId,
        sourceKey: source.key,
        token: source.token,
        encoding: 'project-json-graph-v1',
        encoded,
        sha256: await sha256Hex(encoded),
      })
    }
  }
  const archiveKeys = [...archives.keys()]
  const existingArchives = await readValues(scope.store, archiveKeys)
  const puts: Array<[string, unknown]> = []
  const physicalKeys = physical.map((source) => source.key)
  for (const [index, key] of archiveKeys.entries()) {
    const expected = archives.get(key)
    const existing = existingArchives[index]
    if (existing !== undefined && !localSnapshotsEqual(existing, expected))
      throw new ExitJournalError(
        'O arquivo desta origem contém outra revisão. Ambas foram preservadas.',
      )
    snapshots.set(key, existing)
    positions.set(key, physicalKeys.length + index)
    if (existing === undefined) puts.push([key, expected])
  }
  return {
    keys: [...physicalKeys, ...archiveKeys],
    puts,
    canRetire: (source) => retireable.has(recoverySourceIdentity(source, incoming.projectId)),
    assertUnchanged(staged, parents) {
      for (const [key, expected] of snapshots) {
        const position = positions.get(key)
        const current =
          position === -1 ? staged : position === undefined ? undefined : parents[position]
        if (position === undefined || !localSnapshotsEqual(current, expected))
          throw new ExitJournalError(
            'Uma origem mudou antes da gravação. Sua revisão atual foi preservada.',
          )
      }
    },
  }
}
