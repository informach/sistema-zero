import type { StudioProAssistanceRequest } from '@sistemazero/core/studio/pro-assistance'
import { studioProChangeScopeIssue } from '@sistemazero/core/studio/pro-change-scope'
import {
  applyStudioProChange,
  createStudioProRevision,
  type StudioProChange,
  type StudioProRevision,
} from '@sistemazero/core/studio/pro-revision'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { encodeAssetBase64 } from '../core/assetBinary'
import {
  isPythonProject,
  type EditableStudioProject as Project,
  type PythonProProjectDocument,
} from '../core/editableProject'
import { buildProAssetBundle } from '../core/proAssets'
import { digestProAssistance, getProAssistance } from '../core/proAssistance'
import type { ProjectTree } from '../core/proProject'
import { flushProjectOperations, projectPersistence } from './projectOperations'
import { listProApplications, PRO_APPLICATION_LIMITS } from './projectStorageCoordinator'
import {
  installLocalRevision,
  type ProApplicationRecord,
  type ProAssetEdit,
  readLocalRevision,
} from './projectStorageRevision'
import { captureProjectStorageScope } from './projectStorageRuntime'
import type { ProjectStoreApi } from './projectStore'

export async function captureProRevision(project: Project): Promise<StudioProRevision> {
  return (await captureRevision(project, false)).base
}

export async function captureProRevisionPayload(project: Project) {
  return captureRevision(project, true)
}

async function captureRevision(project: Project, includeBinaries: boolean) {
  if (isPythonProject(project)) {
    const captured = copyStudioProjectJson(project)
    const { capturePythonProRevision, capturePythonProRevisionPayload } = await import(
      './pythonProRevision'
    )
    return includeBinaries
      ? capturePythonProRevisionPayload(captured)
      : { base: await capturePythonProRevision(captured), binaries: {} }
  }
  if (project.kind !== 'pro' || !project.tree || !project.proMeta)
    throw new Error('Abra um projeto profissional para construir com Zappy.')
  const { manifest, files: assetFiles } = await buildProAssetBundle(project.assets, project.tree, {
    legacyRuntime: Boolean(project.proMeta.origin),
  })
  const assetHashes: Record<string, string> = {}
  const binaries: Record<string, { base64: string; sha256: string }> = {}
  for (const [path, bytes] of assetFiles) {
    const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
    assetHashes[path] = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    if (includeBinaries) {
      binaries[path] = { base64: encodeAssetBase64(bytes), sha256: assetHashes[path]! }
    }
  }
  const base = await createStudioProRevision({
    projectId: project.id,
    templateId: project.proMeta.templateId,
    devScript: project.proMeta.devScript,
    files: Object.fromEntries(
      Object.entries(project.tree).flatMap(([path, node]) =>
        node.kind === 'file' ? [[path, node.content]] : [],
      ),
    ),
    directories: Object.entries(project.tree).flatMap(([path, node]) =>
      node.kind === 'dir' ? [path] : [],
    ),
    assets: JSON.stringify(manifest),
    assetFiles: assetHashes,
  })
  return { base, binaries }
}

/** Await async writers and hashing, then compare references again immediately before the atomic store write. */
export async function applyProRevision(
  store: ProjectStoreApi,
  projectId: string,
  change: StudioProChange,
): Promise<StudioProChange> {
  return applyRevision(store, projectId, change)
}

