import type { EditableStudioProject } from '../core/editableProject'
import { encodeExitJournal } from './exitJournalCodec'
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
  projectMigrationKey,
  projectRecoveryKey,
  projectStateKey,
  projectThumbKey,
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
import {
  acknowledgeSynchronousExitJournal,
  type ExitJournalEntry,
  ExitJournalError,
  hasSynchronousExitJournal,
  readSynchronousExitJournal,
  stageSynchronousExitJournal,
} from './synchronousExitJournal'

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
  rejectEqualSequence = false,
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
  return commit(scope, incoming, generation).then(async () => {
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
        for (const entry of readSynchronousExitJournal(
          scope.exitJournalStorage,
          scope.identity,
          project.id,
        ))
          await retireMatchingSynchronousRecovery(scope, entry, synchronousRecovery(entry))
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

/** Kept when conflicting; recovery never replaces a newer writer's document. */
async function recoverIndexedProjectWrites(
  scope: ProjectStorageScope,
  projectId?: string,
  knownKeys?: readonly IDBValidKey[],
  synchronousTokens: ReadonlySet<string> = new Set(),
  mustCopy?: (recovery: RecoveryWrite) => boolean,
): Promise<{ recovered: string[]; consumed: Set<string> }> {
  const keys = (knownKeys ?? (await readAllKeys(scope.store))).filter(
    (key): key is string =>
      typeof key === 'string' &&
      key.startsWith(
        projectId ? `${PROJECT_RECOVERY_PREFIX}${projectId}:` : PROJECT_RECOVERY_PREFIX,
      ),
  )
  const values = await readValues(scope.store, keys)
  const recovered: string[] = []
  const consumed = new Set<string>()
  for (const recovery of latestRecoveries(values)) {
    try {
      if (mustCopy?.(recovery)) throw new ProjectWriteConflict()
      await commit(
        scope,
        recovery,
        conditionalGeneration(scope.identity),
        synchronousTokens.has(recovery.head.token),
      )
      recovered.push(recovery.projectId)
      consumed.add(recovery.head.token)
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
          if (copied || remaining === undefined) consumed.add(recovery.head.token)
        } catch {
          /* The complete original draft stays in its recovery partition. */
        }
      }
    }
  }
  return { recovered, consumed }
}

