import type { EditableStudioProject } from '../core/editableProject'
import { conditionalGeneration, conditionalWrite, readAllKeys, readValues } from './idbTransaction'
import {
  commitProjectRecovery,
  journal,
  latestRecoveries,
  projectFromRecovery,
  type RecoveryWrite,
} from './projectStorageCoordinator'
import {
  PROJECT_RECOVERY_PREFIX,
  projectHeadKey,
  projectMetaKey,
  projectMigrationKey,
  projectRecoveryKey,
} from './projectStorageKeys'
import { projectStorageEntries } from './projectStorageRecords'
import {
  acceptsLocalHead,
  installLocalRevision,
  isLocalHead,
  ProjectWriteConflict,
  readLocalRevision,
  type LocalHead,
} from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { toProjectSummary } from './projectSummary'

/** Kept when conflicting; recovery never replaces a newer writer's document. */
export async function recoverIndexedProjectWrites(
  scope: ProjectStorageScope,
  projectId?: string,
  knownKeys?: readonly IDBValidKey[],
  synchronousTokens: ReadonlySet<string> = new Set(),
  mustCopy?: (recovery: RecoveryWrite) => boolean,
  deferRecovery?: (recovery: RecoveryWrite) => boolean,
): Promise<{ recovered: string[]; consumed: Set<string> }> {
  const keys = (knownKeys ?? (await readAllKeys(scope.store))).filter(
    (key): key is string =>
      typeof key === 'string' &&
      key.startsWith(
        projectId ? `${PROJECT_RECOVERY_PREFIX}${projectId}:` : PROJECT_RECOVERY_PREFIX,
      ),
  )
  const values = await readValues(scope.store, keys)
  if (!keys.length) return { recovered: [], consumed: new Set() }
  const { nativeRecovery, recoverySourceIdentity } = await import('./projectRecoveryGuards')
  const { localSnapshotsEqual } = await import('../project-migrations/localTransaction')
  const { prepareEditableStudioProject } = await import('./editableProjectValidation')
  const valid: RecoveryWrite[] = []
  for (const [index, value] of values.entries()) {
    try {
      const recovery = nativeRecovery(value, keys[index]!)
      // Validate the whole document before promoting raw partitions over a
      // readable save. Preparation runs outside the conditional transaction.
      if (await prepareEditableStudioProject(projectFromRecovery(recovery))) valid.push(recovery)
    } catch {
      // Keep incompatible originals pending; never execute their writes.
    }
  }
  const recovered: string[] = []
  const consumed = new Set<string>()
  const sourceOf = (recovery: RecoveryWrite) =>
    recoverySourceIdentity({
      key: projectRecoveryKey(recovery.projectId, recovery.head.writer),
      token: recovery.head.token,
    })
  const confirmed = (recovery: RecoveryWrite) => {
    consumed.add(sourceOf(recovery))
    if (!recovery.incompleteBlocks)
      for (const source of recovery.replacesRecovery ?? [])
        consumed.add(recoverySourceIdentity(source))
  }
  for (const recovery of latestRecoveries(valid)) {
    if (deferRecovery?.(recovery)) continue
    try {
      if (mustCopy?.(recovery)) throw new ProjectWriteConflict()
      await commitProjectRecovery(
        scope,
        recovery,
        conditionalGeneration(scope.identity),
        synchronousTokens.has(sourceOf(recovery)),
        (stored) => localSnapshotsEqual(stored, recovery),
      )
      recovered.push(recovery.projectId)
      confirmed(recovery)
    } catch (error) {
      // One failed recovery (quota, incompatible journal or corrupt draft) must not
      // prevent access to the committed document or the rest of the profile.
      if (error instanceof ProjectWriteConflict) {
        try {
          const copied = await copyConflictingRecovery(scope, recovery)
          if (copied) recovered.push(copied)
          const [remaining] = await readValues(scope.store, [
            projectRecoveryKey(recovery.projectId, recovery.head.writer),
          ])
          if (copied) confirmed(recovery)
          else if (remaining === undefined) consumed.add(sourceOf(recovery))
        } catch {
          /* The complete original draft stays in its recovery partition. */
        }
      }
    }
  }
  return { recovered, consumed }
}