async function applyRevision(
  store: ProjectStoreApi,
  projectId: string,
  change: StudioProChange,
  decisionsHash?: string,
  inverseBudget?: number,
  beforePublish?: (inverse: StudioProChange, project: Project, assetInverse?: ProAssetEdit) => void,
  afterPublish?: () => void,
  assetEdit?: ProAssetEdit,
  request?: StudioProAssistanceRequest,
  expectedRevisionHash?: string,
): Promise<StudioProChange> {
  const scope = captureProjectStorageScope()
  const entryProject = store.getState().project
  const entryAdapter = projectPersistence(store)
  await flushProjectOperations(store, projectId)
  const project = store.getState().project
  if (
    !project ||
    project.id !== projectId ||
    project !== entryProject ||
    projectPersistence(store) !== entryAdapter ||
    captureProjectStorageScope() !== scope
  )
    throw new Error('O projeto aberto mudou.')
  if (decisionsHash && (await digestProAssistance(getProAssistance(project))) !== decisionsHash)
    throw new Error('As decisões mudaram desde esta proposta. Revise ou gere uma nova proposta.')
  const base = await captureProRevision(project)
  const scopeIssue = studioProChangeScopeIssue(request, base.files, change)
  if (scopeIssue) throw new Error(scopeIssue)
  let assetInverse: ProAssetEdit | undefined
  let materials:
    | { assets: NonNullable<Project['assets']>; coverAssetName: string | null }
    | undefined
  if (assetEdit) {
    if (
      base.hash !== change.baseHash ||
      change.patches.length ||
      change.directories ||
      change.configuration
    )
      throw new Error('Os materiais mudaram. Confira a operação novamente.')
    if (
      !Number.isSafeInteger(assetEdit.index) ||
      assetEdit.index < 0 ||
      (project.coverAssetName ?? null) !== assetEdit.cover.before
    )
      throw new Error('A capa ou a posição do material mudou.')
    const assets = [...(project.assets ?? [])]
    const index = assets.findIndex((asset) => asset.id === assetEdit.id)
    const previous = index < 0 ? null : assets[index]!
    if (
      (assetEdit.value &&
        (index >= 0 || assetEdit.value.id !== assetEdit.id || assetEdit.index > assets.length)) ||
      (!assetEdit.value && index < 0)
    )
      throw new Error('Este material já foi alterado. Suas edições foram preservadas.')
    if (assetEdit.value) assets.splice(assetEdit.index, 0, assetEdit.value)
    else assets.splice(index, 1)
    materials = { assets, coverAssetName: assetEdit.cover.after }
    assetInverse = {
      id: assetEdit.id,
      value: previous,
      index: previous ? index : assetEdit.index,
      cover: { before: assetEdit.cover.after, after: assetEdit.cover.before },
    }
  }
  const { revision, inverse } = materials
    ? await (async () => {
        const revision = await captureProRevision({ ...project, assets: materials.assets })
        return {
          revision,
          inverse: {
            baseHash: revision.hash,
            summary: `Recuperar: ${change.summary}`,
            patches: [],
          } satisfies StudioProChange,
        }
      })()
    : await applyStudioProChange(base, change)
  if (expectedRevisionHash && revision.hash !== expectedRevisionHash)
    throw new Error(
      'As alterações não correspondem à proposta verificada. Consulte o estado e revise novamente.',
    )
  if (
    inverseBudget !== undefined &&
    new TextEncoder().encode(JSON.stringify({ inverse, assetInverse })).byteLength + 2048 >
      inverseBudget
  )
    throw new Error(
      'Esta proposta é grande demais para um desfazer local completo. Divida a mudança em partes menores.',
    )
  const tree: ProjectTree = Object.fromEntries([
    ...revision.directories.map((path) => [path, { kind: 'dir' as const }] as const),
    ...Object.entries(revision.files).map(
      ([path, content]) => [path, { kind: 'file' as const, content }] as const,
    ),
  ])
  let pythonConfiguration:
    | Pick<PythonProProjectDocument, 'runtime' | 'python' | 'installedExtensions'>
    | undefined
  if (isPythonProject(project)) {
    if (
      project.kind !== 'pro' ||
      revision.version !== 2 ||
      revision.configuration.programmingLanguage !== 'python'
    )
      throw new Error('A revisão não pertence a este ambiente Python.')
    const configuration = revision.configuration
    const { refinePythonProProjectDocument } = await import('./pythonProProjectValidation')
    const { buildPythonAssetBundle } = await import('../core/pythonAssets')
    await buildPythonAssetBundle(materials?.assets ?? project.assets, {
      files: Object.keys(revision.files),
      directories: revision.directories,
    })
    const next = await refinePythonProProjectDocument({
      ...project,
      tree,
      assets: materials?.assets ?? project.assets,
      runtime: configuration.runtime,
      python: configuration.python,
      installedExtensions: configuration.extensions.map((extension) => ({
        ...extension,
        installedAt:
          project.installedExtensions.find(
            (current) => current.id === extension.id && current.version === extension.version,
          )?.installedAt ?? Date.now(),
      })),
    })
    pythonConfiguration = {
      runtime: next.runtime,
      python: next.python,
      installedExtensions: next.installedExtensions,
    }
  } else await buildProAssetBundle(materials?.assets ?? project.assets, tree)
  // Includes edits to assets/metadata while digesting, even when the source tree is unchanged.
  if (
    captureProjectStorageScope() !== scope ||
    store.getState().project !== project ||
    projectPersistence(store) !== entryAdapter
  )
    throw new Error('O projeto mudou durante a revisão. Suas edições foram preservadas.')
  const error = store
    .getState()
    .reconcileProFiles(
      projectId,
      project.tree!,
      tree,
      beforePublish ? (next) => beforePublish(inverse, next, assetInverse) : undefined,
      materials,
      pythonConfiguration,
    )
  if (error) throw new Error(error)
  afterPublish?.()
  return inverse
}

