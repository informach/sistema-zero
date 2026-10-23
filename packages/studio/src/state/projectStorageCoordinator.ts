import type { EditableStudioProject } from '../core/editableProject'
import {
  conditionalGeneration,
  conditionalWrite,
  type IdbWrite,
  interruptConditionalTransactions,
  readAllKeys,
  readValues,
  writeInOneTransaction,
} from './idbTransaction'
import {
  APPLICATION_BUDGET_KEY,
  PROJECT_RECOVERY_PREFIX,
  projectApplicationsKey,
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectRecoveryKey,
  projectStateKey,
} from './projectStorageKeys'
import {
  assembleProjectRecord,
  projectStorageEntries,
  type StoredProjectRecord,
} from './projectStorageRecords'
import {
  acceptsLocalHead,
  installLocalRevision,
  isLocalHead,
  type LocalHead,
  localHead,
  type ProApplicationRecord,
  ProjectWriteConflict,
  readLocalRevision,
} from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { toProjectSummary } from './projectSummary'

export const PRO_APPLICATION_LIMITS = Object.freeze({
  operations: 20,
  projectBytes: 8 * 1024 * 1024,
  profileBytes: 32 * 1024 * 1024,
})
interface RecoveryWrite {
  version: 1
  projectId: string
  head: LocalHead
  write: IdbWrite
  applications: ProApplicationRecord[]
  resetApplications?: boolean
  incompleteBlocks?: boolean
  replacesRecovery?: Array<{ key: string; token: string }>
}
/** A descendant names the exact staged token it supersedes; unrelated writers remain separate. */
function latestRecoveries(values: readonly unknown[]): RecoveryWrite[] {
  const candidates = values.filter((value): value is RecoveryWrite => {
    const draft = value as RecoveryWrite | undefined
    return Boolean(
      draft?.version === 1 &&
        typeof draft.projectId === 'string' &&
        isLocalHead(draft.head) &&
        Array.isArray(draft.write?.puts),
    )
  })
  return candidates.filter(
    (draft) =>
      !candidates.some(
        (other) =>
          other !== draft &&
          other.projectId === draft.projectId &&
          other.replacesRecovery?.some(
            (source) =>
              source.key === projectRecoveryKey(draft.projectId, draft.head.writer) &&
              source.token === draft.head.token,
          ),
      ),
  )
}
type Budget = Record<string, number>
const snapshotTokens = new WeakMap<{ id: string }, string>()

function journal(value: unknown): ProApplicationRecord[] {
  if (value === undefined) return []
  if (
    !Array.isArray(value) ||
    value.some(
      (r) =>
        r?.version !== 1 ||
        !['editor', 'zappy'].includes(r.source) ||
        typeof r.operationId !== 'string' ||
        typeof r.bytes !== 'number',
    )
  )
    throw new Error('O histórico local precisa ser conferido; nenhuma revisão foi sobrescrita.')
  return value as ProApplicationRecord[]
}
function budget(value: unknown): Budget {
  if (value === undefined) return {}
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.values(value).some((n) => !Number.isSafeInteger(n) || (n as number) < 0)
  )
    throw new Error('O orçamento do histórico local está incompatível.')
  return value as Budget
}
function journalWrite(
  id: string,
  before: unknown,
  aggregate: unknown,
  additions: ProApplicationRecord[],
): IdbWrite {
  if (!additions.length) return {}
  if (additions.some((record) => record.projectId !== id))
    throw new Error('O histórico pertence a outro projeto; a gravação foi recusada.')
  const records = [...journal(before)]
  for (const record of additions) {
    const existing = records.find((entry) => entry.operationId === record.operationId)
    if (existing) {
      if (
        existing.afterHash !== record.afterHash ||
        existing.beforeHash !== record.beforeHash ||
        existing.jobId !== record.jobId ||
        existing.source !== record.source
      )
        throw new Error('A identificação desta aplicação já pertence a outra revisão.')
      continue
    }
    if (record.bytes > PRO_APPLICATION_LIMITS.projectBytes)
      throw new Error('Esta aplicação ultrapassa o limite do histórico local.')
    records.push(record)
  }
  const bytes = () => records.reduce((sum, record) => sum + record.bytes, 0)
  const incomingIds = new Set(additions.map((record) => record.operationId))
  while (
    records.length > PRO_APPLICATION_LIMITS.operations ||
    bytes() > PRO_APPLICATION_LIMITS.projectBytes
  ) {
    const expired = records.findIndex((record) => !incomingIds.has(record.operationId))
    if (expired < 0)
      throw new DOMException(
        'As aplicações pendentes ultrapassam o limite do histórico local.',
        'QuotaExceededError',
      )
    records.splice(expired, 1)
  }
  const totals = { ...budget(aggregate), [id]: bytes() }
  if (
    Object.values(totals).reduce((sum, size) => sum + size, 0) > PRO_APPLICATION_LIMITS.profileBytes
  )
    throw new DOMException(
      'O histórico local deste perfil está cheio. Exporte suas edições antes de liberar espaço.',
      'QuotaExceededError',
    )
  return {
    puts: [
      [projectApplicationsKey(id), records],
      [APPLICATION_BUDGET_KEY, totals],
    ],
  }
}

