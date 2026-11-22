import { type PintaRegionalMarker, pintaRegionalMarkerOf } from '../core/pintaRegionalMaterial'
import { admitRegionalProjectAssets } from '../core/pintaRegionalProjectAdmission'
import { checkRegionalProjectPixels } from '../core/pintaRegionalProjectPixels'
import { PRIVATE_REGIONAL_PROJECT, UNSUPPORTED_PINTA_REGION } from '../core/pintaRegionalReference'
import { sanitizeProjectAssets } from '../core/projectAssets'
import { assertProjectContentPreserved } from '../core/projectDocumentGuards'
import { loadProjectAssetsSnapshotById, persistProjectAssets } from './persistence'
import { projectPersistence } from './projectOperations'
import { advanceLocalRevision, readLocalRevision } from './projectStorageRevision'
import { isPrivateRegionalProjectScope, type ProjectStorageScope } from './projectStorageRuntime'
import type { ProjectStoreApi } from './projectStore'

export { privateRegionalProjectScope } from './projectStorageRuntime'

/** Private local-only refresh. No program, project ID, source path or block is rewritten. */
export async function refreshPrivateRegionalProjectAsset(options: {
  scope: ProjectStorageScope
  projectId: string
  assetId: string
  capture: { dataUrl: string; width: number; height: number; regional: PintaRegionalMarker }
  signal?: AbortSignal
  /** The mounted local editor feeds its latest authored material list through the same disk CAS. */
  store?: ProjectStoreApi
  stillCurrent?: () => boolean
}): Promise<boolean> {
  const { scope, projectId, assetId, store, stillCurrent } = options
  const signal =
    scope.signal && options.signal
      ? AbortSignal.any([scope.signal, options.signal])
      : (scope.signal ?? options.signal)
  if (!isPrivateRegionalProjectScope(scope))
    throw new Error('A captura regional requer um perfil de teste local.')
  const capture = {
    dataUrl: options.capture.dataUrl,
    width: options.capture.width,
    height: options.capture.height,
    regional: { ...options.capture.regional },
  }
  signal?.throwIfAborted()
  const initial = store?.getState().project
  const open = initial?.id === projectId ? initial : undefined
  const localAdapter = store && projectPersistence(store)
  const revision = open && readLocalRevision(open)
  if (
    open &&
    (!localAdapter?.localScope ||
      localAdapter.localScope.identity !== scope.identity ||
      revision?.lineage.scope !== scope.identity ||
      store?.getState().editingAccess !== 'author')
  )
    return false
  const { assets: observed, environment } = await loadProjectAssetsSnapshotById(projectId, scope, {
    [PRIVATE_REGIONAL_PROJECT]: scope,
  })
  const assets = open?.assets ?? observed
  const original = assets.find((asset) => asset.id === assetId)
  const currentMarker = original && pintaRegionalMarkerOf(original)
  if (
    !['javascript', 'python'].includes(environment.programmingLanguage) ||
    !original ||
    original.kind !== 'image' ||
    original.source === 'lesson-art' ||
    original.libOrigin === 'molda' ||
    original.pintaImage ||
    (currentMarker && currentMarker.sourceId !== capture.regional.sourceId) ||
    (original.libId && original.libId !== `personal:${capture.regional.sourceId}`)
  )
    throw new Error(UNSUPPORTED_PINTA_REGION)

  const {
    scene: _scene,
    tilemap: _tilemap,
    tilemapFront: _front,
    sprite: _sprite,
    tileset: _tileset,
    ...identity
  } = original
  const next = assets.map((asset) =>
    asset === original
      ? {
          ...identity,
          ...(original.libId && !original.libOrigin ? { libOrigin: 'pinta' as const } : {}),
          ...capture,
        }
      : asset,
  )
  const admitted = await admitRegionalProjectAssets(next, signal, (_id, world) =>
    checkRegionalProjectPixels(world, signal),
  )
  const materials =
    environment.programmingLanguage === 'python'
      ? (await import('../core/pythonAssets')).sanitizePythonProjectAssets(next, admitted)
      : sanitizeProjectAssets(next, { regionalMaterials: admitted })
  assertProjectContentPreserved({ assets: next }, { assets: materials })
  const version =
    open && advanceLocalRevision(open, { ...open, assets: materials, updatedAt: Date.now() })
  const ownsEditor = () =>
    !open ||
    (store?.getState().project?.id === projectId &&
      store.getState().editingAccess === 'author' &&
      projectPersistence(store) === localAdapter &&
      readLocalRevision(store.getState().project!)?.lineage === revision?.lineage)
  const written = await persistProjectAssets(
    projectId,
    materials,
    scope,
    observed,
    () =>
      !signal?.aborted &&
      stillCurrent?.() !== false &&
      ownsEditor() &&
      (!store ||
        (open ? store.getState().project === open : store.getState().project?.id !== projectId)),
    version,
  )
  if (written && open && version && store && ownsEditor() && !signal?.aborted) {
    const current = store.getState().project
    if (current === open) store.setState({ project: version })
    else if (current?.assets?.includes(original)) {
      // Work begun after the transaction started still owns its code and any other assets.
      const merged = current.assets.map((asset) =>
        asset === original ? materials.find(({ id }) => id === assetId)! : asset,
      )
      store.setState({
        project: advanceLocalRevision(current, { ...current, assets: merged }),
        isDirty: true,
      })
    }
  }
  return written
}