export { listProApplications } from './projectStorageCoordinator'
export type { ProApplicationRecord } from './projectStorageRevision'
export interface ProProposalApplication {
  operationId: string
  jobId: string
  change: StudioProChange
  request: StudioProAssistanceRequest
  expectedRevisionHash?: string
  requestId?: string
  decisionsHash?: string
  undoOf?: string
}
export interface ProApplicationReceipt {
  operationId: string
  status: 'session' | 'pending' | 'saved'
  beforeHash: string
  afterHash: string
  inverse: StudioProChange
  error?: string
}
const sessionApplications = new WeakMap<
  ProjectStoreApi,
  Map<string, { record: ProApplicationRecord; receipt: ProApplicationReceipt }>
>()
// Keep the transaction ACK even when the same store subsequently hydrates another snapshot.
const receiptAcknowledgements = new WeakMap<ProApplicationReceipt, Set<string>>()
function applications(store: ProjectStoreApi) {
  let entries = sessionApplications.get(store)
  if (!entries) {
    entries = new Map()
    sessionApplications.set(store, entries)
  }
  return entries
}
function receiptFor(
  record: ProApplicationRecord,
  status: ProApplicationReceipt['status'],
): ProApplicationReceipt {
  return {
    operationId: record.operationId,
    status,
    beforeHash: record.beforeHash,
    afterHash: record.afterHash,
    inverse: record.inverse,
  }
}
interface ProDocumentApplication extends Omit<ProProposalApplication, 'jobId' | 'request'> {
  request?: StudioProAssistanceRequest
  source: 'editor' | 'zappy'
  jobId?: string
  pathMap?: Record<string, string>
  assetEdit?: ProAssetEdit
}
function validateApplication(input: ProDocumentApplication): void {
  if (input.assetEdit && input.source !== 'editor')
    throw new Error('Somente uma operação local pode alterar materiais.')
  if (input.source === 'zappy' && !input.jobId) throw new Error('Construção sem identificação.')
  for (const id of [input.operationId, input.jobId, input.requestId, input.undoOf])
    if (id !== undefined && !/^[A-Za-z0-9:_-]{1,160}$/.test(id))
      throw new Error('Identificação de aplicação inválida.')
  if (input.decisionsHash !== undefined && !/^[a-f0-9]{64}$/.test(input.decisionsHash))
    throw new Error('Revisão de decisões inválida.')
}

/** Retry retains operationId and only saves the already applied document; never reapplies its patch. */
export async function applyProProposal(
  store: ProjectStoreApi,
  projectId: string,
  input: ProProposalApplication,
): Promise<ProApplicationReceipt> {
  return applyProDocument(store, projectId, { ...input, source: 'zappy' })
}

