import { sha256Hex } from '@sistemazero/core/creations'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import { prepareEditableStudioProject } from '../state/editableProjectValidation'
import { readValues } from '../state/idbTransaction'
import { encodeProjectJsonGraph } from '../state/projectJsonGraph'
import { synchronousRecovery } from '../state/projectRecoveryGuards'
import { projectFromRecovery, type RecoveryWrite } from '../state/projectStorageCoordinator'
import {
  projectAssetsKey,
  projectBackupKey,
  projectBlocksKey,
  projectFilesKey,
  projectMetaKey,
  projectRecoveryKey,
  projectStateKey,
  projectThumbKey,
} from '../state/projectStorageKeys'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import type { ExitJournalEntry } from '../state/synchronousExitJournal'
import { localSnapshotsEqual, promoteLocalMigration } from './localTransaction'

const pending = (id: string, message: string) =>
  new ProjectDocumentError('migration-pending', message, id)

export interface PreparedV3Recovery {
  original: RecoveryWrite
  projected: RecoveryWrite
  backupKey: string
  archive: {
    version: 1
    sourceVersion: 3
    projectId: string
    writer: string
    token: string
    sha256: string
    encoded: string
  }
}

/** Prepare outside the CAS. This neither stages a draft nor acknowledges its source. */
export async function prepareLocalV3Recovery(entry: ExitJournalEntry): Promise<PreparedV3Recovery> {
  const captured = copyStudioProjectJson(entry.value)
  const original = synchronousRecovery({ ...entry, value: captured }, 3)
  const id = original.projectId
  if (!(await prepareEditableStudioProject(projectFromRecovery(original, 3))))
    throw pending(id, 'O rascunho antigo não contém um documento completo. Ele foi preservado.')
  const keyFunctions = [
    projectMetaKey,
    projectFilesKey,
    projectStateKey,
    projectBlocksKey,
    projectAssetsKey,
    projectThumbKey,
  ]
  const mapping = new Map(keyFunctions.map((key) => [key(id, 3), key(id, 4)]))
  const projected: RecoveryWrite = {
    ...original,
    head: { ...original.head },
    write: {
      puts: original.write.puts!.map(([key, value]) => {
        if (key !== projectThumbKey(id, 3) && (!isDocumentRecord(value) || value.id !== id))
          throw pending(
            id,
            'Uma partição do rascunho pertence a outro projeto. O original foi preservado.',
          )
        if (key === projectMetaKey(id, 3)) {
          if (!isDocumentRecord(value) || value.storageVersion !== 3)
            throw pending(
              id,
              'O layout do rascunho antigo é incompatível. O original foi preservado.',
            )
          value = { ...value, storageVersion: 4 }
        }
        return [mapping.get(String(key))!, value]
      }),
      ...(original.write.deletes
        ? { deletes: original.write.deletes.map((key) => mapping.get(String(key))!) }
        : {}),
    },
    ...(original.replacesRecovery
      ? {
          replacesRecovery: original.replacesRecovery.map((source) => ({
            ...source,
            key: projectRecoveryKey(id, source.key.slice(projectRecoveryKey(id, '', 3).length), 4),
          })),
        }
      : {}),
  }
  synchronousRecovery({ ...entry, value: projected }, 4)
  const encoded = encodeProjectJsonGraph(original)
  const identityHash = await sha256Hex(
    JSON.stringify([id, original.head.writer, original.head.token]),
  )
  return {
    original,
    projected,
    backupKey: projectBackupKey(id, `recovery-${identityHash}`, 4),
    archive: {
      version: 1,
      sourceVersion: 3,
      projectId: id,
      writer: original.head.writer,
      token: original.head.token,
      sha256: await sha256Hex(encoded),
      encoded,
    },
  }
}

/** Immutable source archive in the existing database/queue; never deletes or acknowledges. */
export async function archiveLocalV3Recovery(
  scope: ProjectStorageScope,
  prepared: PreparedV3Recovery,
  nativeSource = false,
): Promise<void> {
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
