import { sha256Hex } from '@sistemazero/core/creations'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { hasRegionalPintaReference, PRIVATE_REGIONAL_PROJECT } from '../core/pintaRegionalReference'
import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocumentGuards'
import { sanitizePreviewStorageData } from '../preview/types'
import { prepareEditableStudioProject } from '../state/editableProjectValidation'
import { readValues } from '../state/idbTransaction'
import {
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
} from '../state/projectStorageKeys'
import { assertCurrentProjectParts } from '../state/projectStorageRead'
import { assembleProjectRecord } from '../state/projectStorageRecords'
import { isLocalHead, ProjectWriteConflict } from '../state/projectStorageRevision'
import {
  gameStorageKey,
  isPrivateRegionalProjectScope,
  type ProjectStorageScope,
} from '../state/projectStorageRuntime'
import { projectEnvironmentSummary } from '../state/projectSummary'
import { thumbDataUrlOf } from '../state/projectThumbData'
import {
  prepareRetainedParts,
  RETAINED_PARTS,
  type RetainedPart,
} from '../state/retainedProjectParts'
import {
  commitRetainedProject,
  type RetainedManifest,
  readRetainedManifest,
  retainedProjectKey,
} from '../state/retainedProjectStore'
import { hasSynchronousExitJournal } from '../state/synchronousExitJournalProbe'
import { localSnapshotsEqual } from './localTransaction'

type SourceValues = Partial<Record<RetainedPart, unknown>>
export function legacyProjectKeys(id: string): Record<RetainedPart, string> {
  return {
    meta: projectMetaKey(id),
    files: projectFilesKey(id),
    state: projectStateKey(id),
    blocks: projectBlocksKey(id),
    assets: projectAssetsKey(id),
    thumb: projectThumbKey(id),
    head: projectHeadKey(id),
    applications: projectApplicationsKey(id),
    source: projectMigrationKey(id),
    game: gameStorageKey(id),
  }
}
function pending(): never {
  throw new ProjectDocumentError(
    'migration-pending',
    'A edição anterior precisa ser recuperada por inteiro antes de promover o projeto. Os arquivos permanecem disponíveis.',
  )
}
export async function readLegacyRegionalSource(scope: ProjectStorageScope, id: string) {
  const keys = legacyProjectKeys(id)
  const raw = await readValues(
    scope.store,
    RETAINED_PARTS.map((part) => keys[part]),
  )
  const values: SourceValues = {}
  const guards = RETAINED_PARTS.map((part, i) => {
    if (raw[i] !== undefined) values[part] = raw[i]
    return [keys[part], raw[i]] as const
  })
  return { values, guards }
}
function classicSource(id: string, v: SourceValues) {
  assertCurrentProjectParts(id, v.meta, v.files, v.state, v.blocks, v.assets)
  if (
    !isDocumentRecord(v.meta) ||
    v.meta.storageVersion !== 4 ||
    !isLocalHead(v.head) ||
    v.head.deleted ||
    v.head.token.length === 0 ||
    v.head.sequence < 0 ||
    Object.keys(v.head).some(
      (key) => !['version', 'writer', 'sequence', 'base', 'token'].includes(key),
    )
  )
    pending()
  const environment = projectEnvironmentSummary(v.meta)
  if (environment.programmingLanguage !== 'javascript' || environment.kind !== 'classic') pending()
  if (
    v.source !== undefined ||
    (v.applications !== undefined &&
      (!Array.isArray(v.applications) || v.applications.length !== 0))
  )
    pending()
  if (
    v.thumb !== undefined &&
    (!isDocumentRecord(v.thumb) || v.thumb.id !== id || !thumbDataUrlOf(v.thumb))
  )
    pending()
  if (v.game !== undefined && !localSnapshotsEqual(sanitizePreviewStorageData(v.game), v.game))
    pending()
  // Assembly spreads partition fields. Refuse overlapping values instead of authorizing an overwrite.
  const fields = new Map<string, unknown>()
  for (const part of [v.meta, v.files, v.state, v.blocks, v.assets])
    if (isDocumentRecord(part)) {
      for (const [key, value] of Object.entries(part)) {
        if (fields.has(key) && !localSnapshotsEqual(fields.get(key), value)) pending()
        fields.set(key, value)
      }
    }
  const raw = assembleProjectRecord(id, v.meta, v.files, v.state, v.assets, v.blocks)
  if (!raw) pending()
  return raw
}

