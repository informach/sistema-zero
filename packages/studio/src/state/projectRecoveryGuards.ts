import { isDocumentRecord } from '../core/projectDocumentGuards'
import {
  journal,
  latestRecoveries,
  projectFromRecovery,
  type RecoveryWrite,
} from './projectStorageCoordinator'
import {
  PROJECT_RECOVERY_PREFIX,
  PROJECT_STORAGE_VERSION,
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectMetaKey,
  projectRecoveryKey,
  projectStateKey,
  projectThumbKey,
} from './projectStorageKeys'
import { type ExitJournalEntry, ExitJournalError } from './synchronousExitJournal'

export function synchronousRecovery(entry: ExitJournalEntry): RecoveryWrite {
  const recovery = latestRecoveries([entry.value])[0]
  if (
    !recovery ||
    recovery.projectId !== entry.projectId ||
    recovery.head.writer !== entry.writer ||
    recovery.head.token !== entry.token
  )
    throw new ExitJournalError(
      'A identidade da cópia de recuperação é inválida. Ela foi preservada.',
    )
  const knownFields = [
    'version',
    'projectId',
    'head',
    'write',
    'applications',
    'resetApplications',
    'incompleteBlocks',
    'replacesRecovery',
  ]
  if (
    Object.keys(recovery).some((key) => !knownFields.includes(key)) ||
    Object.keys(recovery.head).some(
      (key) => !['version', 'writer', 'token', 'base', 'sequence'].includes(key),
    ) ||
    Object.keys(recovery.write).some((key) => !['puts', 'deletes'].includes(key)) ||
    recovery.head.sequence < 0 ||
    !Array.isArray(recovery.applications) ||
    (recovery.resetApplications === true && recovery.applications.length > 0) ||
    (recovery.resetApplications !== undefined && typeof recovery.resetApplications !== 'boolean') ||
    (recovery.incompleteBlocks !== undefined && typeof recovery.incompleteBlocks !== 'boolean') ||
    (recovery.replacesRecovery !== undefined &&
      (!Array.isArray(recovery.replacesRecovery) ||
        recovery.replacesRecovery.some(
          (source) =>
            !source ||
            typeof source.key !== 'string' ||
            typeof source.token !== 'string' ||
            Object.keys(source).some((key) => key !== 'key' && key !== 'token') ||
            !source.key.startsWith(`${PROJECT_RECOVERY_PREFIX}${entry.projectId}:`),
        )))
  )
    throw new ExitJournalError(
      'O contrato da cópia de recuperação é incompatível. Ela foi preservada.',
    )
  const keys = new Set([
    projectMetaKey(entry.projectId),
    projectFilesKey(entry.projectId),
    projectStateKey(entry.projectId),
    projectBlocksKey(entry.projectId),
    projectAssetsKey(entry.projectId),
    projectThumbKey(entry.projectId),
  ])
  if (
    !Array.isArray(recovery.write.puts) ||
    recovery.write.puts.some(
      (pair) =>
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        typeof pair[0] !== 'string' ||
        !keys.has(pair[0]) ||
        (pair[0] !== projectThumbKey(entry.projectId) &&
          (!isDocumentRecord(pair[1]) || pair[1].id !== entry.projectId)) ||
        (pair[0] === projectMetaKey(entry.projectId) &&
          (!isDocumentRecord(pair[1]) || pair[1].storageVersion !== PROJECT_STORAGE_VERSION)),
    ) ||
    (recovery.write.deletes !== undefined &&
      (!Array.isArray(recovery.write.deletes) ||
        recovery.write.deletes.some((key) => typeof key !== 'string' || !keys.has(key)))) ||
    !projectFromRecovery(recovery)
  )
    throw new ExitJournalError(
      'A cópia de recuperação contém partições incompatíveis ou de outro projeto. Ela foi preservada.',
    )
  const putKeys = recovery.write.puts.map(([key]) => key)
  const deleteKeys = recovery.write.deletes ?? []
  const applications = journal(recovery.applications)
  if (
    new Set(putKeys).size !== putKeys.length ||
    new Set(deleteKeys).size !== deleteKeys.length ||
    deleteKeys.some((key) => putKeys.includes(key)) ||
    new Set(applications.map((record) => record.operationId)).size !== applications.length
  )
    throw new ExitJournalError(
      'A cópia de recuperação contém operações repetidas ou conflitantes. Ela foi preservada.',
    )
  return recovery
}

/** Validate persisted control records before they can mutate any project partition. */
export function nativeRecovery(value: unknown, key: string): RecoveryWrite {
  const record = value as RecoveryWrite | undefined
  if (!record || key !== projectRecoveryKey(record.projectId, record.head?.writer))
    throw new ExitJournalError(
      'A identidade da recuperação nativa é incompatível. Ela foi preservada.',
    )
  return synchronousRecovery({
    key,
    encoded: '',
    value,
    projectId: record.projectId,
    writer: record.head.writer,
    token: record.head.token,
  })
}

/** Identity of the exact staged revision, including its writer and project. */
export function recoverySourceIdentity(
  source: { key: string; token: string },
  projectId: string,
): string {
  return JSON.stringify([projectId, source.key, source.token])
}
