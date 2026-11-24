import { expect, test } from 'bun:test'
import { embeddedTilesetOf, withMapResourceVersions } from '../core/mapResourceVersions'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  isTileLayer,
  type PintaAsset,
  pintaAssetDependencyIds,
  type RegionTilemapAsset,
} from '../core/project'
import { PINTA_RESOURCE_LIMITS } from '../core/projectConfig'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../core/regionDocument'
import { CELL_FLIP_H, makeCell } from './cell'
import { addMapObject, createRegionMapObject } from './mapObjects'
import { editRegionMapCells, expandRegionMap, prepareMapRegions } from './regionMap'
import {
  captureMapResourceVersion,
  freezeMapTilesets,
  freezeObjectResource,
  linkMapTilesets,
  linkObjectResource,
  removeUnusedMapResourceVersions,
} from './resourceVersions'

function fixture() {
  const ground = createTilesetAsset({ name: 'terra', tileSize: 16, now: 1 })
  ground.animations = { 0: [{ tile: 0, duration: 100 }] }
  ground.tileProperties = { 0: { self: { type: 'asset', value: ground.id } } }
  const water = createTilesetAsset({ name: 'agua', tileSize: 16, now: 1 })
  const sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16, now: 1 })
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'Mundo', tilesetId: ground.id, cols: 2, rows: 2, now: 1 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  const edited = editRegionMapCells(expanded.map, expanded.map.layers[0]!.id, [
    { col: -100, row: -100, cell: makeCell(0, CELL_FLIP_H) },
    { col: 9899, row: 9899, cell: 0 },
  ])
  if (!edited.ok) throw Error(edited.reason)
  const firstLayer = edited.map.layers[0]
  if (!firstLayer || !isTileLayer(firstLayer)) throw Error('Camada de peças ausente')
  const map: RegionTilemapAsset = {
    ...edited.map,
    layers: [
      { ...firstLayer, tilesetId: ground.id, offsetX: -0.25 },
      {
        id: 'water',
        name: 'Água',
        visible: true,
        cells: { kind: 'regions', version: 1, side: 32, chunks: [] },
        tilesetId: water.id,
        front: true,
      },
      { kind: 'objects', id: 'objects', name: 'Objetos', visible: true, offsetY: 0.5, objects: [] },
    ],
  }
  const object = createRegionMapObject({
    id: 'tree',
    shape: 'art',
    x: -32.5,
    y: -16.25,
    width: 16.5,
    height: 16.25,
    art: { assetId: sprite.id, animationId: sprite.animations[0]!.id },
  })
  if (!object) throw Error('Objeto inválido')
  const assets = new Map<string, PintaAsset>([ground, water, sprite].map((a) => [a.id, a]))
  return {
    map: addMapObject(map, 'objects', object),
    ground,
    water,
    sprite,
    find: (id: string) => assets.get(id) ?? null,
  }
}

function reopen(map: RegionTilemapAsset) {
  const wire = encodeRegionMapDocument(map)
  expect(wire).not.toBeNull()
  expect(decodeRegionMapDocument(JSON.parse(JSON.stringify(wire)))).toEqual(map)
}

test('region tileset versions survive strict native round trip without copying world chunks', () => {
  const { map, ground, find } = fixture(),
    before = structuredClone(map)
  const result = freezeMapTilesets(map, find, 2)
  if (!result.ok) throw Error(result.reason)
  reopen(result.map)
  expect(result.map.origin).toBe(map.origin)
  expect(result.map.layers[0]!.cells).toBe(map.layers[0]!.cells)
  expect(result.map.layers[0]!.tilesetId).toBe(result.map.tilesetId)
  const privateGround = embeddedTilesetOf(result.map)
  if (!privateGround) throw Error('Versão das peças ausente')
  expect(privateGround?.schema).toBe(4)
  expect(privateGround?.tileProperties?.[0]?.self).toEqual({
    type: 'asset',
    value: privateGround.id,
  })
  expect(pintaAssetDependencyIds(result.map)).not.toContain(ground.id)
  ground.tiles[0]!.data.fill(8)
  expect(privateGround?.kind === 'tileset' && privateGround.tiles[0]!.data[0]).toBe(0)
  const linked = linkMapTilesets(result.map, find)
  if (!linked.ok) throw Error(linked.reason)
  expect(linked.map.layers).toEqual(map.layers)
  expect(linked.map.resources).toBe(result.map.resources)
  reopen(linked.map)
  expect(map).toEqual(before)
})

