import { PINTA_HEX_REGION_CHUNK_BYTES, PINTA_REGION_CHUNK_BYTES } from '@sistemazero/core/creations'
import { readPngDataUrl } from '@sistemazero/core/studio/pinta-png-binary'
import type {
  PintaProjectedScene,
  PintaProjectedSceneWire,
} from '@sistemazero/core/studio/pinta-projected-scene'
import {
  PINTA_REGION_IMAGE_PNG_LIMITS,
  PINTA_REGION_WORLD_BUDGET,
} from '@sistemazero/core/studio/pinta-region-image-limits'
import type {
  PintaRegionScene,
  PintaRegionSceneWire,
} from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaMemoryAsset, PintaWorkshopAsset } from '../core/assetMemory'
import { utf8ByteLength } from '../core/jsonBytes'
import type { RegionTilemapAsset, VersionablePintaAsset } from '../core/project'
import type { ProjectedMapSetAsset, ProjectedTilemapAsset } from '../core/projectedDocument'
import { pintaWorkshopBody } from '../core/workshopAsset'
import { prepareMapRegions } from '../tiles/regionMap'
import { exportPintaProjectedScene, type ProjectedSceneAsset } from './projectedScene'
import { exportPintaRegionScene } from './regionScene'
import type { ScenePackageTarget } from './scenePackage'
import {
  TiledSceneCompatibilityError,
  tiledMap,
  tiledMapXml,
  tiledSceneWarnings,
  tiledTilesetXml,
} from './tiled/export'
import { TILED_PACKAGE_LIMITS } from './tiled/package'
import { pintaWorkshopBackup } from './workshopDocument'

type PackageFile = Uint8Array | string
type MapAsset = Extract<ProjectedSceneAsset, { kind: 'tilemap' }>
type SceneWire = PintaRegionSceneWire | PintaProjectedSceneWire
type DecodedScene = PintaRegionScene | PintaProjectedScene
type ImageOf = (asset: VersionablePintaAsset) => Promise<string | null>
/** The captured door closure (sceneMapClosure), including projected maps. */
export interface ScenePackageSource {
  maps: MapAsset[]
  assets: ProjectedSceneAsset[]
}

const isProjectedAsset = (
  asset: ProjectedSceneAsset,
): asset is ProjectedTilemapAsset | ProjectedMapSetAsset =>
  'projection' in asset || (asset.kind === 'map-set' && 'projection' in asset.map)

/** The projected writer reports no chunk budget; charge the widths its reader admits. */
function projectedIndexBytes(scene: PintaProjectedSceneWire): number {
  let bytes = 0
  for (const map of [scene, ...(scene.sets ?? [])])
    for (const layer of map.layers)
      if (layer.kind === 'tiles')
        bytes +=
          layer.cells.chunks.length *
          (layer.cells.kind === 'hex-regions'
            ? PINTA_HEX_REGION_CHUNK_BYTES
            : PINTA_REGION_CHUNK_BYTES)
  return bytes
}

function asRegional(map: Exclude<MapAsset, ProjectedTilemapAsset>): RegionTilemapAsset {
  const body = pintaWorkshopBody(map)
  if (body.kind !== 'tilemap') throw new Error('O cenário não veio como um mapa completo.')
  if ('origin' in body) return body
  const converted = prepareMapRegions(body)
  if (!converted.ok) throw new Error('Um dos mapas ligados não pôde ser preparado em regiões.')
  return converted.map
}

/** A captured Scene4 world for independent external adapters. IDs and signed
 * coordinates come from the authored maps; filenames are based on stable positions.
 */