function synchronousRecovery(entry: ExitJournalEntry): RecoveryWrite {
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
        !keys.has(pair[0]),
    ) ||
    (recovery.write.deletes !== undefined &&
      (!Array.isArray(recovery.write.deletes) ||
        recovery.write.deletes.some((key) => typeof key !== 'string' || !keys.has(key)))) ||
    !projectFromRecovery(recovery)
  )
    throw new ExitJournalError(
      'A cópia de recuperação contém partições incompatíveis. Ela foi preservada.',
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

async function matchesCommittedRecovery(
  scope: ProjectStorageScope,
  recovery: RecoveryWrite,
): Promise<boolean> {
  const puts = recovery.write.puts ?? []
  const deletes = recovery.write.deletes ?? []
  const [head, applications, ...values] = await readValues(scope.store, [
    projectHeadKey(recovery.projectId),
    projectApplicationsKey(recovery.projectId),
    ...puts.map(([key]) => key),
    ...deletes,
  ])
  if (!isLocalHead(head) || head.deleted) return false
  try {
    if (
      !puts.every(
        ([, value], index) => encodeExitJournal(value) === encodeExitJournal(values[index]),
      )
    )
      return false
    if (!deletes.every((_, index) => values[puts.length + index] === undefined)) return false
    const saved = journal(applications)
    return recovery.applications.every((record) =>
      saved.some(
        (other) =>
          other.operationId === record.operationId &&
          encodeExitJournal(other) === encodeExitJournal(record),
      ),
    )
  } catch {
    return false
  }
}

async function retireMatchingSynchronousRecovery(
  scope: ProjectStorageScope,
  entry: ExitJournalEntry,
  incoming: RecoveryWrite,
): Promise<boolean> {
  if (!(await matchesCommittedRecovery(scope, incoming))) return false
  const key = projectRecoveryKey(incoming.projectId, incoming.head.writer)
  await conditionalWrite(
    scope.store,
    scope.identity,
    conditionalGeneration(scope.identity),
    [key],
    ([current]) => {
      const pending = current as RecoveryWrite | undefined
      if (pending?.head?.token !== entry.token) return { write: {}, result: undefined }
      if (encodeExitJournal(current) !== entry.encoded)
        throw new ExitJournalError(
          'A mesma revisão contém recuperações diferentes. Ambas foram preservadas.',
        )
      return { write: { deletes: [key] }, result: undefined }
    },
  )
  try {
    acknowledgeSynchronousExitJournal(scope.exitJournalStorage, entry)
  } catch (error) {
    console.warn('[studio] cópia confirmada; limpeza de recuperação pendente:', error)
  }
  return true
}

/** Replay the same recovery protocol; no competing model, writer or project store. */
export async function recoverProjectWrites(
  scope: ProjectStorageScope,
  projectId?: string,
  knownKeys?: readonly IDBValidKey[],
): Promise<string[]> {
  let entries: ExitJournalEntry[]
  try {
    entries = readSynchronousExitJournal(scope.exitJournalStorage, scope.identity, projectId)
  } catch (error) {
    if (projectId) throw error
    console.warn('[studio] cópia de recuperação preservada:', error)
    return (await recoverIndexedProjectWrites(scope, projectId, knownKeys)).recovered
  }
  const pending: ExitJournalEntry[] = []
  for (const entry of entries) {
    try {
      if (!(await retireMatchingSynchronousRecovery(scope, entry, synchronousRecovery(entry))))
        pending.push(entry)
    } catch (error) {
      if (projectId) throw error
      console.warn('[studio] cópia de recuperação preservada:', error)
    }
  }
  entries = pending
  const groups = new Map<string, RecoveryWrite[]>()
  const groupKey = (value: RecoveryWrite) =>
    JSON.stringify([value.projectId, value.head.writer, value.head.base, value.head.sequence])
  const comparable = (value: RecoveryWrite) =>
    encodeExitJournal({ ...value, head: { ...value.head, token: '' } })
  for (const entry of entries) {
    const value = synchronousRecovery(entry)
    const key = groupKey(value)
    const group = groups.get(key) ?? []
    group.push(value)
    groups.set(key, group)
  }
  const ambiguous = new Set<string>()
  const mustCopy = (value: RecoveryWrite) => {
    const key = groupKey(value)
    if (ambiguous.has(key)) return true
    const peers = groups.get(key)
    if (
      peers?.some(
        (peer) => peer.head.token !== value.head.token && comparable(peer) !== comparable(value),
      )
    ) {
      ambiguous.add(key)
      return true
    }
    return false
  }
  const tokens = new Set(entries.map((entry) => entry.token))
  const first = await recoverIndexedProjectWrites(scope, projectId, knownKeys, tokens, mustCopy)
  const recovered = new Set(first.recovered)
  const consumed = first.consumed
  for (const entry of entries) {
    try {
      const incoming = synchronousRecovery(entry)
      if (!consumed.has(entry.token) && !(await matchesCommittedRecovery(scope, incoming))) {
        const key = projectRecoveryKey(incoming.projectId, incoming.head.writer)
        await conditionalWrite(
          scope.store,
          scope.identity,
          conditionalGeneration(scope.identity),
          [key],
          ([existing]) => {
            if (existing !== undefined && encodeExitJournal(existing) !== entry.encoded)
              throw new ExitJournalError(
                'Outra recuperação deste escritor ainda está pendente. Ambas foram preservadas.',
              )
            return {
              write: existing === undefined ? { puts: [[key, incoming]] } : {},
              result: undefined,
            }
          },
        )
        const next = await recoverIndexedProjectWrites(
          scope,
          incoming.projectId,
          undefined,
          tokens,
          mustCopy,
        )
        for (const id of next.recovered) recovered.add(id)
        for (const token of next.consumed) consumed.add(token)
        if (!consumed.has(entry.token))
          throw new ExitJournalError(
            'A cópia de recuperação ainda não pôde ser aplicada. Ela foi preservada.',
          )
      }
      try {
        acknowledgeSynchronousExitJournal(scope.exitJournalStorage, entry)
      } catch (error) {
        console.warn('[studio] cópia confirmada; limpeza de recuperação pendente:', error)
      }
    } catch (error) {
      if (projectId) throw error
      console.warn('[studio] cópia de recuperação preservada:', error)
    }
  }
  return [...recovered]
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
    [
      stagedKey,
      projectMetaKey(id),
      projectHeadKey(id),
      projectMigrationKey(id),
      ...sources.map((entry) => entry.key),
    ],
    ([latest, existing, targetHead, provenance, ...ancestors]) => {
      const draft = latest as RecoveryWrite | undefined
      if (draft?.head.token !== recovery.head.token) return { write: {}, result: undefined }
      // An inconsistent live head cannot stand in for a recovered document.
      if (!existing && targetHead && !(isLocalHead(targetHead) && targetHead.deleted))
        return { write: {}, result: undefined }
      // Keep inverse patches and all source journal fields with the recovered copy.
      const archived = provenance as { exitRecovery?: RecoveryWrite } | undefined
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
