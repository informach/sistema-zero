import { expect, test } from 'bun:test'
import {
  PINTA_REGION_SCENE_MAX_JSON_BYTES,
  readPintaRegionScene,
} from '@sistemazero/core/studio/pinta-region-scene'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import { utf8ByteLength } from '../core/jsonBytes'
import {
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  isTileLayer,
  type RegionTilemapAsset,
  sanitizeRegionTilemapAsset,
} from '../core/project'
import { regionVila } from '../testing/regionVila'
import { createMapObject } from '../tiles/mapObjects'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import { freezeObjectResource } from '../tiles/resourceVersions'
import { exportPintaRegionScene } from './regionScene'

const png = async () => 'data:image/png;base64,AA=='
function tileLayer(map: RegionTilemapAsset) {
  const layer = map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada ausente')
  return layer
}

test('the real Vila exports scene 4 with every layer, sheet, object, animation and reusable definition', async () => {
  const { map, assets } = regionVila(),
    find = (id: string) => assets.find((asset) => asset.id === id) ?? null
  const result = await exportPintaRegionScene(map, find, png)
  expect(result.scene.version).toBe(4)
  expect(result.scene.layers).toHaveLength(18)
  expect(result.scene.tilesets).toHaveLength(2)
  expect(result.scene.sets).toHaveLength(1)
  expect(result.scene.origin).toEqual(map.origin)
  expect(result.scene.cols * result.scene.rows).toBe(100000000)
  expect(result.scene.art?.some((art) => art.sprite?.animations.length)).toBe(true)
  expect(result.scene.layers.find((layer) => layer.kind === 'objects')?.objects).toEqual(
    map.layers.find(isObjectLayer)?.objects,
  )
  const first = result.scene.layers.find((layer) => layer.kind === 'tiles')
  if (first?.kind !== 'tiles') throw Error('Chão ausente')
  expect(first.cells.chunks.find((chunk) => chunk.col === -2 && chunk.row === -2)?.cells[0]).toBe(3)
  expect(result.bytes).toBe(utf8ByteLength(result.json))
  expect(result.bytes).toBeLessThan(PINTA_REGION_SCENE_MAX_JSON_BYTES)
  expect(readPintaRegionScene(result.json)).toEqual(result.scene)
  expect(
    JSON.parse(result.json).layers.find((layer: { kind: string }) => layer.kind === 'tiles').cells
      .encoding,
  ).toBe('i16le-base64-v1')
})