export async function prepareRegionScenePackage(captured: ScenePackageSource, imageOf?: ImageOf) {
  const byId = new Map(captured.assets.map((asset) => [asset.id, asset]))
  const files: Record<string, PackageFile> = {}
  let totalBytes = 0
  function put(path: string, file: PackageFile) {
    const size = typeof file === 'string' ? utf8ByteLength(file) : file.byteLength
    if (size > TILED_PACKAGE_LIMITS.fileBytes)
      throw new Error('Um arquivo passou de 32 MiB. Exporte mapas ou conjuntos menores.')
    if (totalBytes + size > TILED_PACKAGE_LIMITS.unpackedBytes)
      throw new Error('O pacote passou de 128 MiB. Exporte os mapas separadamente.')
    totalBytes += size
    files[path] = file
  }
  const maps = new Map<string, { folder: string; scene: SceneWire; decoded: DecodedScene }>()
  const remaining = { ...PINTA_REGION_WORLD_BUDGET }
  function regionalResource(id: string): PintaMemoryAsset | null {
    const asset = byId.get(id)
    // A door may refer to a projected map by ID. Its own map is prepared
    // below by the projected writer, and no playable regional fallback is made.
    if (!asset) return null
    if (isProjectedAsset(asset)) {
      if (asset.kind !== 'tilemap') return null
      const { projection: _projection, growth: _growth, ...identity } = asset
      return { ...identity, schema: 8, layers: [] }
    }
    return pintaWorkshopBody(asset)
  }
  for (const map of captured.maps) {
    if ('projection' in map) {
      const exported = await exportPintaProjectedScene(map, (id) => byId.get(id) ?? null, imageOf)
      remaining.metadataBytes -= exported.bytes
      remaining.indexBytes -= projectedIndexBytes(exported.wire)
      if (remaining.metadataBytes < 0 || remaining.indexBytes < 0)
        throw new Error(
          'Os dados dos cenários excedem o limite do pacote. Exporte os mapas separadamente.',
        )
      maps.set(map.id, {
        folder: `mapas/mapa-${maps.size}`,
        scene: exported.wire,
        decoded: exported.scene,
      })
      continue
    }
    const exported = await exportPintaRegionScene(
      asRegional(map),
      regionalResource,
      imageOf,
      remaining,
    )
    remaining.metadataBytes -= exported.bytes
    remaining.indexBytes -= exported.indexBytes
    maps.set(map.id, {
      folder: `mapas/mapa-${maps.size}`,
      scene: exported.wire,
      decoded: exported.scene,
    })
  }
  const projected = captured.assets.some(isProjectedAsset)
  const workshopAssets = captured.assets.filter(
    (asset): asset is PintaWorkshopAsset =>
      !(asset.kind === 'map-set' && 'projection' in asset.map),
  )
  const editableBackup = workshopAssets.length === captured.assets.length
  if (editableBackup) {
    const native = await pintaWorkshopBackup(workshopAssets)
    if (!native) throw new Error('Não consegui reunir os desenhos editáveis deste cenário.')
    put('desenhos.pinta.json', native)
  }

  const root = captured.maps[0]
  if (!root) throw new Error('O cenário inicial não veio no pacote.')
  return { rootId: root.id, rootName: root.name, maps, files, put, projected, editableBackup }
}

type Prepared = Awaited<ReturnType<typeof prepareRegionScenePackage>>

/** Pygame reads Scene 4 only; a projected map refuses the whole world. */
function pygameScenes(world: Prepared): Map<string, PintaRegionSceneWire> {
  const scenes = new Map<string, PintaRegionSceneWire>()
  for (const [id, { scene }] of world.maps) {
    if (scene.version === 5)
      throw new Error('Este destino ainda precisa de um adaptador de projeção.')
    scenes.set(id, scene)
  }
  return scenes
}

export function writeRegionPackageImages(world: Prepared) {
  const maps: Record<string, SceneWire> = Object.create(null)
  let imagePixels = PINTA_REGION_WORLD_BUDGET.imagePixels
  for (const [id, { folder, scene }] of world.maps) {
    function capture<T extends { image: string }>(entry: T, name: string): T {
      const path = `${folder}/images/${name}.png`
      const { bytes, width, height } = readPngDataUrl(entry.image, PINTA_REGION_IMAGE_PNG_LIMITS)
      imagePixels -= width * height
      if (imagePixels < 0) throw new Error('As imagens do cenário ultrapassam o limite do pacote.')
      world.put(path, bytes)
      return { ...entry, image: path }
    }
    maps[id] = {
      ...scene,
      tilesets: scene.tilesets.map((entry, i) => capture(entry, `tiles-${i}`)),
      ...(scene.art ? { art: scene.art.map((entry, i) => capture(entry, `art-${i}`)) } : {}),
    }
  }
  world.put('maps.json', JSON.stringify(maps))
  world.put('start.json', JSON.stringify(world.rootId))
  return maps
}