function prepare(
  project: { id: string },
  write: IdbWrite,
  scope: ProjectStorageScope,
): RecoveryWrite {
  let stamp = readLocalRevision(project)
  if (!stamp) {
    installLocalRevision(project, scope.identity)
    stamp = readLocalRevision(project)!
  }
  if (stamp.lineage.scope !== scope.identity) throw new ProjectWriteConflict()
  let token = snapshotTokens.get(project)
  if (!token) {
    token = crypto.randomUUID()
    snapshotTokens.set(project, token)
  }
  return {
    version: 1,
    projectId: project.id,
    head: { ...localHead(stamp), token },
    write,
    applications: [...stamp.lineage.pending.values()]
      .filter((entry) => entry.sequence <= stamp.sequence)
      .map((entry) => entry.record),
    ...(stamp.lineage.recoverySources ? { replacesRecovery: stamp.lineage.recoverySources } : {}),
  }
}

async function commit(
  scope: ProjectStorageScope,
  incoming: RecoveryWrite,
  generation: number,
): Promise<void> {
  const { projectId: id, head, write, applications } = incoming
  const recoveryKey = projectRecoveryKey(id, head.writer)
  const sources = (incoming.replacesRecovery ?? []).filter(
    (source) =>
      source.key.startsWith(`${PROJECT_RECOVERY_PREFIX}${id}:`) && source.key !== recoveryKey,
  )
  await conditionalWrite(
    scope.store,
    scope.identity,
    generation,
    [
      projectHeadKey(id),
      projectMetaKey(id),
      projectApplicationsKey(id),
      APPLICATION_BUDGET_KEY,
      recoveryKey,
      ...sources.map((source) => source.key),
    ],
    ([rawHead, meta, oldJournal, oldBudget, recovery, ...sourceValues]) => {
      const current = isLocalHead(rawHead) ? rawHead : undefined
      if (rawHead !== undefined && !current) throw new ProjectWriteConflict()
      // Existing documents without a head must have been opened first, never blind-overwritten.
      if (!current && meta && head.base === null) throw new ProjectWriteConflict()
      if (current?.token !== head.token && !acceptsLocalHead(current, head))
        throw new ProjectWriteConflict()
      let history = journalWrite(id, oldJournal, oldBudget, applications)
      if (incoming.resetApplications) {
        const totals = { ...budget(oldBudget) }
        delete totals[id]
        history = {
          puts: [[APPLICATION_BUDGET_KEY, totals]],
          deletes: [projectApplicationsKey(id)],
        }
      }
      const staged = recovery as RecoveryWrite | undefined
      return {
        write: {
          puts: [...(write.puts ?? []), [projectHeadKey(id), head], ...(history.puts ?? [])],
          deletes: [
            ...(write.deletes ?? []),
            ...(history.deletes ?? []),
            ...(staged?.version === 1 && staged.head.sequence <= head.sequence
              ? [recoveryKey]
              : []),
            ...sources.flatMap((source, index) =>
              (sourceValues[index] as RecoveryWrite | undefined)?.head.token === source.token
                ? [source.key]
                : [],
            ),
          ],
        },
        result: undefined,
      }
    },
  )
}

