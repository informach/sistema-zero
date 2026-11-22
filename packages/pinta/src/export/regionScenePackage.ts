import { readPngDataUrl } from '@sistemazero/core/studio/pinta-png-binary'
import {
  PINTA_REGION_IMAGE_PNG_LIMITS,
  PINTA_REGION_WORLD_BUDGET,
} from '@sistemazero/core/studio/pinta-region-image-limits'
import type {
  PintaRegionScene,
  PintaRegionSceneWire,
} from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { utf8ByteLength } from '../core/jsonBytes'
import type { RegionTilemapAsset, VersionablePintaAsset } from '../core/project'
import type { sceneMapClosure } from '../core/sceneMapClosure'
import { prepareMapRegions } from '../tiles/regionMap'
import { encodeRegionGalleryBackup } from './regionBackup'
import { exportPintaRegionScene } from './regionScene'
import type { ScenePackageTarget } from './scenePackage'
import { tiledMap, tiledMapXml, tiledSceneWarnings, tiledTilesetXml } from './tiled/export'
import { TILED_PACKAGE_LIMITS } from './tiled/package'

type PackageFile = Uint8Array | string
type MapAsset = Extract<PintaMemoryAsset, { kind: 'tilemap' }>
type ImageOf = (asset: VersionablePintaAsset) => Promise<string | null>
type ScenePackageSource = ReturnType<typeof sceneMapClosure<PintaMemoryAsset>>

function asRegional(map: MapAsset): RegionTilemapAsset {
  if ('origin' in map) return map
  const converted = prepareMapRegions(map)
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
  const maps = new Map<
    string,
    { folder: string; scene: PintaRegionSceneWire; decoded: PintaRegionScene }
  >()
  const remaining = { ...PINTA_REGION_WORLD_BUDGET }
  for (const map of captured.maps) {
    const exported = await exportPintaRegionScene(
      asRegional(map),
      (id) => byId.get(id) ?? null,
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
  const native = encodeRegionGalleryBackup(captured.assets)
  if (!native) throw new Error('Não consegui reunir os desenhos editáveis deste cenário.')
  put('desenhos.pinta.json', native.text)

  const root = captured.maps[0]
  if (!root) throw new Error('O cenário inicial não veio no pacote.')
  return { rootId: root.id, rootName: root.name, maps, files, put }
}

type Prepared = Awaited<ReturnType<typeof prepareRegionScenePackage>>

export function writeRegionPackageImages(world: Prepared) {
  const maps: Record<string, PintaRegionSceneWire> = Object.create(null)
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

export async function writeRegionTiledFiles(world: Prepared): Promise<string[]> {
  const reports = [
    'As camadas ortogonais usam chunks de 32×32 com coordenadas assinadas.',
    'As propriedades pinta:* guardam a área autoral, os conjuntos, as ligações e a física. O Tiled edita o mapa, e a execução das portas e colisões depende do jogo que o carrega.',
    'Os objetos extras de conjuntos são cópias para exibição. A definição fica em pinta:sets.',
  ]
  for (const { folder, scene, decoded } of world.maps.values()) {
    const tiled = await tiledMap(decoded)
    world.put(`${folder}/mapa.json`, JSON.stringify(tiled))
    world.put(`${folder}/mapa.tmx`, tiledMapXml(tiled, true))
    for (const [i, tileset] of (tiled.tilesets as Record<string, unknown>[]).entries())
      world.put(`${folder}/tiles-${i}.tsx`, tiledTilesetXml(tileset))
    reports.push(...tiledSceneWarnings(scene).map((message) => `Mapa ${scene.name}. ${message}`))
  }
  world.put('COMPATIBILIDADE-TILED.txt', reports.join('\n'))
  return reports
}

export async function buildRegionScenePackage(
  captured: ScenePackageSource,
  target: ScenePackageTarget,
  imageOf?: ImageOf,
) {
  if (target !== 'tiled' && target !== 'phaser')
    throw new Error('Este editor só exporta cenários regionais para o Tiled e o Phaser.')
  const world = await prepareRegionScenePackage(captured, imageOf)
  await writeRegionTiledFiles(world)
  writeRegionPackageImages(world)
  const instructions =
    target === 'phaser'
      ? (await import('./phaser/regionPackage')).writeRegionPhaserFiles(world.put)
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
      'desenhos.pinta.json conserva os desenhos originais editáveis.',
      'maps.json conserva os dados do cenário e start.json indica o ID do mapa inicial.',
      'Leia COMPATIBILIDADE-TILED.txt para conferir o que o editor e o runtime interpretam.',
    ].join('\n'),
  )
  return world.files
}