export async function writeRegionTiledFiles(
  world: Prepared,
  target: ScenePackageTarget,
): Promise<string[]> {
  const reports = [
    'As camadas ortogonais usam chunks de 32×32 com coordenadas assinadas.',
    'As propriedades pinta:* guardam a área autoral, os conjuntos, as ligações e a física. O Tiled edita o mapa, e a execução das portas e colisões depende do jogo que o carrega.',
    'Os objetos extras de conjuntos são cópias para exibição. A definição fica em pinta:sets.',
  ]
  // The regional players read maps.json and start.json, never mapa.json: only the Tiled
  // package itself needs the supplement.
  const fallback =
    target === 'pygame'
      ? 'Consulte o cenário completo em cenario.png.'
      : target === 'godot'
        ? 'Consulte o cenário completo em maps.json.'
        : target === 'phaser'
          ? 'O jogo em index.html usa o cenário completo de maps.json.'
          : null
  for (const { folder, scene, decoded } of world.maps.values()) {
    let tiled: Awaited<ReturnType<typeof tiledMap>>
    try {
      tiled = await tiledMap(decoded)
    } catch (error) {
      if (!(error instanceof TiledSceneCompatibilityError) || !fallback) throw error
      reports.push(`Mapa ${scene.name}. ${error.message} ${fallback}`)
      continue
    }
    world.put(`${folder}/mapa.json`, JSON.stringify(tiled))
    world.put(`${folder}/mapa.tmx`, tiledMapXml(tiled, true))
    for (const [i, tileset] of (tiled.tilesets as Record<string, unknown>[]).entries())
      world.put(`${folder}/tiles-${i}.tsx`, tiledTilesetXml(tileset))
    reports.push(...tiledSceneWarnings(scene).map((message) => `Mapa ${scene.name}. ${message}`))
  }
  world.put('COMPATIBILIDADE-TILED.txt', reports.join('\n'))
  return reports
}

async function writeRegionGodotFiles(world: Prepared): Promise<string[]> {
  const { godotProject, godotScene, godotRegionalScript, godotProjectedScript } = await import(
    './godot/project'
  )
  world.put('project.godot', godotProject)
  world.put('main.tscn', godotScene)
  const projected = [...world.maps.values()].flatMap(({ scene }) =>
    scene.version === 5 ? [scene] : [],
  )
  world.put('pinta.gd', projected.length ? godotProjectedScript : godotRegionalScript)
  if (projected.length) {
    const { godotProjectionLayout } = await import('./godot/projection')
    world.put(
      'projections.json',
      JSON.stringify(
        Object.fromEntries(
          projected.map((scene) => [
            scene.id,
            {
              root: godotProjectionLayout(scene),
              sets: Object.fromEntries(
                (scene.sets ?? []).map((set) => [set.id, godotProjectionLayout(set)]),
              ),
            },
          ]),
        ),
      ),
    )
  }
  return [
    'Importe project.godot no Godot 4.7.2 e execute a cena principal.',
    'O jogo cria camadas nativas com células assinadas e instancia objetos e conjuntos.',
    'As setas movem o jogador. ↑ pula nos mapas com plataformas.',
    'Consulte propriedades com objeto_por_id, recurso_imagem, propriedade_camada e propriedade_peca.',
    ...(projected.length
      ? [
          'projections.json guarda as bases de desenho e colisão calculadas de maps.json. Exporte novamente ao alterar a projeção ou os limites.',
        ]
      : []),
  ]
}

export async function buildRegionScenePackage(
  captured: ScenePackageSource,
  target: ScenePackageTarget,
  imageOf?: ImageOf,
) {
  const world = await prepareRegionScenePackage(captured, imageOf)
  const pygame = target === 'pygame' ? pygameScenes(world) : null
  if (target === 'godot') {
    // The Godot script materializes every set instance; charge that fan-out first.
    const { assertGodotRegionWork } = await import('./godot/regionWork')
    for (const { decoded } of world.maps.values()) assertGodotRegionWork(decoded)
  }
  await writeRegionTiledFiles(world, target)
  writeRegionPackageImages(world)
  const instructions =
    target === 'phaser'
      ? (await import('./phaser/regionPackage')).writeRegionPhaserFiles(world.put)
      : pygame
        ? await (await import('./pygameRegionProject')).writeRegionPygameFiles(world, pygame)
        : target === 'godot'
          ? await writeRegionGodotFiles(world)
          : [
              'Abra mapas/mapa-0/mapa.tmx ou mapa.json no Tiled. As folhas TSX e as imagens ficam no pacote.',
            ]
  world.put(
    'LEIA-ME.txt',
    [
      'Cenário regional do Pinta',
      '',
      `Mapa inicial: ${world.rootName}`,
      ...instructions,
      world.editableBackup
        ? 'desenhos.pinta.json conserva os desenhos originais editáveis, incluindo projeções e livros de regras.'
        : 'Este pacote inclui conjuntos projetados experimentais fora do formato editável da oficina. Guarde os documentos de origem para editá-los.',
      'maps.json conserva os dados do cenário e start.json indica o ID do mapa inicial.',
      'Leia COMPATIBILIDADE-TILED.txt para conferir o que o editor e o runtime interpretam.',
    ].join('\n'),
  )
  return world.files
}