export function coordinatedProjectWrite(
  project: { id: string },
  write: IdbWrite,
  scope: ProjectStorageScope,
  generation = conditionalGeneration(scope.identity),
  resetApplications = false,
): Promise<void> {
  const incoming = { ...prepare(project, write, scope), resetApplications }
  return commit(scope, incoming, generation).then(() => {
    const stamp = readLocalRevision(project)!
    stamp.lineage.durableToken = incoming.head.token
    stamp.lineage.recovery = false
    stamp.lineage.recoverySources = undefined
    for (const record of incoming.applications) {
      stamp.lineage.saved.add(record.operationId)
      stamp.lineage.pending.delete(record.operationId)
    }
    while (stamp.lineage.saved.size > PRO_APPLICATION_LIMITS.operations)
      stamp.lineage.saved.delete(stamp.lineage.saved.values().next().value!)
  })
}

/** All requests + explicit commit; no digest/read callback is needed during pagehide. */
export function stageProjectExit(
  project: { id: string },
  write: IdbWrite,
  scope: ProjectStorageScope,
  incompleteBlocks = false,
): Promise<void> {
  const incoming = { ...prepare(project, write, scope), incompleteBlocks }
  interruptConditionalTransactions(scope.identity)
  return writeInOneTransaction(scope.store, {
    puts: [[projectRecoveryKey(project.id, incoming.head.writer), incoming]],
  })
}

/** Kept when conflicting; recovery never replaces a newer writer's document. */
export async function recoverProjectWrites(
  scope: ProjectStorageScope,
  projectId?: string,
  knownKeys?: readonly IDBValidKey[],
): Promise<string[]> {
  const keys = (knownKeys ?? (await readAllKeys(scope.store))).filter(
    (key): key is string =>
      typeof key === 'string' &&
      key.startsWith(
        projectId ? `${PROJECT_RECOVERY_PREFIX}${projectId}:` : PROJECT_RECOVERY_PREFIX,
      ),
  )
  const values = await readValues(scope.store, keys)
  const recovered: string[] = []
  for (const recovery of latestRecoveries(values)) {
    try {
      await commit(scope, recovery, conditionalGeneration(scope.identity))
      recovered.push(recovery.projectId)
    } catch (error) {
      // One failed recovery (quota, incompatible journal or corrupt draft) must not
      // prevent access to the committed document or the rest of the profile.
      if (error instanceof ProjectWriteConflict) {
        try {
          const copied = await copyConflictingRecovery(scope, recovery)
          if (copied) recovered.push(copied)
        } catch {
          /* The complete original draft stays in its recovery partition. */
        }
      }
    }
  }
  return recovered
}

