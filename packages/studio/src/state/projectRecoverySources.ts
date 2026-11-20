import { sha256Hex } from '@sistemazero/core/creations'
import { localSnapshotsEqual } from '../project-migrations/localTransaction'
import { v3RecoveryArchiveHolds } from '../project-migrations/localV3RecoveryArchive'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { encodeRecoverySnapshot } from './exitJournalCodec'
import { type IdbWrite, prepareProjectStorageWrite, readValues } from './idbTransaction'
import { nativeRecovery, recoverySourceIdentity } from './projectRecoveryGuards'
import { projectFromRecovery, type RecoveryWrite } from './projectStorageCoordinator'
import {
  PROJECT_STORAGE_VERSION,
  type ProjectStorageVersion,
  projectBackupKey,
  projectRecoveryKey,
} from './projectStorageKeys'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { ExitJournalError } from './synchronousExitJournalProbe'
import { readSynchronousExitJournal } from './synchronousExitJournalRead'

type Source = { key: string; token: string }
export interface PreparedRecoverySources {
  readonly keys: readonly string[]
  readonly puts: NonNullable<IdbWrite['puts']>
  assertUnchanged(staged: unknown, parents: readonly unknown[]): void
  canRetire(source: Source): boolean
}

/**
 * Where an exit copy is archived once a descendant names its token as a recovery source.
 * ⚠️ The migration's archive of a v3 exit copy has its own key (`v3RecoveryArchiveKey`): the
 * two formats must never share one (P1 of the 20/11/2026 review).
 */
export async function recoverySourceArchiveKey(
  projectId: string,
  writer: string,
  token: string,
  version: ProjectStorageVersion = PROJECT_STORAGE_VERSION,
): Promise<string> {
  const digest = await sha256Hex(JSON.stringify([projectId, writer, token]))
  return version === 4
    ? projectBackupKey(projectId, `recovery-${digest}`, 4)
    : `sz:project-backup:${projectId}:recovery-${digest}`
}

/** Validate rare ancestry outside the live CAS; no capture/pagehide work is added. */
export async function prepareRecoverySources(
  scope: ProjectStorageScope,
  incoming: RecoveryWrite,
  sources: readonly Source[],
  stagedKey: string,
  version: ProjectStorageVersion = PROJECT_STORAGE_VERSION,
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
    if (version === 4) {
      try {
        nativeRecovery(entry.value, projectRecoveryKey(entry.projectId, entry.writer, 4), 4)
      } catch {
        // Raw v3 mirrors remain owned and archived by the explicit migration adapter.
        // They do not grant v4 retirement authority merely through a matching token.
        nativeRecovery(entry.value, projectRecoveryKey(entry.projectId, entry.writer, 3), 3)
        continue
      }
    }
    const identity = recoverySourceIdentity(
      {
        key: projectRecoveryKey(entry.projectId, entry.writer, version),
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
  const archives = new Map<string, { record: unknown; source: unknown }>()
  async function validate(value: unknown, source: Source) {
    const parent = nativeRecovery(value, source.key, version)
    if (parent.projectId !== incoming.projectId || parent.head.token !== source.token)
      throw new ExitJournalError(
        'A origem da recuperação não corresponde ao projeto. Ela foi preservada.',
      )
    if (!(await prepareEditableStudioProject(projectFromRecovery(parent, version))))
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
      const parent = nativeRecovery(previous, source.key, version)
      const key = await recoverySourceArchiveKey(
        incoming.projectId,
        parent.head.writer,
        source.token,
        version,
      )
      const encoded = encodeRecoverySnapshot(previous)
      archives.set(key, {
        record: {
          version: 1,
          kind: 'recovery-source',
          projectId: incoming.projectId,
          sourceKey: source.key,
          token: source.token,
          encoding: 'project-json-graph-v1',
          encoded,
          sha256: await sha256Hex(encoded),
        },
        source: previous,
      })
    }
  }
  const archiveKeys = [...archives.keys()]
  const existingArchives = await readValues(scope.store, archiveKeys)
  const puts: Array<[string, unknown]> = []
  const physicalKeys = physical.map((source) => source.key)
  for (const [index, key] of archiveKeys.entries()) {
    const { record: expected, source } = archives.get(key)!
    const existing = existingArchives[index]
    // A browser that migrated before the archive keys were split keeps the v3 archive of this
    // very revision here. It already holds the source (the v4 copy is its projection), so it
    // stays in place as the archive; overwriting it would destroy the original v3 bytes.
    if (
      existing !== undefined &&
      !localSnapshotsEqual(existing, expected) &&
      !(version === 4 && v3RecoveryArchiveHolds(existing, source))
    )
      throw new ExitJournalError(
        'O arquivo desta origem contém outra revisão. Ambas foram preservadas.',
      )
    snapshots.set(key, existing)
    positions.set(key, physicalKeys.length + index)
    if (existing === undefined) puts.push([key, expected])
  }
  const physicalArchive = version === 4 ? await prepareProjectStorageWrite({ puts }) : { puts }
  return {
    keys: [...physicalKeys, ...archiveKeys],
    puts: physicalArchive.puts ?? [],
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
