import type { EditableStudioProject } from '../core/editableProject'
import { isDocumentRecord } from '../core/projectDocumentGuards'
import { encodeExitJournal } from './exitJournalCodec'
import {
  conditionalGeneration,
  conditionalWrite,
  type IdbWrite,
  interruptConditionalTransactions,
  prepareProjectStorageWrite,
  readAllKeys,
  readValues,
  writeInOneTransaction,
} from './idbTransaction'
import {
  applicationBudgetKey,
  PROJECT_RECOVERY_PREFIX,
  PROJECT_STORAGE_VERSION,
  type ProjectStorageVersion,
  projectApplicationsKey,
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectRecoveryKey,
  projectRecoveryPrefix,
  projectStateKey,
} from './projectStorageKeys'
import { assembleProjectRecord, type StoredProjectRecord } from './projectStorageRecords'
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
import {
  ExitJournalError,
  hasSynchronousExitJournal,
  stageSynchronousExitJournal,
} from './synchronousExitJournal'

export const PRO_APPLICATION_LIMITS = Object.freeze({
  operations: 20,
  projectBytes: 8 * 1024 * 1024,
  profileBytes: 32 * 1024 * 1024,
})
export interface RecoveryWrite {
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
export function latestRecoveries(values: readonly unknown[]): RecoveryWrite[] {
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
const exitCopies = new WeakMap<
  object,
  { storage?: Storage; key?: string; encoded?: string; error?: string }
>()

export function projectExitRecoveryStatus(project: { id: string }): {
  recoverable: boolean
  error?: string
} {
  const revision = readLocalRevision(project)
  const copy = revision && exitCopies.get(revision)
  try {
    if (
      copy?.storage &&
      copy.key &&
      copy.encoded &&
      copy.storage.getItem(copy.key) === copy.encoded
    )
      return { recoverable: true }
  } catch {
    /* A permission change cannot acknowledge a recovery copy. */
  }
  return {
    recoverable: false,
    error:
      copy?.error ??
      'As alterações ainda não têm uma cópia de recuperação confirmada. Salve ou exporte antes de fechar esta aba.',
  }
}

export function journal(value: unknown): ProApplicationRecord[] {
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
export function applicationBudget(value: unknown): Budget {
  if (value === undefined) return {}
  if (
    !isDocumentRecord(value) ||
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
  version: ProjectStorageVersion = PROJECT_STORAGE_VERSION,
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
  const totals = { ...applicationBudget(aggregate), [id]: bytes() }
  if (
    Object.values(totals).reduce((sum, size) => sum + size, 0) > PRO_APPLICATION_LIMITS.profileBytes
  )
    throw new DOMException(
      'O histórico local deste perfil está cheio. Exporte suas edições antes de liberar espaço.',
      'QuotaExceededError',
    )
  return {
    puts: [
      [projectApplicationsKey(id, version), records],
      [applicationBudgetKey(version), totals],
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

export async function commitProjectRecovery(
  scope: ProjectStorageScope,
  incoming: RecoveryWrite,
  generation: number,
  rejectEqualSequence = false,
  unchangedRecovery?: (stored: unknown) => boolean,
  version: ProjectStorageVersion = PROJECT_STORAGE_VERSION,
): Promise<void> {
  const { projectId: id, head, write, applications } = incoming
  const physicalWrite = version === 4 ? await prepareProjectStorageWrite(write) : write
  const recoveryKey = projectRecoveryKey(id, head.writer, version)
  const allSources = (incoming.incompleteBlocks ? [] : (incoming.replacesRecovery ?? [])).filter(
    (source) => source.key.startsWith(`${projectRecoveryPrefix(version)}${id}:`),
  )
  const sources = allSources.filter((source) => source.key !== recoveryKey)
  const prepared = allSources.length
    ? await (await import('./projectRecoverySources')).prepareRecoverySources(
        scope,
        incoming,
        allSources,
        recoveryKey,
        version,
      )
    : undefined
  await conditionalWrite(
    scope.store,
    scope.identity,
    generation,
    [
      projectHeadKey(id, version),
      projectMetaKey(id, version),
      projectApplicationsKey(id, version),
      applicationBudgetKey(version),
      recoveryKey,
      ...(prepared?.keys ?? []),
    ],
    ([rawHead, meta, oldJournal, oldBudget, recovery, ...sourceValues]) => {
      prepared?.assertUnchanged(recovery, sourceValues)
      if (unchangedRecovery && !unchangedRecovery(recovery))
        throw new Error('A recuperação mudou antes da gravação. A revisão atual foi preservada.')
      const current = isLocalHead(rawHead) ? rawHead : undefined
      if (rawHead !== undefined && !current) throw new ProjectWriteConflict()
      // Existing documents without a head must have been opened first, never blind-overwritten.
      if (!current && meta && head.base === null) throw new ProjectWriteConflict()
      if (current?.token !== head.token && !acceptsLocalHead(current, head))
        throw new ProjectWriteConflict()
      if (
        rejectEqualSequence &&
        current &&
        current.token !== head.token &&
        current.writer === head.writer &&
        current.base === head.base &&
        current.sequence === head.sequence
      )
        throw new ProjectWriteConflict()
      if (rejectEqualSequence) {
        const existingApplications = journal(oldJournal)
        for (const record of applications) {
          const previous = existingApplications.find(
            (saved) => saved.operationId === record.operationId,
          )
          if (!previous) continue
          try {
            if (encodeExitJournal(previous) === encodeExitJournal(record)) continue
          } catch {
            // Unable to prove complete equality: preserve the entire source as a copy.
          }
          throw new ProjectWriteConflict()
        }
      }
      let history = journalWrite(id, oldJournal, oldBudget, applications, version)
      if (incoming.resetApplications) {
        const totals = { ...applicationBudget(oldBudget) }
        delete totals[id]
        history = {
          puts: [[applicationBudgetKey(version), totals]],
          deletes: [projectApplicationsKey(id, version)],
        }
      }
      const staged = recovery as RecoveryWrite | undefined
      return {
        write: {
          puts: [
            ...(physicalWrite.puts ?? []),
            [projectHeadKey(id, version), head],
            ...(history.puts ?? []),
            ...(prepared?.puts ?? []),
          ],
          deletes: [
            ...(physicalWrite.deletes ?? []),
            ...(history.deletes ?? []),
            ...(staged?.version === 1 && staged.head.sequence <= head.sequence
              ? [recoveryKey]
              : []),
            ...sources.flatMap((source) => (prepared?.canRetire(source) ? [source.key] : [])),
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
  return commitProjectRecovery(scope, incoming, generation).then(async () => {
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
    exitCopies.delete(stamp)
    if (hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity)) {
      try {
        const { retireConfirmedExitCopies } = await import('./projectSynchronousExitRecovery')
        await retireConfirmedExitCopies(scope, project.id)
      } catch (error) {
        // The live document is confirmed. Keep an unverified mirror instead of
        // converting a cleanup failure into data deletion or a false save failure.
        console.warn('[studio] cópia de recuperação preservada:', error)
      }
    }
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
  let synchronousFailure: unknown
  let synchronousKey: string | undefined
  let synchronousEncoded: string | undefined
  try {
    synchronousKey = stageSynchronousExitJournal(
      scope.exitJournalStorage,
      scope.identity,
      {
        projectId: incoming.projectId,
        writer: incoming.head.writer,
        token: incoming.head.token,
      },
      incoming,
    )
    synchronousEncoded = scope.exitJournalStorage?.getItem(synchronousKey) ?? undefined
    if (!synchronousEncoded)
      throw new ExitJournalError('A cópia de recuperação não foi confirmada.')
  } catch (error) {
    synchronousFailure = error
  }
  const revision = readLocalRevision(project)!
  exitCopies.set(revision, {
    storage: scope.exitJournalStorage,
    key: synchronousKey,
    encoded: synchronousEncoded,
    ...(synchronousFailure
      ? {
          error:
            synchronousFailure instanceof Error
              ? synchronousFailure.message
              : 'Não foi possível guardar a cópia de recuperação.',
        }
      : {}),
  })
  interruptConditionalTransactions(scope.identity)
  const native = writeInOneTransaction(scope.store, {
    puts: [[projectRecoveryKey(project.id, incoming.head.writer), incoming]],
  })
  // Still request native recovery on quota/availability failure. The service must
  // keep dirty state and warn before leaving when no synchronous copy exists.
  return native
    .catch((error) => {
      if (!projectExitRecoveryStatus(project).recoverable) throw error
    })
    .then(() => {
      if (synchronousFailure && scope.exitJournalStorage) throw synchronousFailure
    })
}

/** Load recovery preparation only when a native journal is actually present. */
export async function recoverIndexedProjectWrites(
  scope: ProjectStorageScope,
  projectId?: string,
  knownKeys?: readonly IDBValidKey[],
  synchronousTokens: ReadonlySet<string> = new Set(),
  mustCopy?: (recovery: RecoveryWrite) => boolean,
  deferRecovery?: (recovery: RecoveryWrite) => boolean,
  version: ProjectStorageVersion = PROJECT_STORAGE_VERSION,
): Promise<{ recovered: string[]; consumed: Set<string> }> {
  const keys = knownKeys ?? (await readAllKeys(scope.store))
  const recoveryPrefix = projectRecoveryPrefix(version)
  const prefix = projectId ? `${recoveryPrefix}${projectId}:` : recoveryPrefix
  if (!keys.some((key) => typeof key === 'string' && key.startsWith(prefix)))
    return { recovered: [], consumed: new Set() }
  const recovery = await import('./projectIndexedRecovery')
  return recovery.recoverIndexedProjectWrites(
    scope,
    projectId,
    keys,
    synchronousTokens,
    mustCopy,
    deferRecovery,
    version,
  )
}

/** Keep uncommon synchronous-journal decoding out of the initial project list. */
export async function recoverProjectWrites(
  scope: ProjectStorageScope,
  projectId?: string,
  knownKeys?: readonly IDBValidKey[],
): Promise<string[]> {
  if (PROJECT_STORAGE_VERSION === 4) {
    const { prepareLocalV4ProjectReads } = await import('../project-migrations/localV3Projects')
    return (await prepareLocalV4ProjectReads(scope, knownKeys, projectId)).changed
  }
  if (!hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity))
    return (await recoverIndexedProjectWrites(scope, projectId, knownKeys)).recovered
  const { recoverSynchronousProjectWrites } = await import('./projectSynchronousExitRecovery')
  return recoverSynchronousProjectWrites(scope, projectId, knownKeys)
}

export function projectFromRecovery(
  recovery: RecoveryWrite,
  version?: ProjectStorageVersion,
): StoredProjectRecord | null {
  const records = new Map(recovery.write.puts)
  const id = recovery.projectId
  return assembleProjectRecord(
    id,
    records.get(projectMetaKey(id, version)),
    records.get(projectFilesKey(id, version)),
    records.get(projectStateKey(id, version)),
    records.get(projectAssetsKey(id, version)),
    records.get(projectBlocksKey(id, version)),
  )
}

/** Editor-only fallback; cloud/export keep reading the committed revision. */
export async function loadRecoverableProjectDraft(
  scope: ProjectStorageScope,
  id: string,
): Promise<EditableStudioProject | null> {
  const recovery = await import('./projectIndexedRecovery')
  return recovery.loadRecoverableProjectDraft(scope, id)
}

export async function listPreservedProjectDrafts(
  scope: ProjectStorageScope,
  knownKeys: readonly IDBValidKey[],
) {
  if (!knownKeys.some((key) => typeof key === 'string' && key.startsWith(PROJECT_RECOVERY_PREFIX)))
    return []
  const recovery = await import('./projectIndexedRecovery')
  return recovery.listPreservedProjectDrafts(scope, knownKeys)
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
  // Capture the baseline before preparation: a restore must not inherit permission
  // to overwrite a document that was newly migrated/recovered during this await.
  if (PROJECT_STORAGE_VERSION === 4) await recoverProjectWrites(scope, project.id)
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
