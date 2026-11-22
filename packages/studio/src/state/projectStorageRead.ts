import {
  PRIVATE_REGIONAL_PROJECT,
  type PrivateRegionalProjectReadOptions,
} from '../core/pintaRegionalReference'
import type { ProjectAsset } from '../core/projectAssets'
import { ProjectDocumentError } from '../core/projectDocument'
import { readValue, readValues } from './idbTransaction'
import {
  PROJECT_STORAGE_VERSION,
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectHeadKey,
  projectMetaKey,
  projectStateKey,
} from './projectStorageKeys'
import { assembleProjectRecord, type StoredProjectRecord } from './projectStorageRecords'
import { installLocalRevision, isLocalHead } from './projectStorageRevision'
import { isPrivateRegionalProjectScope, type ProjectStorageScope } from './projectStorageRuntime'
import { type ProjectSummary, projectEnvironmentSummary } from './projectSummary'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function assertCurrentProjectParts(id: string, meta: unknown, ...parts: unknown[]): void {
  if (PROJECT_STORAGE_VERSION !== 4) return
  if (
    [meta, ...parts].some((value) => value !== undefined && (!isRecord(value) || value.id !== id))
  )
    throw new ProjectDocumentError(
      'invalid-document',
      'Uma parte deste projeto pertence a outra identidade. As partes foram preservadas.',
      id,
    )
  if (isRecord(meta) && meta.storageVersion !== 4)
    throw new ProjectDocumentError(
      'invalid-document',
      'O projeto local usa uma versão incompatível. As partes foram preservadas.',
      id,
    )
}

export async function readCurrentProject(
  id: string,
  scope: ProjectStorageScope,
  snapshot?: readonly unknown[],
): Promise<StoredProjectRecord | null> {
  const kvStore = scope.store
  const [meta, files, state, blocks, assets, head] =
    snapshot ??
    (await readValues(kvStore, [
      projectMetaKey(id),
      projectFilesKey(id),
      projectStateKey(id),
      projectBlocksKey(id),
      projectAssetsKey(id),
      projectHeadKey(id),
    ]))
  if (
    PROJECT_STORAGE_VERSION === 4 &&
    isLocalHead(head) &&
    head.deleted &&
    [meta, files, state, blocks, assets].some((value) => value !== undefined)
  )
    throw new ProjectDocumentError(
      'invalid-document',
      'Há conteúdo junto de uma revisão excluída. As partes foram preservadas.',
      id,
    )
  assertCurrentProjectParts(id, meta, files, state, blocks, assets)
  if (meta && files && state) {
    // `assets` é a 4ª partição (opcional): ausente em projetos legados/pré-feature.
    const project = assembleProjectRecord(id, meta, files, state, assets, blocks)
    if (project)
      return installLocalRevision(project, scope.identity, isLocalHead(head) ? head : undefined)
    if (PROJECT_STORAGE_VERSION === 4)
      throw new ProjectDocumentError(
        'invalid-document',
        'As partes deste projeto são incompatíveis. Elas foram preservadas.',
        id,
      )
    return null
  }

  if (
    PROJECT_STORAGE_VERSION === 4 &&
    [meta, files, state, blocks, assets].some((value) => value !== undefined)
  )
    throw new ProjectDocumentError(
      'invalid-document',
      'As partes deste projeto estão incompletas ou incompatíveis. Elas foram preservadas.',
      id,
    )
  return null
}

export async function readProjectShell(
  id: string,
  scope: ProjectStorageScope,
): Promise<StoredProjectRecord | null> {
  const kvStore = scope.store
  const [meta, files, assets, head] = await readValues(kvStore, [
    projectMetaKey(id),
    projectFilesKey(id),
    projectAssetsKey(id),
    projectHeadKey(id),
  ])
  assertCurrentProjectParts(id, meta, files, assets)
  if (
    PROJECT_STORAGE_VERSION === 4 &&
    isLocalHead(head) &&
    head.deleted &&
    [meta, files, assets].some((value) => value !== undefined)
  )
    throw new ProjectDocumentError(
      'invalid-document',
      'Há conteúdo junto de uma revisão excluída. As partes foram preservadas.',
      id,
    )
  if (meta && files) {
    const project = assembleProjectRecord(
      id,
      meta,
      files,
      { id, ir: null, blocksState: null },
      assets,
    )
    return project
      ? installLocalRevision(project, scope.identity, isLocalHead(head) ? head : undefined)
      : null
  }

  return null
}

