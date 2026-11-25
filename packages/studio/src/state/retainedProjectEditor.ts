import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { EditableStudioProject } from '../core/editableProject'
import { PRIVATE_REGIONAL_PROJECT } from '../core/pintaRegionalReference'
import type { ProjectAsset } from '../core/projectAssets'
import { isDocumentRecord } from '../core/projectDocumentGuards'
import {
  legacyProjectKeys,
  preserveLegacyRegionalEdit,
} from '../project-migrations/localRegionalAuthority'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { type IdbWrite, readValue, readValues } from './idbTransaction'
import { notifyRecoveredProjects } from './projectPersistenceEvents'
import {
  latestRecoveries,
  PRO_APPLICATION_LIMITS,
  projectFromRecovery,
} from './projectStorageCoordinator'
import { applicationBudgetKey, projectBlocksKey, projectRecoveryKey } from './projectStorageKeys'
import { assembleProjectRecord } from './projectStorageRecords'
import {
  acceptsLocalHead,
  installLocalRevision,
  isLocalHead,
  type LocalHead,
  localHead,
  ProjectWriteConflict,
  readLocalRevision,
} from './projectStorageRevision'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { type RetainedApplicationBudget, retainedApplications } from './retainedProjectApplications'
import {
  acknowledgeRetainedJournal,
  readRetainedDrafts,
  retainedDraftRelation,
} from './retainedProjectDrafts'
import { invalidRetention, prepareRetainedParts, type RetainedPart } from './retainedProjectParts'
import {
  commitRetainedProject,
  type RetainedManifest,
  readRetainedManifest,
  readRetainedParts,
} from './retainedProjectStore'
import { hasSynchronousExitJournal } from './synchronousExitJournalProbe'
import { readSynchronousExitJournal } from './synchronousExitJournalRead'

export type RetainedValues = Partial<Record<RetainedPart, unknown>>
/** The private physical token fences all parts. The authored token also lets an unrelated
 * thumbnail or game-score update proceed without invalidating the editor's opened revision. */
export function retainedEditorHead(manifest: RetainedManifest, stored: unknown): LocalHead {
  if (isDocumentRecord(stored) && Object.hasOwn(stored, 'physicalVersion')) {
    if (
      stored.physicalVersion !== 5 ||
      Object.keys(stored).length !== 2 ||
      !isLocalHead(stored.head) ||
      stored.head.deleted
    )
      invalidRetention()
    return stored.head
  }
  // First-generation private snapshots retained the previous V4 head along with the document.
  if (stored !== undefined && !isLocalHead(stored)) invalidRetention()
  return { version: 1, token: manifest.token, writer: '', base: null, sequence: 0 }
}
export async function readRetainedDocument(
  scope: ProjectStorageScope,
  manifest: RetainedManifest,
  shell = false,
) {
  if (manifest.deleted) return null
  await preserveLegacySources(scope, manifest)
  const names: RetainedPart[] = shell
    ? ['meta', 'files', 'assets', 'head']
    : ['meta', 'files', 'state', 'blocks', 'assets', 'head']
  const v = await readRetainedParts(scope, manifest, names)
  const id = manifest.id
  const project = assembleProjectRecord(
    id,
    v.meta,
    v.files,
    shell ? { id, ir: null, blocksState: null } : v.state,
    v.assets,
    shell ? undefined : v.blocks,
  )
  if (!project) invalidRetention()
  return installLocalRevision(project, scope.identity, retainedEditorHead(manifest, v.head))
}

async function preserveLegacySources(scope: ProjectStorageScope, manifest: RetainedManifest) {
  try {
    const saved = await preserveLegacyRegionalEdit(scope, manifest)
    if (saved.created && saved.fork) notifyRecoveredProjects(scope, [saved.fork])
  } catch (error) {
    // Canonical bytes stay independently accessible. The gallery offers the exact old records;
    // explicit deletion still requires the old source to be safely recoverable.
    scope.signal?.throwIfAborted()
    if (error instanceof DOMException && error.name === 'AbortError') throw error
  }
}