test('object version update and relink keep signed fractions and map animation by name', () => {
  const { map, sprite, find } = fixture()
  const first = freezeObjectResource(map, 'objects', 'tree', find, 2)
  if (!first.ok) throw Error(first.reason)
  const oldVersion = first.map.resources![0]!
  sprite.animations[0]!.id = 'new-animation'
  const second = freezeObjectResource(first.map, 'objects', 'tree', find, 3)
  if (!second.ok) throw Error(second.reason)
  const object = second.map.layers.find(isObjectLayer)!.objects[0]!
  expect(object).toMatchObject({
    x: -32.5,
    y: -16.25,
    width: 16.5,
    height: 16.25,
    art: { animationId: 'new-animation' },
  })
  expect(second.map.resources![0]).toBe(oldVersion)
  expect(second.map.layers[0]).toBe(map.layers[0])
  expect(oldVersion.asset.kind === 'pixel-sprite' && oldVersion.asset.animations[0]!.id).not.toBe(
    'new-animation',
  )
  reopen(second.map)
  const linked = linkObjectResource(first.map, 'objects', 'tree', find)
  if (!linked.ok) throw Error(linked.reason)
  expect(linked.map.layers.find(isObjectLayer)!.objects[0]!.art).toEqual({
    assetId: sprite.id,
    animationId: 'new-animation',
  })
  reopen(linked.map)
})

test('strict capture refuses normalized or unknown resource data atomically', () => {
  const { map, ground } = fixture(),
    before = structuredClone(map)
  for (const source of [
    { ...ground, future: { meaning: 'preserve me' } },
    { ...ground, solid: [true], platform: [true] },
    { ...ground, tiles: [{ ...ground.tiles[0]!, data: new Uint8Array(1) }] },
    { ...ground, id: 'x'.repeat(129) },
  ]) {
    expect(captureMapResourceVersion(map, source, 1)).toEqual({
      ok: false,
      reason: 'invalid-resource',
    })
    expect(map).toEqual(before)
  }
})

