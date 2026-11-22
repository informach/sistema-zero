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
import type { IdbWrite } from './idbTransaction'
import { notifyRecoveredProjects } from './projectPersistenceEvents'
import { projectRecoveryKey } from './projectStorageKeys'
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
import { invalidRetention, prepareRetainedParts, type RetainedPart } from './retainedProjectParts'
import {
  commitRetainedProject,
  type RetainedManifest,
  readRetainedManifest,
  readRetainedParts,
} from './retainedProjectStore'
import { hasSynchronousExitJournal } from './synchronousExitJournalProbe'

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
  try {
    const saved = await preserveLegacyRegionalEdit(scope, manifest)
    if (saved.created && saved.fork) notifyRecoveredProjects(scope, [saved.fork])
  } catch (error) {
    // Canonical bytes stay independently accessible. The gallery offers the exact old records;
    // explicit deletion still requires the old source to be safely recoverable.
    scope.signal?.throwIfAborted()
    if (error instanceof DOMException && error.name === 'AbortError') throw error
  }
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

export interface RetainedPatch {
  /** A missing part here stays untouched. An explicitly supplied undefined removes only that part. */
  values: RetainedValues
  /** Only authored edits replace the editor head. Auxiliary updates preserve it. */
  nextHead?: LocalHead
  ready?: () => boolean
}
export async function patchRetainedProject(
  scope: ProjectStorageScope,
  first: RetainedManifest,
  expectedEditorToken: string,
  change: RetainedPatch,
) {
  if (first.deleted) throw new ProjectWriteConflict()
  const values = copyStudioProjectJson(change.values) as RetainedValues
  const nextHead = change.nextHead && { ...change.nextHead }
  const ready = change.ready
  let manifest = first
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const source = await readRetainedParts(scope, manifest)
      const current = retainedEditorHead(manifest, source.head)
      if (current.token !== expectedEditorToken) throw new ProjectWriteConflict()
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
        ready,
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
) {
  const stamp = readLocalRevision(project)
  if (
    !stamp ||
    stamp.lineage.scope !== scope.identity ||
    manifest.deleted ||
    stamp.lineage.pending.size
  )
    throw new ProjectWriteConflict()
  const snapshot = {
    puts: write.puts?.map(([key, value]) => [key, copyStudioProjectJson(value)] as const),
    deletes: [...(write.deletes ?? [])],
  }
  const source = await readRetainedParts(scope, manifest, ['head'])
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
  // A freshly minted publication token also distinguishes edits made to a reused project object.
  const head = { ...next, token: crypto.randomUUID() }
  await patchRetainedProject(scope, manifest, previous.token, { values: edits, nextHead: head })
  stamp.lineage.durableToken = head.token
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
) {
  if (manifest.deleted) return
  const recovery = await preserveLegacyRegionalEdit(scope, manifest)
  const noDraft = projectRecoveryKey(manifest.id, '')
  await commitRetainedProject(scope, {
    id: manifest.id,
    origin: manifest.origin,
    expectedToken: manifest.token,
    candidate: null,
    source: recovery.guards,
    retireLegacy: true,
    absent: [IDBKeyRange.bound(noDraft, noDraft + '\uffff')],
    ready: () => !hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity, manifest.id),
  })
  if (recovery.created && recovery.fork) notifyRecoveredProjects(scope, [recovery.fork])
}

export async function editRetainedAuxiliary(
  scope: ProjectStorageScope,
  manifest: RetainedManifest,
  values: RetainedValues,
) {
  const captured = copyStudioProjectJson(values) as RetainedValues
  const stored = await readRetainedParts(scope, manifest, ['head'])
  return patchRetainedProject(scope, manifest, retainedEditorHead(manifest, stored.head).token, {
    values: captured,
  })
}