export interface RetainedPatch {
  applicationBudget?: RetainedApplicationBudget
  /** A missing part here stays untouched. An explicitly supplied undefined removes only that part. */
  values: RetainedValues
  /** Only authored edits replace the editor head. Auxiliary updates preserve it. */
  nextHead?: LocalHead
  /** Captured exit copies this commit covers: deleted with it while still unchanged. */
  retire?: ReadonlyArray<readonly [key: string, value: unknown]>
  ready?: () => boolean
}
export async function patchRetainedProject(
  scope: ProjectStorageScope,
  first: RetainedManifest,
  /** `null` only for auxiliary values, which ride on whatever authored head is current. */
  expectedEditorToken: string | null,
  change: RetainedPatch,
) {
  if (first.deleted || (change.nextHead && expectedEditorToken === null))
    throw new ProjectWriteConflict()
  const values = copyStudioProjectJson(change.values) as RetainedValues
  const nextHead = change.nextHead && { ...change.nextHead }
  const ready = change.ready
  const retired = change.retire ?? []
  let manifest = first
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const source = await readRetainedParts(scope, manifest)
      const current = retainedEditorHead(manifest, source.head)
      if (expectedEditorToken !== null && current.token !== expectedEditorToken)
        throw new ProjectWriteConflict()
      const merged = {
        ...source,
        ...values,
        head: { physicalVersion: 5, head: nextHead ?? current },
      }
      if (nextHead) {
        const document = assembleProjectRecord(
          manifest.id,
          merged.meta,
          merged.files,
          merged.state,
          merged.assets,
          merged.blocks,
        )
        if (
          !document ||
          !(await prepareEditableStudioProject(document, { [PRIVATE_REGIONAL_PROJECT]: scope }))
        )
          invalidRetention()
      }
      const parts = await prepareRetainedParts(merged)
      return await commitRetainedProject(scope, {
        id: manifest.id,
        origin: manifest.origin,
        expectedToken: manifest.token,
        candidate: parts,
        ...(retired.length ? { source: retired, retire: retired.map(([key]) => key) } : {}),
        ready,
        applicationBudget: change.applicationBudget,
      })
    } catch (error) {
      if (!(error instanceof ProjectWriteConflict) || ready?.() === false) throw error
      const latest = await readRetainedManifest(scope, manifest.id)
      if (!latest || latest.deleted || latest.token === manifest.token) throw error
      manifest = latest
    }
  }
  throw new ProjectWriteConflict()
}

export async function saveRetainedDocument(
  scope: ProjectStorageScope,
  manifest: RetainedManifest,
  project: EditableStudioProject,
  write: IdbWrite,
  replace = false,
) {
  const stamp = readLocalRevision(project)
  if (!stamp || stamp.lineage.scope !== scope.identity || manifest.deleted)
    throw new ProjectWriteConflict()
  const snapshot = {
    puts: write.puts?.map(([key, value]) => [key, copyStudioProjectJson(value)] as const),
    deletes: [...(write.deletes ?? [])],
  }
  const additions = [...stamp.lineage.pending.values()]
    .filter((entry) => entry.sequence <= stamp.sequence)
    .map((entry) => entry.record)
  const source = await readRetainedParts(scope, manifest, ['head', 'applications'])
  const previous = retainedEditorHead(manifest, source.head)
  const next = localHead(stamp)
  if (previous.writer === next.writer && previous.sequence > next.sequence)
    throw new ProjectWriteConflict()
  if (previous.token !== stamp.lineage.durableToken && !acceptsLocalHead(previous, next))
    throw new ProjectWriteConflict()
  const map = new Map(
    Object.entries(legacyProjectKeys(manifest.id)).map(([name, key]) => [
      key,
      name as RetainedPart,
    ]),
  )
  const edits: RetainedValues = {}
  for (const [key, value] of snapshot.puts ?? []) {
    const part = typeof key === 'string' ? map.get(key) : undefined
    if (!part) invalidRetention()
    edits[part] = value
  }
  for (const key of snapshot.deletes) {
    const part = typeof key === 'string' ? map.get(key) : undefined
    if (!part) invalidRetention()
    edits[part] = undefined
  }
  const applications =
    additions.length || (replace && source.applications !== undefined)
      ? retainedApplications(
          manifest.id,
          source.applications,
          await readValue(scope.store, applicationBudgetKey()),
          additions,
          replace,
        )
      : undefined
  if (applications)
    edits.applications = applications.records.length ? applications.records : undefined
  // A freshly minted publication token also distinguishes edits made to a reused project object.
  const head = { ...next, token: crypto.randomUUID() }
  // Exit copies this revision supersedes: older ones of the durable head, older ones of this
  // editor and the draft it adopted. Leaving them made every later gallery fork them again.
  const adopted = stamp.lineage.recoverySources ?? []
  const covered = (await readRetainedDrafts(scope, manifest.id)).filter(
    ({ recovery }) =>
      retainedDraftRelation(previous, recovery.head) === 'covered' ||
      retainedDraftRelation(head, recovery.head) === 'covered' ||
      adopted.some(
        (source) =>
          source.key === projectRecoveryKey(manifest.id, recovery.head.writer) &&
          source.token === recovery.head.token,
      ),
  )
  await patchRetainedProject(scope, manifest, previous.token, {
    values: edits,
    nextHead: head,
    retire: covered.flatMap(({ native }) => (native ? [native] : [])),
    applicationBudget: applications?.budget,
  })
  stamp.lineage.durableToken = head.token
  stamp.lineage.recovery = false
  stamp.lineage.recoverySources = undefined
  for (const record of additions) {
    stamp.lineage.saved.add(record.operationId)
    stamp.lineage.pending.delete(record.operationId)
  }
  while (stamp.lineage.saved.size > PRO_APPLICATION_LIMITS.operations) {
    const first = stamp.lineage.saved.values().next()
    if (!first.done) stamp.lineage.saved.delete(first.value)
  }
  acknowledgeRetainedJournal(scope, covered)
}