export async function applyProEditorChange(
  store: ProjectStoreApi,
  projectId: string,
  input: Omit<
    ProDocumentApplication,
    'source' | 'jobId' | 'decisionsHash' | 'requestId' | 'request'
  >,
  onPublish?: (tree: ProjectTree) => void,
  beforeCommit?: () => void,
): Promise<ProApplicationReceipt> {
  return applyProDocument(store, projectId, { ...input, source: 'editor' }, onPublish, beforeCommit)
}

async function applyProDocument(
  store: ProjectStoreApi,
  projectId: string,
  input: ProDocumentApplication,
  onPublish?: (tree: ProjectTree) => void,
  beforeCommit?: () => void,
): Promise<ProApplicationReceipt> {
  const entryScope = captureProjectStorageScope()
  const entryProject = store.getState().project
  const entryAdapter = projectPersistence(store)
  if (!entryProject || entryProject.id !== projectId) throw new Error('O projeto aberto mudou.')
  const assertEntry = () => {
    if (
      captureProjectStorageScope() !== entryScope ||
      store.getState().project !== entryProject ||
      projectPersistence(store) !== entryAdapter
    )
      throw new Error(
        'O perfil ou projeto mudou durante a aplicação. Suas edições foram preservadas.',
      )
  }
  validateApplication(input)
  const adapter = entryAdapter
  const localScope = adapter?.localScope
  listProSessionApplications(store, projectId)
  const sessionKey = `${localScope?.identity ?? 'session'}\0${projectId}\0${input.operationId}`
  const cached = applications(store).get(sessionKey)
  if (cached) {
    if (
      cached.record.beforeHash !== input.change.baseHash ||
      cached.record.jobId !== input.jobId ||
      cached.record.source !== input.source
    )
      throw new Error('Esta identificação já pertence a outra aplicação.')
    if (cached.receipt.status !== 'pending') return cached.receipt
    return saveApplication(store, projectId, cached.record, cached.receipt)
  }
  if (localScope) {
    const existing = (await listProApplications(localScope, projectId)).find(
      (record) => record.operationId === input.operationId,
    )
    assertEntry()
    if (existing) {
      if (
        existing.beforeHash !== input.change.baseHash ||
        existing.jobId !== input.jobId ||
        existing.source !== input.source
      )
        throw new Error('Esta identificação já pertence a outra aplicação.')
      const receipt = receiptFor(existing, 'saved')
      applications(store).set(sessionKey, { record: existing, receipt })
      return receipt
    }
  }
  const entries = applications(store)
  const projectEntries = [...entries].filter(([key]) =>
    key.startsWith(`${localScope?.identity ?? 'session'}\0${projectId}\0`),
  )
  if (
    projectEntries.filter(([, entry]) => entry.receipt.status === 'pending').length >=
    PRO_APPLICATION_LIMITS.operations
  )
    throw new Error('Guarde as aplicações pendentes antes de aplicar outra proposta.')
  const pendingBytes = projectEntries
    .filter(([, entry]) => entry.receipt.status === 'pending')
    .reduce((total, [, entry]) => total + entry.record.bytes, 0)
  const profilePrefix = `${localScope?.identity ?? 'session'}\0`
  const profilePending = [...entries]
    .filter(([key, entry]) => key.startsWith(profilePrefix) && entry.receipt.status === 'pending')
    .reduce((total, [, entry]) => total + entry.record.bytes, 0)
  let applied:
    | { project: Project; record: ProApplicationRecord; receipt: ProApplicationReceipt }
    | undefined
  await applyRevision(
    store,
    projectId,
    input.change,
    input.decisionsHash,
    Math.min(
      PRO_APPLICATION_LIMITS.projectBytes - pendingBytes,
      PRO_APPLICATION_LIMITS.profileBytes - profilePending,
    ),
    (inverse, project, assetInverse) => {
      beforeCommit?.()
      const record: ProApplicationRecord = {
        version: 1,
        operationId: input.operationId,
        source: input.source,
        ...(input.jobId ? { jobId: input.jobId } : {}),
        label: input.change.summary,
        ...(input.pathMap ? { pathMap: input.pathMap } : {}),
        projectId,
        beforeHash: input.change.baseHash,
        afterHash: inverse.baseHash,
        inverse,
        ...(assetInverse ? { assetInverse } : {}),
        createdAt: Date.now(),
        bytes: 0,
        ...(input.requestId ? { requestId: input.requestId } : {}),
        ...(input.decisionsHash ? { decisionsHash: input.decisionsHash } : {}),
        ...(input.undoOf ? { undoOf: input.undoOf } : {}),
      }
      // Count serialized bytes including the count itself, conservatively bounded to its decimal width.
      record.bytes = new TextEncoder().encode(JSON.stringify(record)).byteLength + 16
      const receipt = receiptFor(record, localScope ? 'pending' : 'session')
      if (localScope) {
        if (!readLocalRevision(project)) installLocalRevision(project, localScope.identity)
        const stamp = readLocalRevision(project)!
        receiptAcknowledgements.set(receipt, stamp.lineage.saved)
        stamp.lineage.pending.set(input.operationId, { sequence: stamp.sequence, record })
      }
      applications(store).set(sessionKey, { record, receipt })
      applied = { project, record, receipt }
    },
    () => {
      if (applied && store.getState().project === applied.project)
        onPublish?.(applied.project.tree!)
    },
    input.assetEdit,
    input.request,
    input.expectedRevisionHash,
  )
  if (!applied) throw new Error('A revisão não foi publicada.')
  const { record, receipt } = applied
  const retained = [...applications(store)].filter(([key]) =>
    key.startsWith(`${localScope?.identity ?? 'session'}\0${projectId}\0`),
  )
  let retainedBytes = retained.reduce((total, [, value]) => total + value.record.bytes, 0)
  let retainedCount = retained.length
  for (const [key, entry] of retained) {
    if (
      retainedBytes <= PRO_APPLICATION_LIMITS.projectBytes &&
      retainedCount <= PRO_APPLICATION_LIMITS.operations
    )
      break
    if (key === sessionKey || entry.receipt.status === 'pending') continue
    applications(store).delete(key)
    retainedBytes -= entry.record.bytes
    retainedCount--
  }
  let memoryBytes = [...applications(store).values()].reduce(
    (sum, entry) => sum + entry.record.bytes,
    0,
  )
  for (const [key, entry] of applications(store)) {
    if (memoryBytes <= PRO_APPLICATION_LIMITS.profileBytes) break
    if (key === sessionKey || entry.receipt.status === 'pending') continue
    applications(store).delete(key)
    memoryBytes -= entry.record.bytes
  }
  if (!localScope) return receipt
  // A subscriber may have switched projects/profiles after publication. The inverse remains
  // attached to the original snapshot for its own autosave/pagehide, never to the new editor.
  if (captureProjectStorageScope() !== entryScope || projectPersistence(store) !== entryAdapter)
    return receipt
  return saveApplication(store, projectId, record, receipt)
}