test('future labels and invalid capture times are never stored in either document generation', () => {
  const { map, sprite } = fixture()
  const dense = createTilemapAsset({ name: 'Legado', tilesetId: 'ground', cols: 2, rows: 2 })
  for (const target of [map, dense]) {
    expect(captureMapResourceVersion(target, { ...sprite, id: 'x'.repeat(129) }, 1)).toEqual({
      ok: false,
      reason: 'invalid-resource',
    })
    for (const schema of [8, -1, 1.5, Number.NaN]) {
      const source = { ...sprite, schema }
      expect(captureMapResourceVersion(target, source, 1)).toEqual({
        ok: false,
        reason: 'invalid-resource',
      })
    }
    for (const now of [-1, Number.NaN, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(captureMapResourceVersion(target, sprite, now)).toEqual({
        ok: false,
        reason: 'invalid-resource',
      })
  }
})

test('resource refusal preserves all tilesets and inherited locks', () => {
  const { map, ground, water, find } = fixture(),
    before = structuredClone(map)
  expect(freezeMapTilesets(map, (id) => (id === water.id ? null : find(id)), 1)).toEqual({
    ok: false,
    reason: 'missing',
  })
  const malformedWater = { ...water, future: true }
  expect(freezeMapTilesets(map, (id) => (id === water.id ? malformedWater : find(id)), 1)).toEqual({
    ok: false,
    reason: 'invalid-resource',
  })
  const locked: RegionTilemapAsset = {
    ...map,
    layers: [
      { kind: 'group', id: 'locked', name: 'Trancado', visible: true, locked: true },
      ...map.layers.map((l) => ({ ...l, parentId: 'locked' })),
    ],
  }
  expect(freezeMapTilesets(locked, find)).toEqual({ ok: false, reason: 'locked' })
  expect(freezeObjectResource(locked, 'objects', 'tree', find)).toEqual({
    ok: false,
    reason: 'locked',
  })
  expect(map).toEqual(before)
  expect(ground.schema).toBeUndefined()
})

test('failed object update does not leave an unused snapshot or report successful relink', () => {
  const { map, find } = fixture()
  const malformed: RegionTilemapAsset = {
    ...map,
    layers: map.layers.map((l) =>
      isObjectLayer(l)
        ? { ...l, objects: l.objects.map((o) => ({ ...o, rotation: Number.NaN })) }
        : l,
    ),
  }
  expect(freezeObjectResource(malformed, 'objects', 'tree', find, 1)).toEqual({
    ok: false,
    reason: 'invalid-resource',
  })
  const frozen = freezeObjectResource(map, 'objects', 'tree', find, 1)
  if (!frozen.ok) throw Error(frozen.reason)
  const invalid = {
    ...frozen.map,
    layers: frozen.map.layers.map((l) =>
      isObjectLayer(l)
        ? { ...l, objects: l.objects.map((o) => ({ ...o, rotation: Number.NaN })) }
        : l,
    ),
  }
  expect(linkObjectResource(invalid, 'objects', 'tree', find)).toEqual({
    ok: false,
    reason: 'invalid-resource',
  })
  expect(malformed.resources).toBeUndefined()
})

test('explicit cleanup retains transitively referenced private versions and drops only unused art', () => {
  const { map, sprite, ground, find } = fixture()
  const a = captureMapResourceVersion(map, sprite, 1)
  if (!a.ok) throw Error(a.reason)
  ground.tileProperties = { 0: { picture: { type: 'asset', value: a.version.asset.id } } }
  const b = freezeMapTilesets(a.map, find, 2)
  if (!b.ok) throw Error(b.reason)
  const unused = captureMapResourceVersion(b.map, sprite, 3)
  if (!unused.ok) throw Error(unused.reason)
  const cleaned = removeUnusedMapResourceVersions(unused.map)
  expect(cleaned.resources).toHaveLength(3)
  expect(withMapResourceVersions(cleaned, () => null)(a.version.asset.id)).toBe(a.version.asset)
  expect(cleaned.layers).toBe(unused.map.layers)
  expect(removeUnusedMapResourceVersions(cleaned)).toBe(cleaned)
  reopen(cleaned)
  expect(isTileLayer(cleaned.layers[0]!)).toBe(true)
})

test('region capture enforces existing snapshot count and physical byte budgets', () => {
  const { map, sprite } = fixture()
  const resources = Array.from({ length: PINTA_RESOURCE_LIMITS.maxVersions }, (_, i) => ({
    sourceId: sprite.id,
    capturedAt: 1,
    asset: { ...sprite, id: `private-${i}` },
  }))
  expect(captureMapResourceVersion({ ...map, resources }, sprite, 1)).toEqual({
    ok: false,
    reason: 'version-limit',
  })
  const large = {
    ...sprite,
    animations: sprite.animations.map((a) => ({
      ...a,
      frames: [
        [{ width: 1, height: 1, data: new Uint8Array(PINTA_RESOURCE_LIMITS.maxSnapshotBytes + 1) }],
      ],
    })),
  }
  expect(captureMapResourceVersion(map, large, 1)).toEqual({ ok: false, reason: 'memory-budget' })
})

test('migration stamps old captured tilesets without changing version ids or cloning pixel buffers', () => {
  const { ground } = fixture()
  const dense = createTilemapAsset({ name: 'Antigo', tilesetId: ground.id, cols: 2, rows: 2 })
  const frozen = freezeMapTilesets(dense, (id) => (id === ground.id ? ground : null), 0)
  if (!frozen.ok) throw Error(frozen.reason)
  const version = frozen.map.resources![0]!
  if (version.asset.kind !== 'tileset') throw Error('Versão das peças ausente')
  expect(version.asset.schema).toBeUndefined()
  const prepared = prepareMapRegions(frozen.map)
  if (!prepared.ok) throw Error(prepared.reason)
  expect(prepared.map.resources![0]).toMatchObject({
    sourceId: version.sourceId,
    capturedAt: 0,
    asset: { id: version.asset.id, schema: 4 },
  })
  const art = prepared.map.resources![0]!.asset
  if (art.kind !== 'tileset') throw Error('Versão das peças ausente')
  expect(art.tiles).toBe(version.asset.tiles)
  expect(version.asset.schema).toBeUndefined()
  reopen(prepared.map)
})

test('migration refuses future or lossy existing snapshots rather than producing an unreadable region map', () => {
  const { ground } = fixture()
  const dense = createTilemapAsset({ name: 'Antigo', tilesetId: ground.id, cols: 2, rows: 2 })
  for (const source of [
    { ...dense, schema: 99 },
    {
      ...dense,
      resources: [
        { sourceId: ground.id, capturedAt: 0, asset: { ...ground, id: 'private', future: true } },
      ],
    },
    {
      ...dense,
      resources: [
        { sourceId: ground.id, capturedAt: 0, asset: { ...ground, id: 'private', schema: 99 } },
      ],
    },
  ]) {
    const before = structuredClone(source)
    expect(prepareMapRegions(source)).toEqual({ ok: false, reason: 'invalid-map' })
    expect(source).toEqual(before)
  }
})