export async function updateRetainedAssets(
  scope: ProjectStorageScope,
  manifest: RetainedManifest,
  assets: ProjectAsset[],
  expected: string | null | undefined,
  ready: () => boolean,
  liveProject?: EditableStudioProject,
) {
  if (!expected || manifest.deleted) throw new ProjectWriteConflict()
  const captured = copyStudioProjectJson(assets)
  const v = await readRetainedParts(scope, manifest, ['meta', 'head'])
  if (!isDocumentRecord(v.meta)) invalidRetention()
  const previous = retainedEditorHead(manifest, v.head)
  if (previous.token !== expected || !ready()) throw new ProjectWriteConflict()
  const stamp = liveProject && readLocalRevision(liveProject)
  if (
    stamp &&
    stamp.lineage.durableToken !== expected &&
    !acceptsLocalHead(previous, localHead(stamp))
  )
    throw new ProjectWriteConflict()
  const head = stamp ? { ...localHead(stamp), token: crypto.randomUUID() } : detachedHead(expected)
  await patchRetainedProject(scope, manifest, expected, {
    values: {
      assets: { id: manifest.id, assets: captured },
      meta: { ...v.meta, updatedAt: liveProject?.updatedAt ?? Date.now() },
    },
    nextHead: head,
    ready,
  })
  if (stamp) stamp.lineage.durableToken = head.token
}
export function detachedHead(base: string): LocalHead {
  return { version: 1, token: crypto.randomUUID(), writer: '', base, sequence: 0 }
}

export async function removeRetainedProject(
  scope: ProjectStorageScope,
  manifest: RetainedManifest,
  builderDeletion = false,
) {
  if (manifest.deleted) return
  const firstRecovery = await preserveLegacyRegionalEdit(scope, manifest)
  const recovery = firstRecovery.created
    ? await preserveLegacyRegionalEdit(scope, manifest)
    : firstRecovery
  const { meta } = await readRetainedParts(scope, manifest, ['meta'])
  let history: ReadonlyArray<readonly [IDBValidKey, unknown]> = []
  if (isDocumentRecord(meta) && meta.kind === 'pro') {
    const disk = await import('./proProjectHistory')
    await disk.quiesceProHistory(scope, manifest.id)
    const keys = await disk.proHistoryStorageKeys(scope, manifest.id)
    const values = await readValues(scope.store, keys)
    history = keys.map((key, index) => [key, values[index]] as const)
  }
  const previousBudget = recovery.guards.find(([key]) => key === applicationBudgetKey())?.[1]
  const budget = retainedApplications(manifest.id, undefined, previousBudget, [], true).budget
  delete budget.next[manifest.id]
  // Explicit deletion also discards the project's own exit copies, like its legacy sources. An
  // exit copy the editor cannot adopt (no blocks restored yet) used to block it forever.
  const drafts = await readRetainedDrafts(scope, manifest.id)
  const native = drafts.flatMap((draft) => (draft.native ? [draft.native] : []))
  const captured = new Map(
    drafts.flatMap((draft) => draft.journal.map((entry) => [entry.key, entry.encoded] as const)),
  )
  await commitRetainedProject(scope, {
    id: manifest.id,
    origin: manifest.origin,
    expectedToken: manifest.token,
    candidate: null,
    source: [...recovery.guards, ...native, ...history],
    retireLegacy: true,
    retire: [...native.map(([key]) => key), ...history.map(([key]) => key)],
    applicationBudget: budget,
    builderDeletion,
    // Another tab staging an exit right now still wins: only the captured mirrors may remain.
    ready: () => onlyCapturedJournal(scope, manifest.id, captured),
  })
  acknowledgeRetainedJournal(scope, drafts)
  if (firstRecovery.created && firstRecovery.fork)
    notifyRecoveredProjects(scope, [firstRecovery.fork])
}

