import { sha256Hex } from '@sistemazero/core/creations'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { ProjectDocumentError } from '../core/projectDocument'
import { prepareEditableStudioProject } from '../state/editableProjectValidation'
import { readValues } from '../state/idbTransaction'
import { encodeProjectJsonGraph } from '../state/projectJsonGraph'
import { synchronousRecovery } from '../state/projectRecoveryGuards'
import { projectFromRecovery, type RecoveryWrite } from '../state/projectStorageCoordinator'
import { projectRecoveryKey } from '../state/projectStorageKeys'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { encodeProjectStorageValue } from '../state/projectStorageTransport'
import type { ExitJournalEntry } from '../state/synchronousExitJournal'
import { localSnapshotsEqual, promoteLocalMigration } from './localTransaction'
import {
  projectV3RecoveryToV4,
  type V3RecoveryArchive,
  v3RecoveryArchiveKey,
} from './localV3RecoveryArchive'

const pending = (id: string, message: string) =>
  new ProjectDocumentError('migration-pending', message, id)

export interface PreparedV3Recovery {
  original: RecoveryWrite
  projected: RecoveryWrite
  backupKey: string
  archive: V3RecoveryArchive
}

type CapturedScope = Pick<ProjectStorageScope, 'identity' | 'namespace' | 'store'>
const preparedRecoveries = new WeakMap<object, CapturedScope>()
function finishPreparation(prepared: PreparedV3Recovery, scope: CapturedScope): PreparedV3Recovery {
  const stack: object[] = [prepared]
  const visited = new WeakSet<object>()
  while (stack.length) {
    const current = stack.pop()!
    if (visited.has(current)) continue
    visited.add(current)
    Object.freeze(current)
    for (const value of Object.values(current))
      if (value !== null && typeof value === 'object') stack.push(value)
  }
  preparedRecoveries.set(prepared, scope)
  return prepared
}
function assertPrepared(scope: ProjectStorageScope, prepared: PreparedV3Recovery): void {
  const source = preparedRecoveries.get(prepared)
  if (!source)
    throw new ProjectDocumentError(
      'migration-pending',
      'O rascunho precisa ser preparado novamente.',
    )
  if (
    source.identity !== scope.identity ||
    source.namespace !== scope.namespace ||
    source.store !== scope.store
  )
    throw pending(
      prepared.original.projectId,
      'O perfil ou armazenamento mudou. O rascunho foi preservado na origem.',
    )
}

/** Prepare outside the CAS. This neither stages a draft nor acknowledges its source. */
export async function prepareLocalV3Recovery(
  entry: ExitJournalEntry,
  scope: ProjectStorageScope,
): Promise<PreparedV3Recovery> {
  const sourceScope = { identity: scope.identity, namespace: scope.namespace, store: scope.store }
  const captured = copyStudioProjectJson(entry.value)
  const original = synchronousRecovery({ ...entry, value: captured }, 3)
  const id = original.projectId
  if (!(await prepareEditableStudioProject(projectFromRecovery(original, 3))))
    throw pending(id, 'O rascunho antigo não contém um documento completo. Ele foi preservado.')
  const projected = projectV3RecoveryToV4(original)
  synchronousRecovery({ ...entry, value: projected }, 4)
  const encoded = encodeProjectJsonGraph(original)
  return finishPreparation(
    {
      original,
      projected,
      backupKey: await v3RecoveryArchiveKey(id, original.head.writer, original.head.token),
      archive: {
        version: 1,
        sourceVersion: 3,
        projectId: id,
        writer: original.head.writer,
        token: original.head.token,
        sha256: await sha256Hex(encoded),
        encoded,
      },
    },
    sourceScope,
  )
}

/** Immutable source archive in the existing database/queue; never deletes or acknowledges. */
export async function archiveLocalV3Recovery(
  scope: ProjectStorageScope,
  prepared: PreparedV3Recovery,
  nativeSource = false,
): Promise<void> {
  assertPrepared(scope, prepared)
  const { backupKey, archive, original } = prepared
  const [existing] = await readValues(scope.store, [backupKey])
  if (existing !== undefined && !localSnapshotsEqual(existing, archive))
    throw pending(
      original.projectId,
      'A identidade deste rascunho já guarda outro conteúdo. Ambos foram preservados.',
    )
  const expected: Array<[string, unknown]> = [[backupKey, existing]]
  if (nativeSource)
    expected.push([projectRecoveryKey(original.projectId, original.head.writer, 3), original])
  if (
    !(await promoteLocalMigration(
      scope.store,
      expected,
      existing === undefined ? { puts: [[backupKey, archive]] } : {},
      scope.identity,
    ))
  )
    throw pending(
      original.projectId,
      'O rascunho mudou durante o arquivo de segurança. A fonte atual foi preservada.',
    )
}

/** Stage in the existing v4 journal and archive atomically. Sources are still retained. */
export async function stageLocalV3Recovery(
  scope: ProjectStorageScope,
  prepared: PreparedV3Recovery,
  nativeSource = false,
): Promise<void> {
  assertPrepared(scope, prepared)
  const { original, projected, backupKey, archive } = prepared
  const key = projectRecoveryKey(original.projectId, original.head.writer, 4)
  const [previousArchive, previousDraft] = await readValues(scope.store, [backupKey, key])
  if (previousArchive !== undefined && !localSnapshotsEqual(previousArchive, archive))
    throw pending(
      original.projectId,
      'A identidade deste rascunho já guarda outro conteúdo. Ambos foram preservados.',
    )
  if (previousDraft !== undefined && !localSnapshotsEqual(previousDraft, projected))
    throw pending(
      original.projectId,
      'Outra revisão deste escritor está pendente. Ambas foram preservadas.',
    )
  const expected: Array<[string, unknown]> = [
    [backupKey, previousArchive],
    [key, previousDraft],
  ]
  if (nativeSource)
    expected.push([projectRecoveryKey(original.projectId, original.head.writer, 3), original])
  // Encoding may traverse a large graph. Complete it before the active CAS transaction.
  const puts: Array<[string, unknown]> = []
  if (previousArchive === undefined)
    puts.push([backupKey, encodeProjectStorageValue(backupKey, archive)])
  if (previousDraft === undefined) puts.push([key, encodeProjectStorageValue(key, projected)])
  if (!(await promoteLocalMigration(scope.store, expected, { puts }, scope.identity)))
    throw pending(
      original.projectId,
      'O rascunho mudou antes do enfileiramento. A fonte atual foi preservada.',
    )
}
