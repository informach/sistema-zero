import {
  exportAssetForStudio,
  listGalleryForStudio,
} from '../../packages/pinta/src/export/studioLibrary'
import { createRegionPintaPersistence } from '../../packages/pinta/src/state/localRegionPersistence'
import { regionVila } from '../../packages/pinta/src/testing/regionVila'
import {
  getPersonalAsset,
  savePersonalAssetBundle,
} from '../../packages/studio/src/asset-library/personal'
import { admitPintaRegionalMaterial } from '../../packages/studio/src/core/pintaRegionalMaterial'
import { renderProjectToPreviewDocAsync } from '../../packages/studio/src/preview/renderProject'
import { buildTilemapGameProject } from '../../packages/studio/src/projects/tilemapGame'
import {
  captureProjectStorageScope,
  setProjectStorageNamespace,
} from '../../packages/studio/src/state/projectStorageRuntime'
import { loadSanitizedProjectById } from '../../packages/studio/src/state/projectStore'

/** Browser qualification through the public export, storage and player boundaries. */
export async function showPintaPublicBridge(namespace: string, existingId?: string) {
  setProjectStorageNamespace(namespace)
  let projectId = existingId
  if (!projectId) {
    const { map, assets } = regionVila()
    await createRegionPintaPersistence({ namespace }).persistAssets(assets)
    const gallery = await listGalleryForStudio({ namespace })
    if (!gallery.some((drawing) => drawing.id === map.id))
      throw new Error('The native8 map must appear in the public picker.')
    const result = await exportAssetForStudio(map.id, { namespace })
    if (!result.ok || !result.asset.regional)
      throw new Error('The bridge must export the complete regional world.')
    const saved = await savePersonalAssetBundle([result.asset], { namespace })
    if (!saved.ok) throw new Error(saved.error)
    const personal = await getPersonalAsset(map.id, { namespace })
    if (!personal || personal.dataUrl !== result.asset.dataUrl)
      throw new Error('The library must preserve the original PNG5.')
    const project = await buildTilemapGameProject({
      ...result.asset,
      libRevision: personal.updatedAt,
    })
    if (!project) throw new Error('The regional map must create an editable game.')
    projectId = project.id
  }
  const project = await loadSanitizedProjectById(projectId, captureProjectStorageScope())
  if (!project || project.programmingLanguage === 'python')
    throw new Error('The public project must reopen.')
  const material = project.assets?.find((asset) => asset.regional)
  if (!material?.regional || material.width === undefined || material.height === undefined)
    throw new Error('The reopened project must retain its regional material.')
  const admitted = await admitPintaRegionalMaterial({
    ...material,
    width: material.width,
    height: material.height,
    sourceId: material.regional.sourceId,
  })
  const root = admitted.world.maps.get(admitted.world.rootId)
  if (!root) throw new Error('The original world root must exist.')
  const frame = document.createElement('iframe')
  frame.title = 'Projeto regional público'
  frame.sandbox.add('allow-scripts')
  frame.srcdoc = await renderProjectToPreviewDocAsync(project)
  frame.style.cssText = 'width:640px;height:480px'
  document.body.append(frame)
  return {
    projectId,
    pngSha256: material.regional.sha256,
    origin: root.data.scene.origin,
    maps: admitted.world.maps.size,
    layers: root.data.scene.layers.length,
    files: project.files,
    blocksState: project.blocksState,
  }
}
