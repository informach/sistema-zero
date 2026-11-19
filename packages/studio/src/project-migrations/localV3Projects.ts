import { sha256Hex } from '@sistemazero/core/creations'
import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import { readAllKeys, readValue, readValues } from '../state/idbTransaction'
import { nativeRecovery } from '../state/projectRecoveryGuards'
import { recoverProjectWrites } from '../state/projectStorageCoordinator'
import {
  localV3BaseIds,
  PROJECT_RECOVERY_PREFIX,
  PROJECT_STORAGE_VERSION,
  projectMetaKey,
  projectRecoveryKey,
  projectRecoveryPrefix,
} from '../state/projectStorageKeys'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'
import { type ProjectSummary, toProjectSummary } from '../state/projectSummary'
import { hasSynchronousExitJournal } from '../state/synchronousExitJournal'
import { synchronousExitProjectIds } from '../state/synchronousExitJournalRead'
import { migrateLocalProjects } from './localProjects'
import { migrateLocalV3Project } from './localV3'
import { recoverLocalV3ProjectWrites } from './localV3RecoveryReplay'

export { localV3BaseIds } from '../state/projectStorageKeys'

/** Batch adapter over the existing per-project CAS; no second migration protocol. */
export async function migrateLocalV3Projects(
  sourceScope: ProjectStorageScope,
  knownKeys?: readonly IDBValidKey[],
  projectId?: string,
): Promise<{ changed: string[]; pending: ProjectSummary[] }> {
  const scope = Object.freeze({ ...sourceScope })
  const ids = localV3BaseIds(knownKeys ?? (await readAllKeys(scope.store))).filter(
    (id) => projectId === undefined || id === projectId,
  )
  const changed: string[] = []
  const pending: ProjectSummary[] = []
  for (const id of ids) {
    try {
      const target = await migrateLocalV3Project(id, scope)
      if (target) changed.push(target)
    } catch (error) {
      // Opening must never fall back to a stale historical copy after a failed cut.
      if (projectId !== undefined) throw error
      const meta = await readValue(scope.store, projectMetaKey(id, 3))
      pending.push({
        ...(toProjectSummary(id, meta) ?? toProjectSummary(id, { name: 'Projeto preservado' }))!,
        migrationPending: true,
        hasPreservedEdit: true,
      })
    }
  }
  return { changed, pending }
}

