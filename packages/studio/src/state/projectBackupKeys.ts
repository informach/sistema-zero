import { projectBackupKey } from './projectStorageKeys'

const LEGACY_BACKUP_PREFIX = 'sz:project-backup:'

export function backupPrefixes(projectId: string): string[] {
  return [projectBackupKey(projectId, '', 4), `${LEGACY_BACKUP_PREFIX}${projectId}:`]
}

/**
 * O resto da chave depois de `<família>:<id>:`: o SHA-256 em hexadecimal, com `recovery-` ou
 * `v3-recovery-` na frente nas cópias de saída. Todo produtor de cópia monta a chave assim
 * (`localProjects.ts`, `localV3.ts`, `localV3RecoveryArchive.ts`, `projectRecoverySources.ts`).
 * Um resto com dois-pontos é de outro projeto cujo id começa com este (`jogo:outro`).
 */
export const BACKUP_KEY_SUFFIX = /^(?:recovery-|v3-recovery-)?[0-9a-f]{64}$/