export async function readProjectAssetsSnapshot(
  id: string,
  scope: ProjectStorageScope,
  prepareHistorical: () => Promise<void>,
  options: PrivateRegionalProjectReadOptions = {},
): Promise<{
  assets: ProjectAsset[]
  environment: Pick<ProjectSummary, 'programmingLanguage' | 'kind' | 'runtime'>
  observedHead?: string | null
}> {
  let [record, head, meta] = await readValues(scope.store, [
    projectAssetsKey(id),
    projectHeadKey(id),
    projectMetaKey(id),
  ])
  if (
    PROJECT_STORAGE_VERSION === 4 &&
    record === undefined &&
    meta === undefined &&
    !isLocalHead(head)
  ) {
    const old = await readValues(scope.store, [
      projectMetaKey(id, 3),
      projectHeadKey(id, 3),
      projectAssetsKey(id, 3),
    ])
    if (old.some((value) => value !== undefined)) {
      await prepareHistorical()
      ;[record, head, meta] = await readValues(scope.store, [
        projectAssetsKey(id),
        projectHeadKey(id),
        projectMetaKey(id),
      ])
    }
  }
  assertCurrentProjectParts(id, meta, record)
  const environment = isRecord(meta)
    ? projectEnvironmentSummary(meta)
    : { programmingLanguage: 'unknown' as const }
  if (!isRecord(record)) return { assets: [], environment }
  const privateRead = options[PRIVATE_REGIONAL_PROJECT]
  if (privateRead && (privateRead !== scope || !isPrivateRegionalProjectScope(scope)))
    throw new Error('A captura regional requer um perfil de teste local.')
  if (
    privateRead &&
    (!isRecord(meta) ||
      (meta.formatVersion !== 2 && meta.formatVersion !== 3) ||
      environment.programmingLanguage === 'unknown')
  )
    throw new ProjectDocumentError(
      'invalid-document',
      'A captura regional precisa de um projeto compatível.',
    )
  const regionalMaterials = privateRead
    ? await (await import('../core/pintaRegionalProjectAdmission')).admitRegionalProjectAssets(
        record.assets,
        scope.signal,
      )
    : undefined
  const assets =
    isRecord(meta) && meta.programmingLanguage === 'python'
      ? (await import('../core/pythonAssets')).sanitizePythonProjectAssets(
          record.assets,
          regionalMaterials,
        )
      : (await import('../core/projectAssets')).sanitizeProjectAssets(record.assets, {
          regionalMaterials,
        })
  // A mesma trava da abertura completa: a limpeza não pode tirar nada do que está no disco. Sem
  // ela, uma cena que esta versão não lê (gravada por um Estúdio mais novo) ou que passou do
  // orçamento saía calada aqui, e a varredura dos desenhos regravava a lista inteira sem ela.
  const { assertProjectContentPreserved } = await import('../core/projectDocumentGuards')
  assertProjectContentPreserved({ assets: record.assets }, { assets })
  return {
    assets,
    environment,
    observedHead: isLocalHead(head) ? head.token : head == null ? null : undefined,
  }
}

export async function readProjectMeta(
  id: string,
  scope: ProjectStorageScope,
  historical: () => Promise<StoredProjectRecord | null>,
): Promise<Record<string, unknown> | null> {
  const kvStore = scope.store
  const meta = await readValue(kvStore, projectMetaKey(id))
  assertCurrentProjectParts(id, meta)
  if (isRecord(meta)) return meta
  const project = await historical()
  if (!project) return null
  const migratedMeta = await readValue(kvStore, projectMetaKey(id))
  return isRecord(migratedMeta) ? migratedMeta : null
}

export async function readProjectBlocks(
  id: string,
  scope: ProjectStorageScope,
  historical: () => Promise<StoredProjectRecord | null>,
): Promise<unknown | null> {
  const kvStore = scope.store
  const fromPartition = await readValue(kvStore, projectBlocksKey(id))
  assertCurrentProjectParts(id, undefined, fromPartition === null ? undefined : fromPartition)
  if (fromPartition != null) return fromPartition
  if (PROJECT_STORAGE_VERSION === 4 && (await readValue(kvStore, projectMetaKey(id))) !== undefined)
    return null
  const project = await historical()
  return project?.blocksState ? { id, blocksState: project.blocksState } : null
}