/** The active V4 stays untouched. A pre-existing private PNG5 may also be adopted on its exact head. */
export async function promoteLocalRegionalProject(options: {
  scope: ProjectStorageScope
  id: string
  expectedV4Token: string
  assets?: unknown
  ready?: () => boolean
}) {
  const { scope, id, expectedV4Token, ready } = options
  if (!isPrivateRegionalProjectScope(scope))
    throw Error('A promoção regional requer um perfil local de teste.')
  const replacement = copyStudioProjectJson(options.assets)
  const { values, guards } = await readLegacyRegionalSource(scope, id)
  const raw = classicSource(id, values)
  if (!isLocalHead(values.head) || values.head.token !== expectedV4Token)
    throw new ProjectWriteConflict()
  const readOptions = { [PRIVATE_REGIONAL_PROJECT]: scope }
  if (!(await prepareEditableStudioProject(raw, readOptions))) pending()
  const candidate = { ...values }
  if (replacement !== undefined) {
    if (!Array.isArray(replacement)) pending()
    candidate.assets = {
      ...(isDocumentRecord(values.assets) ? values.assets : { id }),
      assets: replacement,
    }
  }
  const authored = classicSource(id, candidate)
  if (
    !Array.isArray(authored.assets) ||
    !authored.assets.some(hasRegionalPintaReference) ||
    !(await prepareEditableStudioProject(authored, readOptions))
  )
    pending()
  const next = await prepareRetainedParts(values)
  const origin = await authoredOrigin(next.parts)
  if (replacement !== undefined) {
    const updated = await prepareRetainedParts({ assets: candidate.assets })
    next.parts.assets = updated.parts.assets!
    for (const [hash, body] of updated.bodies) next.bodies.set(hash, body)
  }
  const prefix = projectRecoveryKey(id, '')
  return commitRetainedProject(scope, {
    id,
    origin,
    candidate: next,
    expectedToken: null,
    source: guards,
    absent: [IDBKeyRange.bound(prefix, prefix + '\uffff')],
    ready: () =>
      ready?.() !== false &&
      !hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity, id),
  })
}

async function authoredOrigin(parts: Awaited<ReturnType<typeof prepareRetainedParts>>['parts']) {
  // A freshly bound legacy head is evidence for CAS. It is not itself an authored edit.
  const { head: _head, ...authored } = parts
  return sha256Hex(JSON.stringify(authored))
}
export async function preserveLegacyRegionalEdit(
  scope: ProjectStorageScope,
  parent: RetainedManifest,
) {
  const { id, origin: parentOrigin } = parent
  const expectedParent = JSON.stringify(parent)
  const observed = await readRetainedManifest(scope, id)
  if (!observed || JSON.stringify(observed) !== expectedParent) throw new ProjectWriteConflict()
  const { values, guards } = await readLegacyRegionalSource(scope, id)
  const dataParts = [
    'meta',
    'files',
    'state',
    'blocks',
    'assets',
    'thumb',
    'game',
    'applications',
  ] as const
  if (
    !dataParts.some((key) => values[key] !== undefined) &&
    (values.head === undefined || (isLocalHead(values.head) && values.head.deleted))
  )
    return { guards }
  const raw = classicSource(id, values)
  const captured = await prepareRetainedParts(values)
  const origin = await authoredOrigin(captured.parts)
  // The original private measurement revision included the legacy CAS token in its origin.
  if (origin === parentOrigin || (await sha256Hex(JSON.stringify(captured.parts))) === parentOrigin)
    return { guards }
  const scopeMarker = await sha256Hex(JSON.stringify([id, origin]))
  const targetId = `recuperado-${id.slice(0, 28)}-${scopeMarker.slice(0, 24)}`
  const already = await readRetainedManifest(scope, targetId)
  if (already) {
    if (already.origin !== scopeMarker) pending()
    return { guards, fork: targetId }
  }
  const dest = await readLegacyRegionalSource(scope, targetId)
  if (Object.keys(dest.values).length) pending()
  const recovered = await prepareEditableStudioProject(raw, { [PRIVATE_REGIONAL_PROJECT]: scope })
  if (!recovered) pending()
  const fork: SourceValues = { ...values }
  for (const key of ['meta', 'files', 'state', 'blocks', 'assets', 'thumb'] as const) {
    const value = values[key]
    if (isDocumentRecord(value)) fork[key] = { ...value, id: targetId }
  }
  if (!isDocumentRecord(fork.meta)) pending()
  fork.meta.name = `${recovered.name.slice(0, 175)} (edição recuperada)`
  delete fork.meta.publication
  const target = await prepareRetainedParts(fork)
  const noDraft = (projectId: string) => {
    const prefix = projectRecoveryKey(projectId, '')
    return IDBKeyRange.bound(prefix, prefix + '\uffff')
  }
  try {
    await commitRetainedProject(scope, {
      id: targetId,
      expectedToken: null,
      origin: scopeMarker,
      candidate: target,
      source: [...guards, ...dest.guards, [retainedProjectKey(id), expectedParent]],
      absent: [noDraft(id), noDraft(targetId)],
      ready: () =>
        !hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity, id) &&
        !hasSynchronousExitJournal(scope.exitJournalStorage, scope.identity, targetId),
    })
  } catch (error) {
    if (!(error instanceof ProjectWriteConflict)) throw error
    const committed = await readRetainedManifest(scope, targetId)
    if (committed?.origin !== scopeMarker) throw error
  }
  return { guards, fork: targetId }
}