test('a regional root can reuse a legacy dense set without changing its IDs or dimensions', async () => {
  const { map: dense, assets } = vilaEFloresta(),
    converted = prepareMapRegions(dense)
  if (!converted.ok) throw Error(converted.reason)
  const expanded = expandRegionMap(converted.map, { col: -64, row: -64, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  const find = (id: string) => assets.find((asset) => asset.id === id) ?? null
  const set = assets.find((asset) => asset.kind === 'map-set')
  if (set?.kind !== 'map-set') throw Error('Conjunto ausente')
  const result = await exportPintaRegionScene(expanded.map, find, png)
  expect(result.scene.sets?.[0]).toMatchObject({
    id: set.id,
    cols: set.map.cols,
    rows: set.map.rows,
    origin: { col: 0, row: 0 },
  })
  expect(set.schema).not.toBe(8)
})

test('scene storage version 4 preserves the old collision mode unless precise physics is authored', async () => {
  const { map, assets } = regionVila(),
    find = (id: string) => assets.find((asset) => asset.id === id) ?? null
  const legacy = await exportPintaRegionScene(map, find, png)
  expect(legacy.scene.physics).toBe('legacy')
  expect(
    (await exportPintaRegionScene({ ...map, physics: 'precise' }, find, png)).scene.physics,
  ).toBe('precise')
  const objects = map.layers.find(isObjectLayer)
  if (!objects) throw Error('Objetos ausentes')
  const withCollision = {
    ...map,
    layers: map.layers.map((layer) =>
      layer.id === objects.id
        ? {
            ...objects,
            objects: objects.objects.map((object, index) =>
              index === 0 ? { ...object, collision: true as const } : object,
            ),
          }
        : layer,
    ),
  }
  expect((await exportPintaRegionScene(withCollision, find, png)).scene.physics).toBe('precise')
})

test('private artwork versions and chosen object animations survive scene-4 export', async () => {
  const { map, assets } = regionVila(),
    find = (id: string) => assets.find((asset) => asset.id === id) ?? null
  const layer = map.layers.find(isObjectLayer),
    object = layer?.objects.find((object) => object.art)
  if (!layer || !object) throw Error('Morador ausente')
  const frozen = freezeObjectResource(
    map,
    layer.id,
    object.id,
    (id) => {
      const asset = find(id)
      return asset?.kind === 'tilemap' || asset?.kind === 'map-set' ? null : asset
    },
    100,
  )
  if (!frozen.ok) throw Error(frozen.reason)
  const result = await exportPintaRegionScene(frozen.map, find, png)
  expect(result.scene.resources).toHaveLength(1)
  const resource = result.scene.resources![0]!
  expect(resource.sourceId).toBe(object.art!.assetId)
  expect(
    result.scene.art?.find((art) => art.id === resource.id)?.sprite?.animations.length,
  ).toBeGreaterThan(0)
})

test('late invalid regional headers refuse before visiting earlier cell payloads or preparing images', async () => {
  const { map, assets } = regionVila(),
    set = assets.find((asset) => asset.kind === 'map-set')
  if (set?.kind !== 'map-set' || !('origin' in set.map)) throw Error('Conjunto ausente')
  let reads = 0,
    images = 0
  const first = tileLayer(map).cells.chunks[0]!
  Object.defineProperty(first, 'cells', {
    enumerable: true,
    get() {
      reads++
      throw Error('payload-before-admission')
    },
  })
  tileLayer(set.map).cells.chunks = Array.from({ length: 2049 }, (_, index) => ({
    col: index % 64,
    row: Math.floor(index / 64),
    cells: new Int16Array(1024).fill(0),
  }))
  await expect(
    exportPintaRegionScene(
      map,
      (id) => assets.find((asset) => asset.id === id) ?? null,
      async () => {
        images++
        return png()
      },
    ),
  ).rejects.toThrow('conferir o cenário completo')
  expect(reads).toBe(0)
  expect(images).toBe(0)
})

test('aggregate root/set index quotas refuse before any payload or image generation', async () => {
  const { map, assets } = regionVila(),
    set = assets.find((asset) => asset.kind === 'map-set')
  if (set?.kind !== 'map-set' || !('origin' in set.map)) throw Error('Conjunto ausente')
  let reads = 0,
    images = 0
  const chunks = () =>
    Array.from({ length: 2048 }, (_, index) => ({
      col: index % 64,
      row: Math.floor(index / 64),
      get cells(): Int16Array {
        reads++
        throw Error('payload-before-budget')
      },
    }))
  for (const source of [map, set.map]) {
    const first = tileLayer(source)
    for (const layer of source.layers)
      if (isTileLayer(layer)) layer.cells = { ...layer.cells, chunks: [] }
    first.cells = { ...first.cells, chunks: chunks() }
  }
  await expect(
    exportPintaRegionScene(
      map,
      (id) => assets.find((asset) => asset.id === id) ?? null,
      async () => {
        images++
        return png()
      },
    ),
  ).rejects.toThrow('passou do limite')
  expect(reads).toBe(0)
  expect(images).toBe(0)
})

test('metadata quota spans otherwise valid maps and sets and refuses before image work', async () => {
  const { map, assets } = regionVila(),
    set = assets.find((asset) => asset.kind === 'map-set')
  if (set?.kind !== 'map-set' || !('origin' in set.map)) throw Error('Conjunto ausente')
  const properties = Object.fromEntries(
    Array.from({ length: 16 }, (_, index) => [`p${index}`, 'a'.repeat(200)]),
  )
  for (const source of [map, set.map])
    for (let index = 0; index < 3; index++)
      source.layers.push({
        kind: 'objects',
        id: `extra-${index}`,
        name: 'Objetos',
        visible: true,
        objects: Array.from({ length: 512 }, (_, object) =>
          createMapObject({ id: `extra-${index}-${object}`, properties }),
        ),
      })
  expect(sanitizeRegionTilemapAsset(map) === null).toBe(false)
  expect(sanitizeRegionTilemapAsset(set.map) === null).toBe(false)
  let images = 0
  await expect(
    exportPintaRegionScene(
      map,
      (id) => assets.find((asset) => asset.id === id) ?? null,
      async () => {
        images++
        return png()
      },
    ),
  ).rejects.toThrow('passou do limite')
  expect(images).toBe(0)
}, 10000)

test('final JSON quota includes every image and the exact encoded cell payload', async () => {
  const sheets = Array.from({ length: 16 }, (_, index) =>
    createTilesetAsset({ name: `pecas-${index}`, tileSize: 16 }),
  )
  const dense = createTilemapAsset({
    name: 'muitas-imagens',
    tilesetId: sheets[0]!.id,
    cols: 2,
    rows: 2,
  })
  const first = dense.layers[0]!
  if (!isTileLayer(first)) throw Error('Camada ausente')
  dense.layers = sheets.map((sheet, index) => ({
    ...first,
    id: `layer-${index}`,
    tilesetId: sheet.id,
    cells: new Int16Array(4).fill(0),
  }))
  const converted = prepareMapRegions(dense)
  if (!converted.ok) throw Error(converted.reason)
  const image = `data:image/png;base64,${'A'.repeat(700000)}`
  await expect(
    exportPintaRegionScene(
      converted.map,
      (id) => sheets.find((sheet) => sheet.id === id) ?? null,
      async () => image,
    ),
  ).rejects.toThrow('passou do limite')
})

test('missing typed dependencies and unknown native metadata cannot become partial playable scenes', async () => {
  const { map, assets } = regionVila(),
    find = (id: string) => assets.find((asset) => asset.id === id) ?? null
  const layer = map.layers.find(isObjectLayer)
  if (!layer) throw Error('Objetos ausentes')
  layer.properties = { required: { type: 'asset', value: 'missing' } }
  await expect(exportPintaRegionScene(map, find, png)).rejects.toThrow('Falta um desenho')
  delete layer.properties
  const opaque = { ...map, futureField: 'not-readable' }
  await expect(exportPintaRegionScene(opaque, find, png)).rejects.toThrow(
    'conferir o cenário completo',
  )
})

test('the admitted map snapshot keeps its cells, objects and name when the caller changes RAM during image work', async () => {
  const { map, assets } = regionVila(),
    find = (id: string) => assets.find((asset) => asset.id === id) ?? null
  const floor = tileLayer(map),
    first = floor.cells.chunks[0]!,
    before = first.cells[0],
    name = map.name,
    objects = map.layers.find(isObjectLayer),
    object = objects?.objects[0]
  if (!object) throw Error('Objeto ausente')
  const x = object.x
  let called = false
  const result = await exportPintaRegionScene(map, find, async () => {
    if (!called) {
      called = true
      map.name = 'mudanca-durante-exportacao'
      first.cells[0] = before === 3 ? 2 : 3
      object.x += 100
    }
    return png()
  })
  const exported = result.scene.layers.find((layer) => layer.id === floor.id)
  if (exported?.kind !== 'tiles') throw Error('Chão ausente')
  expect(result.scene.name).toBe(name)
  expect(exported.cells.chunks[0]!.cells[0]).toBe(before)
  expect(result.scene.layers.find((layer) => layer.kind === 'objects')?.objects[0]?.x).toBe(x)
})
