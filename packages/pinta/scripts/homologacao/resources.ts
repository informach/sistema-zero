import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  type PintaAsset,
} from '../../src/core/project'
import { deriveLoadedPintaImage } from '../../src/export/portableImage'
import { galleryToPintaJson } from '../../src/export/projectJson'
import { buildScenePackage } from '../../src/export/scenePackage'
import { addMapObject, createMapObject } from '../../src/tiles/mapObjects'
import { freezeMapTilesets, freezeObjectResource } from '../../src/tiles/resourceVersions'
import { addObjectLayer } from '../../src/tiles/tilemapOps'
import { nativeImageOf, nativeImageRaster } from './generate'

/** Small, unmistakable frames: yellow idle, red/green/blue wind. No test-only product API. */
export function resourceScenario(animated = false, tileSize: 16 | 32 | 48 = 16) {
  const sprite = createPixelSpriteAsset({ name: 'arvore-qa', frameSize: 16 })
  sprite.id = 'qa-resource-tree'
  sprite.paletteId = 'custom'
  sprite.customPalette = {
    name: 'QA',
    colors: ['', '#ffff00', '#ff0000', '#00ff00', '#0000ff', ...Array(11).fill('')],
  }
  sprite.animations[0]!.frames[0]![0]!.data.fill(1)
  sprite.animations.push({
    id: 'qa-wind',
    name: 'vento',
    fps: 4,
    loop: false,
    frames: [2, 3, 4].map((color) => [
      { width: 16, height: 16, data: new Uint8Array(256).fill(color) },
    ]),
  })
  const tileset = createTilesetAsset({ name: 'pecas-qa', tileSize })
  tileset.id = 'qa-resource-tiles'
  let map = addObjectLayer(
    createTilemapAsset({ name: 'recursos-qa', tilesetId: tileset.id, cols: 10, rows: 8 }),
    'Objetos',
  )
  map.id = 'qa-resource-map'
  const layerId = map.layers.at(-1)!.id
  const object = createMapObject({
    name: 'Árvore QA',
    shape: 'art',
    x: 16,
    y: 16,
    width: 16,
    height: 16,
    art: { assetId: sprite.id, ...(animated ? { animationId: 'qa-wind' } : {}) },
  })
  map = addMapObject(map, layerId, object)
  map = addMapObject(
    map,
    layerId,
    createMapObject({ name: 'Começo', role: 'start', shape: 'point', x: 80, y: 80 }),
  )
  map.layers[0]!.properties = { score: { type: 'int', value: 0 } }
  const find = (id: string) => [sprite, tileset].find((a) => a.id === id) ?? null
  if (animated) {
    const frozen = freezeObjectResource(map, layerId, object.id, find, 100)
    if (!frozen.ok) throw new Error(frozen.reason)
    map = frozen.map
  }
  const assets: PintaAsset[] = [tileset, sprite, map]
  return { map, sprite, tileset, assets }
}

export async function generateResourcePackages(output: string) {
  await mkdir(output, { recursive: true })
  await writeFile(
    resolve(output, 'resources.pinta.json'),
    galleryToPintaJson(resourceScenario().assets),
  )
  const closed = resourceScenario(true, 48)
  const frozen = freezeMapTilesets(
    closed.map,
    (id) => closed.assets.find((a) => a.id === id) ?? null,
    100,
  )
  if (!frozen.ok) throw new Error(frozen.reason)
  await writeFile(resolve(output, 'resources-frozen.pinta.json'), galleryToPintaJson([frozen.map]))
  const target = {
    ...frozen.map,
    id: 'qa-resource-target',
    name: 'destino-qa',
    resources: frozen.map.resources?.filter((v) => v.asset.id === frozen.map.tilesetId),
    layers: frozen.map.layers.map((l) => (l.kind === 'objects' ? { ...l, objects: [] } : l)),
  }
  await writeFile(
    resolve(output, 'resources-cross-map.pinta.json'),
    galleryToPintaJson([frozen.map, target]),
  )
  const { map, assets, sprite, tileset } = resourceScenario(true)
  const tree = map.layers
    .flatMap((l) => (l.kind === 'objects' ? l.objects : []))
    .find((o) => o.name === 'Árvore QA')!
  tileset.tileProperties = {
    0: { allowed: false, empty: '', related: { type: 'object', value: tree.id } },
  }
  map.layers[0]!.properties = {
    ...map.layers[0]!.properties,
    resource: { type: 'asset', value: sprite.id },
  }
  for (const scale of [1, 2]) {
    const png = await deriveLoadedPintaImage(
      map,
      {
        version: 1,
        algorithm: 'pinta-image-1',
        drawingId: map.id,
        selection: { kind: 'map' },
        scale,
      },
      {
        dimension: 4096,
        imagePixels: 4194304,
        totalImagePixels: 16777216,
        imageBytes: 16777216,
        dataUrlChars: 800000,
      },
      {
        assets: assets.filter((a) => a.id !== map.id),
        tilesets: [tileset],
        raster: nativeImageRaster(),
      },
    )
    await writeFile(
      resolve(output, scale === 1 ? 'resources.png' : 'resources-2x.png'),
      Buffer.from(png.dataUrl.split(',')[1]!, 'base64'),
    )
  }
  for (const target of ['tiled', 'phaser', 'pygame', 'godot'] as const) {
    const folder = resolve(output, target)
    for (const [name, value] of Object.entries(
      await buildScenePackage(map, assets, target, { imageOf: nativeImageOf }),
    )) {
      const path = resolve(folder, name)
      if (!path.startsWith(folder + sep)) throw new Error('Resource path outside package')
      await mkdir(resolve(path, '..'), { recursive: true })
      await writeFile(path, value)
    }
  }
}
if (import.meta.main)
  await generateResourcePackages(resolve(process.argv[2] ?? '.tmp/pinta-resources-e2e'))