function onlyCapturedJournal(
  scope: ProjectStorageScope,
  id: string,
  captured: ReadonlyMap<string, string>,
): boolean {
  if (!hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity, id)) return true
  try {
    const entries = readSynchronousExitJournal(scope.exitJournalStorage, scope.identity, id)
    return (
      entries.length > 0 &&
      entries.every(
        (entry) =>
          captured.get(entry.key) === entry.encoded &&
          scope.exitJournalStorage?.getItem(entry.key) === entry.encoded,
      )
    )
  } catch {
    return false
  }
}

/**
 * Editor-only: the single exit copy that continues the retained head. Cloud, export and the
 * gallery keep reading the committed revision. A copy staged before its blocks were restored
 * takes the durable blocks, as the regular recovery keeps the stored partition.
 */
export async function loadRetainedProjectDraft(
  scope: ProjectStorageScope,
  manifest: RetainedManifest,
): Promise<EditableStudioProject | null> {
  if (manifest.deleted) return null
  const drafts = await readRetainedDrafts(scope, manifest.id)
  if (!drafts.length) return null
  await preserveLegacySources(scope, manifest)
  const { head: stored } = await readRetainedParts(scope, manifest, ['head'])
  const head = retainedEditorHead(manifest, stored)
  const eligible = latestRecoveries(
    drafts
      .map(({ recovery }) => recovery)
      .filter((recovery) => retainedDraftRelation(head, recovery.head) === 'adoptable'),
  )
  // Never choose between competing writers silently.
  if (eligible.length !== 1) return null
  const draft = eligible[0]!
  // Classic retained projects have no Pro applications to replay.
  if (draft.resetApplications) return null
  const id = manifest.id
  const puts = [...(draft.write.puts ?? [])]
  if (draft.incompleteBlocks && !puts.some(([key]) => key === projectBlocksKey(id))) {
    const { blocks } = await readRetainedParts(scope, manifest, ['blocks'])
    if (blocks !== undefined) puts.push([projectBlocksKey(id), blocks])
  }
  const raw = projectFromRecovery({ ...draft, write: { ...draft.write, puts } })
  const project =
    raw && (await prepareEditableStudioProject(raw, { [PRIVATE_REGIONAL_PROJECT]: scope }))
  if (!project) return null
  installLocalRevision(project, scope.identity, head)
  const stamp = readLocalRevision(project)!
  stamp.lineage.recovery = true
  for (const record of draft.applications)
    stamp.lineage.pending.set(record.operationId, { sequence: stamp.sequence, record })
  stamp.lineage.recoverySources = [
    ...(draft.replacesRecovery ?? []),
    { key: projectRecoveryKey(id, draft.head.writer), token: draft.head.token },
  ]
  return project
}

/**
 * The gallery's regular recovery must leave a live retained project's exit copies alone when
 * they belong to its lineage: replaying them into the legacy rows forked a new
 * "(edição recuperada)" every session. Competing copies still become separate copies there.
 */
export async function retainedOwnsDrafts(scope: ProjectStorageScope, id: string) {
  const manifest = await readRetainedManifest(scope, id)
  if (!manifest || manifest.deleted) return false
  const drafts = await readRetainedDrafts(scope, id)
  if (!drafts.length) return false
  const { head: stored } = await readRetainedParts(scope, manifest, ['head'])
  const head = retainedEditorHead(manifest, stored)
  return drafts.some(({ recovery }) => retainedDraftRelation(head, recovery.head) !== 'competing')
}

/**
 * Thumbnail and game storage keep the authored head. An autosave that lands first only means the
 * values go over the newer head: pinning the old head token silently dropped the game's score.
 */
export async function editRetainedAuxiliary(
  scope: ProjectStorageScope,
  manifest: RetainedManifest,
  values: RetainedValues,
) {
  const captured = copyStudioProjectJson(values) as RetainedValues
  return patchRetainedProject(scope, manifest, null, { values: captured })
}
