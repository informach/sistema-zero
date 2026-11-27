import { createPintaProjectionGeometry } from '../../packages/core/src/creations/pinta-projection-geometry'
import { mountPintaPlayButton } from '../../packages/member-shell/qa/pinta-play-button.fixture'
import { sendPintaGameToStudio } from '../../packages/member-shell/src/components/creator/send-pinta-game-to-studio'
import { isTilesetKind } from '../../packages/pinta/src/core/project'
import { isProjectedTileLayer } from '../../packages/pinta/src/core/projectedDocument'
import {
  exportAssetForStudio,
  listGalleryForStudio,
} from '../../packages/pinta/src/export/studioLibrary'
import { createRegionPintaPersistence } from '../../packages/pinta/src/state/localRegionPersistence'
import { setPintaStorageNamespace } from '../../packages/pinta/src/state/persistence'
import { createWorkshopPintaPersistence } from '../../packages/pinta/src/state/workshopPersistence'
import { regionVila } from '../../packages/pinta/src/testing/regionVila'
import { createAutomapBook } from '../../packages/pinta/src/tiles/automapping/book'
import {
  createProjectedMap,
  editProjectedMapCells,
} from '../../packages/pinta/src/tiles/projectedMap'
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

type PlayButtonState = {
  view: Awaited<ReturnType<typeof mountPintaPlayButton>>
  projectId: string | null
  navigation?: string
}
let playButton: PlayButtonState | null = null

/** The editor's real button, exporter, host library and first project write in a fresh namespace. */
export async function showPintaPlayButton(
  namespace: string,
  projection?: 'hexagonal' | 'isometric',
) {
  setPintaStorageNamespace(namespace)
  setProjectStorageNamespace(namespace)
  const village = regionVila()
  let name = village.map.name
  const persistence = createWorkshopPintaPersistence({ namespace })
  if (projection) {
    const sheet = village.assets.find((asset) => asset.id === village.map.tilesetId)
    if (!sheet || !isTilesetKind(sheet)) throw Error('Folha de teste ausente')
    const map = createProjectedMap(`qa-${projection}`, sheet, projection)
    if (!map) throw Error('Projeção de teste recusada')
    const layer = map.layers.find(isProjectedTileLayer)!
    const tile = sheet.tiles.findIndex(
      (_tile, index) => !sheet.solid[index] && !sheet.platform?.[index],
    )
    const points = Array.from({ length: 80 }, (_, index) => ({
      col: index % 10,
      row: Math.floor(index / 10),
      cell: tile,
    }))
    const edited = editProjectedMapCells(map, layer.id, points)
    if (!edited.ok) throw Error(edited.reason)
    const start = createPintaProjectionGeometry(map.projection).center(5, 4)
    const authored = {
      ...edited.map,
      automapping: createAutomapBook(),
      layers: [
        ...edited.map.layers,
        {
          id: 'inicio-projetado',
          kind: 'objects' as const,
          name: 'Lugares',
          visible: true,
          objects: [
            {
              id: 'inicio',
              name: 'Início',
              type: '',
              role: 'start' as const,
              shape: 'point' as const,
              x: start.x,
              y: start.y,
              width: 0,
              height: 0,
              properties: {},
            },
          ],
        },
      ],
    }
    await persistence.persistAssets([sheet, authored])
    name = map.name
  } else await persistence.persistAssets(village.assets)
  const state: PlayButtonState = {
    projectId: null,
    view: await mountPintaPlayButton(persistence, {
      studioOwned: true,
      sendGameToStudio: (payload) =>
        sendPintaGameToStudio(payload, {
          namespace,
          navigate(path) {
            state.navigation = path
            state.projectId = new URL(path, location.href).searchParams.get('projeto')
          },
        }),
    }),
  }
  playButton = state
  return { name }
}

export async function readPintaPlayButton(namespace: string) {
  const state = playButton
  if (state?.navigation && !state.projectId)
    throw new Error('The Pinta host must navigate directly to the game it created.')
  if (!state?.projectId) return null
  state.view.dispose()
  playButton = null
  return {
    ...(await showPintaPublicBridge(namespace, state.projectId)),
    navigation: state.navigation,
  }
}

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
    dataVersion: material.regional.dataVersion,
    projection: root.data.scene.version === 5 ? root.data.scene.projection.kind : 'orthogonal',
    origin: root.data.scene.origin,
    maps: admitted.world.maps.size,
    layers: root.data.scene.layers.length,
    files: project.files,
    blocksState: project.blocksState,
  }
}
