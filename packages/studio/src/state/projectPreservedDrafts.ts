import { PROJECT_RECOVERY_PREFIX } from './projectStorageKeys'
import type { ProjectStorageScope } from './projectStorageRuntime'

/** Listing needs only this gate; full recovery and document writers remain lazy. */
export async function listPreservedProjectDrafts(
  scope: ProjectStorageScope,
  knownKeys: readonly IDBValidKey[],
) {
  if (!knownKeys.some((key) => typeof key === 'string' && key.startsWith(PROJECT_RECOVERY_PREFIX)))
    return []
  const recovery = await import('./projectIndexedRecovery')
  return recovery.listPreservedProjectDrafts(scope, knownKeys)
}