/** Editor-only fallback. Cloud/export-by-ID continue reading the committed document. */
export async function loadRecoverableProjectDraft(
  scope: ProjectStorageScope,
  id: string,
): Promise<EditableStudioProject | null> {
  const keys = (await readAllKeys(scope.store)).filter(
    (key): key is string =>
      typeof key === 'string' && key.startsWith(`${PROJECT_RECOVERY_PREFIX}${id}:`),
  )
  if (!keys.length) return null
  const [rawHead, ...records] = await readValues(scope.store, [projectHeadKey(id), ...keys])
  const head = isLocalHead(rawHead) ? rawHead : undefined
  const { nativeRecovery } = await import('./projectRecoveryGuards')
  const valid = records.filter((value, index) => {
    try {
      nativeRecovery(value, keys[index]!)
      return true
    } catch {
      return false
    }
  })
  const eligible = latestRecoveries(valid).filter(
    (draft) =>
      !draft.incompleteBlocks &&
      (head?.token === draft.head.token || acceptsLocalHead(head, draft.head)),
  )
  if (eligible.length !== 1) return null // Never choose between competing writers silently.
  const draft = eligible[0]!
  try {
    const raw = projectFromRecovery(draft)
    const { prepareEditableStudioProject } = await import('./editableProjectValidation')
    const project = raw && (await prepareEditableStudioProject(raw))
    if (!project) return null
    installLocalRevision(project, scope.identity, head)
    const stamp = readLocalRevision(project)!
    stamp.lineage.recovery = true
    stamp.lineage.recoverySources = [
      ...(draft.replacesRecovery ?? []),
      { key: projectRecoveryKey(id, draft.head.writer), token: draft.head.token },
    ]
    for (const record of journal(draft.applications))
      stamp.lineage.pending.set(record.operationId, { sequence: stamp.sequence, record })
    return project
  } catch {
    return null
  }
}

export async function listPreservedProjectDrafts(
  scope: ProjectStorageScope,
  knownKeys: readonly IDBValidKey[],
) {
  const keys = knownKeys.filter(
    (key): key is string => typeof key === 'string' && key.startsWith(PROJECT_RECOVERY_PREFIX),
  )
  const records = await readValues(scope.store, keys)
  return records.flatMap((value) => {
    const draft = value as RecoveryWrite | undefined
    if (draft?.version !== 1 || !Array.isArray(draft.write?.puts)) return []
    const project = projectFromRecovery(draft)
    if (!project) return []
    const summary = toProjectSummary(project.id, project)
    if (!summary) return []
    return [
      {
        ...summary,
        hasPreservedEdit: true as const,
        ...(draft.incompleteBlocks ? { migrationPending: true as const } : {}),
      },
    ]
  })
}

/** Complete conflicting drafts become a new document, never a merge into the winner. */
async function copyConflictingRecovery(
  scope: ProjectStorageScope,
  recovery: RecoveryWrite,
): Promise<string | undefined> {
  if (recovery.incompleteBlocks) return
  const { localSnapshotsEqual } = await import('../project-migrations/localTransaction')
  const source = recovery.projectId
  const raw = projectFromRecovery(recovery)
  if (!raw) return
  const { prepareEditableStudioProject } = await import('./editableProjectValidation')
  const project = await prepareEditableStudioProject(raw)
  if (!project) return
  const id = `recuperado-${source.slice(0, 28)}-${recovery.head.token.replaceAll('-', '').slice(0, 24)}`
  const copy = { ...project, id, name: `${project.name.slice(0, 176)} (edição recuperada)` }
  const stagedKey = projectRecoveryKey(source, recovery.head.writer)
  const sources = (recovery.replacesRecovery ?? []).filter(
    (entry) =>
      entry.key.startsWith(`${PROJECT_RECOVERY_PREFIX}${source}:`) && entry.key !== stagedKey,
  )
  return conditionalWrite(
    scope.store,
    scope.identity,
    conditionalGeneration(scope.identity),
    [
      stagedKey,
      projectMetaKey(id),
      projectHeadKey(id),
      projectMigrationKey(id),
      ...sources.map((entry) => entry.key),
    ],
    ([latest, existing, targetHead, provenance, ...ancestors]) => {
      const draft = latest as RecoveryWrite | undefined
      if (draft?.head.token !== recovery.head.token || !localSnapshotsEqual(draft, recovery))
        return { write: {}, result: undefined }
      // An inconsistent live head cannot stand in for a recovered document.
      if (!existing && targetHead && !(isLocalHead(targetHead) && targetHead.deleted))
        return { write: {}, result: undefined }
      // Keep inverse patches and all source journal fields with the recovered copy.
      const archived = provenance as { exitRecovery?: RecoveryWrite } | undefined
      if (
        archived?.exitRecovery?.head.token === recovery.head.token &&
        !localSnapshotsEqual(archived.exitRecovery, recovery)
      )
        return { write: {}, result: undefined }
      if (
        existing &&
        !(isLocalHead(targetHead) && targetHead.deleted) &&
        archived?.exitRecovery?.head.token !== recovery.head.token
      )
        return { write: {}, result: undefined }
      const deletes = [
        stagedKey,
        ...sources.flatMap((entry, index) =>
          (ancestors[index] as RecoveryWrite | undefined)?.head.token === entry.token
            ? [entry.key]
            : [],
        ),
      ]
      return {
        write: {
          puts:
            existing || targetHead
              ? []
              : [
                  ...projectStorageEntries(copy),
                  [projectMigrationKey(id), { exitRecovery: recovery }],
                  [
                    projectHeadKey(id),
                    {
                      version: 1,
                      token: crypto.randomUUID(),
                      writer: '',
                      base: null,
                      sequence: 0,
                    } satisfies LocalHead,
                  ],
                ],
          deletes,
        },
        result: isLocalHead(targetHead) && targetHead.deleted ? undefined : id,
      }
    },
  )
}