async function saveApplication(
  store: ProjectStoreApi,
  projectId: string,
  record: ProApplicationRecord,
  receipt: ProApplicationReceipt,
): Promise<ProApplicationReceipt> {
  const project = store.getState().project
  const adapter = projectPersistence(store)
  if (!project || project.id !== projectId || !adapter?.localScope) return receipt
  try {
    const stamp = readLocalRevision(project)
    if (stamp?.lineage.saved.has(record.operationId)) {
      receipt.status = 'saved'
      delete receipt.error
      return { ...receipt }
    }
    if (!stamp?.lineage.pending.has(record.operationId)) {
      const existing = (await listProApplications(adapter.localScope, projectId)).find(
        (item) =>
          item.operationId === record.operationId &&
          item.afterHash === record.afterHash &&
          item.beforeHash === record.beforeHash,
      )
      if (existing) {
        receipt.status = 'saved'
        delete receipt.error
        return { ...receipt }
      }
      throw new Error(
        'A edição aplicada não está mais aberta nesta sessão. Reabra a cópia preservada antes de continuar.',
      )
    }
    await adapter.save(project)
    const saved = readLocalRevision(project)?.lineage.saved.has(record.operationId)
    if (!saved) throw new Error('A aplicação ainda aguarda confirmação local.')
    receipt.status = 'saved'
    delete receipt.error
    if (store.getState().project === project) store.getState().markSaved()
  } catch (error) {
    receipt.status = 'pending'
    receipt.error = error instanceof Error ? error.message : 'A gravação local falhou.'
    if (store.getState().project === project) store.getState().markSaveFailed(receipt.error)
  }
  return { ...receipt }
}