/** Prepare the existing v4 reader; all writes still use the established migration/replay CAS. */
export async function prepareLocalV4ProjectReads(
  sourceScope: ProjectStorageScope,
  knownKeys?: readonly IDBValidKey[],
  projectId?: string,
): Promise<{ changed: string[]; pending: ProjectSummary[] }> {
  const scope = Object.freeze({ ...sourceScope })
  const keys = knownKeys ?? (await readAllKeys(scope.store))
  const bases = await migrateLocalV3Projects(scope, keys, projectId)
  const changed = new Set(bases.changed)
  const pending = [...bases.pending]
  const blocked = new Set(pending.map((item) => item.id))
  const candidates = new Set<string>(projectId === undefined ? [] : [projectId])
  const malformed = new Set<string>()
  const unidentified = new Set<string>()
  if (projectId === undefined)
    for (const id of synchronousExitProjectIds(scope.exitJournalStorage, scope.identity))
      candidates.add(id)
  const metadataIds = new Set(
    keys.flatMap((key) => {
      if (typeof key !== 'string') return []
      const match = /^sz:v[34]:project-(?:meta|head):(.+)$/.exec(key)
      return match ? [match[1]!] : []
    }),
  )
  let present: Set<IDBValidKey> | undefined
  for (const key of keys) {
    if (typeof key !== 'string') continue
    const version = ([3, 4] as const).find((value) => key.startsWith(projectRecoveryPrefix(value)))
    if (!version) continue
    if (projectId !== undefined) {
      // Point reads already validate payload ownership in replay. Only a bare malformed
      // key needs routing here, because it cannot match a valid writer prefix.
      if (key === `${projectRecoveryPrefix(version)}${projectId}`) malformed.add(projectId)
      continue
    }
    let value: unknown
    try {
      value = await readValue(scope.store, key)
      if (value === undefined) {
        present ??= new Set(await readAllKeys(scope.store))
        if (!present.has(key)) continue
      }
      candidates.add(nativeRecovery(value, key, version).projectId)
      continue
    } catch {
      /* Unsupported bytes remain untouched and are described as pending below. */
    }
    let owners: string[] = []
    if (
      isDocumentRecord(value) &&
      typeof value.projectId === 'string' &&
      isDocumentRecord(value.head) &&
      typeof value.head.writer === 'string' &&
      key === projectRecoveryKey(value.projectId, value.head.writer, version)
    )
      owners = [value.projectId]
    if (!owners.length)
      owners = [...metadataIds].filter(
        (id) =>
          key.startsWith(projectRecoveryKey(id, '', version)) ||
          key === `${projectRecoveryPrefix(version)}${id}`,
      )
    if (!owners.length) {
      const id = `recuperacao-${(await sha256Hex(key)).slice(0, 24)}`
      owners = [id]
      unidentified.add(id)
    }
    for (const id of owners) {
      // A quarantined routing candidate never grants permission to consume a source.
      candidates.add(id)
      malformed.add(id)
    }
  }
  for (const id of candidates) {
    if (blocked.has(id)) continue
    try {
      if (malformed.has(id))
        throw new ProjectDocumentError(
          'migration-pending',
          'Há uma recuperação de outra versão. Ela foi preservada.',
          id,
        )
      for (const target of await recoverLocalV3ProjectWrites(scope, id)) changed.add(target)
    } catch (error) {
      if (projectId !== undefined) throw error
      let metadata: unknown[] = []
      try {
        metadata = await readValues(scope.store, [projectMetaKey(id, 4), projectMetaKey(id, 3)])
      } catch {
        /* Unreadable transport remains pending, never a reason to discard its source. */
      }
      const summary = metadata
        .map((value) =>
          isDocumentRecord(value) && value.id === id ? toProjectSummary(id, value) : null,
        )
        .find(Boolean)
      const fallback: ProjectSummary = {
        id,
        name: unidentified.has(id) ? 'Recuperação preservada' : 'Projeto preservado',
        createdAt: 0,
        updatedAt: 0,
        mode: 'blocks',
        programmingLanguage: 'unknown',
      }
      pending.push({
        ...(summary ?? fallback),
        migrationPending: true,
        hasPreservedEdit: true,
      })
    }
  }
  return { changed: [...changed], pending }
}

/** Prepare only lists with historical or pending sources, without hydrating current documents. */
export async function prepareLocalProjectList(
  scope: ProjectStorageScope,
  knownKeys: readonly IDBValidKey[],
) {
  const kvStore = scope.store
  let allKeys = [...knownKeys]
  const pending: ProjectSummary[] = []
  const changed: string[] = []
  let blockedReads: Set<string> | undefined
  const needsRecovery =
    hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity) ||
    allKeys.some((key) => typeof key === 'string' && key.startsWith(PROJECT_RECOVERY_PREFIX))
  if (
    PROJECT_STORAGE_VERSION === 4 &&
    (needsRecovery ||
      localV3BaseIds(allKeys).length ||
      allKeys.some((key) => typeof key === 'string' && key.startsWith(projectRecoveryPrefix(3))))
  ) {
    const prepared = await prepareLocalV4ProjectReads(scope, allKeys)
    changed.push(...prepared.changed)
    pending.push(...prepared.pending)
    blockedReads = new Set(pending.map((item) => item.id))
    allKeys = await readAllKeys(kvStore)
  } else if (needsRecovery) {
    changed.push(...(await recoverProjectWrites(scope, undefined, allKeys)))
    allKeys = await readAllKeys(kvStore)
  }
  if (
    allKeys.some(
      (key) =>
        typeof key === 'string' &&
        /^sz:(?:v2:)?project(?:-(?:meta|files|state|blocks|assets))?:/.test(key),
    )
  ) {
    // A blocked newer source must not cause an older layout to become the current document.
    const historicalKeys = blockedReads?.size
      ? allKeys.filter((key) => {
          if (typeof key !== 'string') return true
          const match =
            /^sz:(?:v2:)?project(?:-(?:meta|files|state|blocks|assets|thumb))?:(.+)$/.exec(key)
          return !match || !blockedReads!.has(match[1]!)
        })
      : allKeys
    const migrated = await migrateLocalProjects(scope, historicalKeys)
    changed.push(...migrated.changed)
    allKeys = await readAllKeys(kvStore)
    pending.push(...migrated.pending)
  }
  return { keys: allKeys, pending, blockedReads, changed }
}