function projectFromRecovery(recovery: RecoveryWrite): StoredProjectRecord | null {
  const records = new Map(recovery.write.puts)
  const id = recovery.projectId
  return assembleProjectRecord(
    id,
    records.get(projectMetaKey(id)),
    records.get(projectFilesKey(id)),
    records.get(projectStateKey(id)),
    records.get(projectAssetsKey(id)),
    records.get(projectBlocksKey(id)),
  )
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
  const eligible = latestRecoveries(records).filter(
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
    [stagedKey, projectMetaKey(id), projectHeadKey(id), ...sources.map((entry) => entry.key)],
    ([latest, existing, targetHead, ...ancestors]) => {
      const draft = latest as RecoveryWrite | undefined
      if (draft?.head.token !== recovery.head.token) return { write: {}, result: undefined }
      // An inconsistent live head cannot stand in for a recovered document.
      if (!existing && targetHead && !(isLocalHead(targetHead) && targetHead.deleted))
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

export async function listProApplications(
  scope: ProjectStorageScope,
  projectId: string,
): Promise<ProApplicationRecord[]> {
  const [value] = await readValues(scope.store, [projectApplicationsKey(projectId)])
  return journal(value)
}

/** Capture before restore's asynchronous work. This never grants a force-write. */
export async function bindProjectToDurableHead(
  project: { id: string },
  scope: ProjectStorageScope,
): Promise<void> {
  let [head, meta] = await readValues(scope.store, [
    projectHeadKey(project.id),
    projectMetaKey(project.id),
  ])
  if (!head && meta) {
    await ensureProjectHead(scope, project.id)
    ;[head] = await readValues(scope.store, [projectHeadKey(project.id)])
  }
  installLocalRevision(project, scope.identity, isLocalHead(head) ? head : undefined)
}

/** Migration-created records acquire a CAS head without changing their document. */
export async function ensureProjectHead(scope: ProjectStorageScope, id: string): Promise<void> {
  await conditionalWrite(
    scope.store,
    scope.identity,
    conditionalGeneration(scope.identity),
    [projectHeadKey(id), projectMetaKey(id)],
    ([head, meta]) => ({
      write:
        !head && meta
          ? {
              puts: [
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
            }
          : {},
      result: undefined,
    }),
  )
}

/** Atomic field edits use the latest record, and invalidate snapshots in other editors. */
export function mutateProjectRecord(
  scope: ProjectStorageScope,
  id: string,
  extraKeys: readonly IDBValidKey[],
  mutation: (meta: Record<string, unknown>, values: unknown[]) => IdbWrite,
  expectedToken?: string | null,
): Promise<boolean> {
  return conditionalWrite(
    scope.store,
    scope.identity,
    conditionalGeneration(scope.identity),
    [projectMetaKey(id), projectHeadKey(id), ...extraKeys],
    ([meta, rawHead, ...values]) => {
      const head = isLocalHead(rawHead) ? rawHead : undefined
      if (!meta || typeof meta !== 'object' || head?.deleted) return { write: {}, result: false }
      if (
        expectedToken !== undefined &&
        (expectedToken === null ? rawHead != null : head?.token !== expectedToken)
      )
        throw new ProjectWriteConflict()
      const write = mutation(meta as Record<string, unknown>, values)
      return {
        write: {
          ...write,
          puts: [
            ...(write.puts ?? []),
            [
              projectHeadKey(id),
              {
                version: 1,
                token: crypto.randomUUID(),
                writer: crypto.randomUUID(),
                base: head?.token ?? null,
                sequence: 0,
              } satisfies LocalHead,
            ],
          ],
        },
        result: true,
      }
    },
  )
}

export function renameLiveProject(
  project: EditableStudioProject,
  name: string,
  scope: ProjectStorageScope,
): Promise<boolean> {
  if (!readLocalRevision(project))
    return mutateProjectRecord(scope, project.id, [], (meta) => ({
      puts: [[projectMetaKey(project.id), { ...meta, name, updatedAt: Date.now() }]],
    }))
  const incoming = prepare(project, {}, scope)
  return conditionalWrite(
    scope.store,
    scope.identity,
    conditionalGeneration(scope.identity),
    [projectMetaKey(project.id), projectHeadKey(project.id)],
    ([meta, rawHead]) => {
      const head = isLocalHead(rawHead) ? rawHead : undefined
      if (!meta || typeof meta !== 'object') return { write: {}, result: false }
      if (!acceptsLocalHead(head, incoming.head)) throw new ProjectWriteConflict()
      return {
        write: {
          puts: [
            [projectMetaKey(project.id), { ...meta, name, updatedAt: Date.now() }],
            [projectHeadKey(project.id), incoming.head],
          ],
        },
        result: true,
      }
    },
  ).then((written) => {
    if (written) readLocalRevision(project)!.lineage.durableToken = incoming.head.token
    return written
  })
}