export async function undoProApplication(
  store: ProjectStoreApi,
  projectId: string,
  operationId: string,
  undoOperationId = `undo:${operationId}`,
  onPublish?: (tree: ProjectTree, pathMap: Record<string, string>) => void,
): Promise<ProApplicationReceipt> {
  const scope = captureProjectStorageScope()
  const project = store.getState().project
  const adapter = projectPersistence(store)
  const session = listProSessionApplications(store, projectId)
  const records = adapter?.localScope
    ? [
        ...(await listProApplications(adapter.localScope, projectId)),
        ...session
          .filter((entry) => entry.receipt.status === 'pending')
          .map((entry) => entry.record),
      ]
    : session.map((entry) => entry.record)
  if (
    captureProjectStorageScope() !== scope ||
    store.getState().project !== project ||
    projectPersistence(store) !== adapter
  )
    throw new Error('O perfil ou projeto mudou durante o desfazer.')
  const record = records.find(
    (entry) => entry.projectId === projectId && entry.operationId === operationId,
  )
  if (!record) throw new Error('Este desfazer expirou ou não está disponível neste aparelho.')
  const pathMap = Object.fromEntries(
    Object.entries(record.pathMap ?? {}).map(([from, to]) => [to, from]),
  )
  return applyProDocument(
    store,
    projectId,
    {
      operationId: undoOperationId,
      source: record.source,
      jobId: record.jobId,
      change: record.inverse,
      undoOf: operationId,
      pathMap,
      ...(record.assetInverse ? { assetEdit: record.assetInverse } : {}),
    },
    onPublish ? (tree) => onPublish(tree, pathMap) : undefined,
  )
}

export function listProSessionApplications(
  store: ProjectStoreApi,
  projectId: string,
): Array<{ record: ProApplicationRecord; receipt: ProApplicationReceipt }> {
  const prefix = `${projectPersistence(store)?.localScope?.identity ?? 'session'}\0${projectId}\0`
  const project = store.getState().project
  const recovery = project?.id === projectId ? readLocalRevision(project) : undefined
  if (recovery?.lineage.recovery) {
    for (const { record } of recovery.lineage.pending.values()) {
      const key = `${prefix}${record.operationId}`
      if (!applications(store).has(key)) {
        const receipt = receiptFor(record, 'pending')
        receiptAcknowledgements.set(receipt, recovery.lineage.saved)
        applications(store).set(key, { record, receipt })
      }
    }
  }
  const saved = project?.id === projectId ? readLocalRevision(project)?.lineage.saved : undefined
  for (const [key, value] of applications(store)) {
    if (
      key.startsWith(prefix) &&
      (saved?.has(value.record.operationId) ||
        receiptAcknowledgements.get(value.receipt)?.has(value.record.operationId))
    ) {
      value.receipt.status = 'saved'
      delete value.receipt.error
    }
  }
  return [...applications(store)]
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => ({ record: value.record, receipt: { ...value.receipt } }))
}

export async function retryProApplication(
  store: ProjectStoreApi,
  projectId: string,
  operationId: string,
): Promise<ProApplicationReceipt> {
  listProSessionApplications(store, projectId)
  const key = `${projectPersistence(store)?.localScope?.identity ?? 'session'}\0${projectId}\0${operationId}`
  const existing = applications(store).get(key)
  if (!existing) throw new Error('Esta gravação não está mais disponível nesta sessão.')
  if (existing.receipt.status !== 'pending') return existing.receipt
  return saveApplication(store, projectId, existing.record, existing.receipt)
}
