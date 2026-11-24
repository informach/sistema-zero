import { expect, test } from 'bun:test'
import {
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  isTilesetKind,
  type RegionTilemapAsset,
} from '../core/project'
import { PINTA_RESOURCE_LIMITS } from '../core/projectConfig'
import {
  decodeRegionMapDocument,
  decodeRegionSetDocument,
  encodeRegionMapDocument,
  encodeRegionSetDocument,
} from '../core/regionDocument'
import { addMapObjects, createRegionMapObject } from './mapObjects'
import { arrangeObjects, pasteObjectSelection, pasteObjects } from './objectSelection'
import { createObjectTemplate } from './objectTemplate'
import { expandRegionMap, prepareMapRegions } from './regionMap'
import { addObjectLayer } from './tilemapOps'

function scene(): RegionTilemapAsset {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'Mundo', tilesetId: 'ground', cols: 2, rows: 2 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  return {
    ...expanded.map,
    layers: [
      ...expanded.map.layers,
      { id: 'objects', kind: 'objects', name: 'Objetos', visible: true, objects: [] },
    ],
  }
}
test('region paste preserves relative negative fractional coordinates and internal references', () => {
  const map = scene(),
    objects = [
      createRegionMapObject({
        id: 'a',
        x: -20.5,
        y: -10.25,
        properties: { friend: { type: 'object', value: 'b' } },
      })!,
      createRegionMapObject({ id: 'b', x: -5.25, y: -4.5 })!,
    ],
    before = structuredClone(objects)
  const pasted = pasteObjects(map, 'objects', objects, -10.25, -0.5),
    copies = pasted.layers.find(isObjectLayer)!.objects
  expect(copies.map((o) => [o.x, o.y])).toEqual([
    [-30.75, -10.75],
    [-15.5, -5],
  ])
  expect(copies[0]!.properties.friend).toEqual({ type: 'object', value: copies[1]!.id })
  expect(objects).toEqual(before)
  expect(map.layers.find(isObjectLayer)!.objects).toHaveLength(0)
})
test('pasting copies objects and embedded tile references as the same immutable graph', () => {
  const art = createTilesetAsset({ name: 'arte', tileSize: 16 }),
    frozen = {
      ...art,
      id: 'frozen',
      tileProperties: {
        '0': {
          target: { type: 'object' as const, value: 'a' },
          outside: { type: 'object' as const, value: 'external' },
        },
      },
    }
  const object = createRegionMapObject({
      id: 'a',
      shape: 'art',
      art: { assetId: frozen.id, tile: 0 },
      width: 16,
      height: 16,
    })!,
    resources = [{ sourceId: art.id, capturedAt: 1, asset: frozen }],
    before = structuredClone(resources)
  const pasted = pasteObjects(scene(), 'objects', [object], 0, 0, resources),
    copy = pasted.layers.find(isObjectLayer)!.objects[0]!,
    version = pasted.resources?.find((v) => v.asset.id === copy.art?.assetId)
  expect(version).toBeDefined()
  expect(version!.asset.id).not.toBe(frozen.id)
  if (!isTilesetKind(version!.asset)) throw Error('Tiles expected')
  expect(version!.asset.tileProperties!['0']!.target).toEqual({ type: 'object', value: copy.id })
  expect(version!.asset.tileProperties!['0']!.outside).toEqual({
    type: 'object',
    value: 'external',
  })
  expect(resources).toEqual(before)
  expect(decodeRegionMapDocument(encodeRegionMapDocument(pasted))).toEqual(pasted)
})

test('resource conflicts and new immutable versions beyond the budget refuse the complete paste', () => {
  const art = createTilesetAsset({ name: 'arte', tileSize: 16 }),
    version = { sourceId: 'source', capturedAt: 1, asset: { ...art, id: 'frozen' } }
  const map = { ...scene(), resources: [version] },
    object = createRegionMapObject({
      id: 'original',
      shape: 'art',
      art: { assetId: 'frozen', tile: 0 },
      width: 16,
      height: 16,
    })!
  const changed = structuredClone(version)
  changed.asset.tiles[0]!.data.fill(3)
  const conflict = pasteObjectSelection(map, 'objects', [object], 0, 0, [changed])
  expect(conflict.map).toBe(map)
  expect(conflict.reason).toBe('resources')
  const resources = Array.from({ length: PINTA_RESOURCE_LIMITS.maxVersions }, (_, i) => ({
    sourceId: `source-${i}`,
    capturedAt: 1,
    asset: {
      ...art,
      id: `version-${i}`,
      ...(i === 0
        ? { tileProperties: { '0': { target: { type: 'object' as const, value: 'original' } } } }
        : {}),
    },
  }))
  const full = { ...scene(), resources },
    input = { ...object, art: { assetId: 'version-0', tile: 0 } }
  const refused = pasteObjectSelection(full, 'objects', [input], 0, 0)
  expect(refused.map).toBe(full)
  expect(refused.reason).toBe('resources')
  expect(full.layers.find(isObjectLayer)!.objects).toHaveLength(0)
  expect(version.asset.tiles[0]!.data[0]).toBe(0)
})

test('a signed clipboard enters a legacy map only when the translated data is lossless', () => {
  const map = addObjectLayer(
      createTilemapAsset({ name: 'legado', tilesetId: 'ground', cols: 4, rows: 4 }),
      'Objetos',
    ),
    id = map.layers.find(isObjectLayer)!.id,
    object = createRegionMapObject({ x: -0.5, y: -0.25 })!
  const refused = pasteObjectSelection(map, id, [object], 0, 0, [], 'signed')
  expect(refused.map).toBe(map)
  expect(refused.reason).toBe('incompatible-format')
  const translated = pasteObjectSelection(map, id, [object], 16.5, 16.25, [], 'signed')
  expect(translated.reason).toBeUndefined()
  expect(translated.map.layers.find(isObjectLayer)!.objects[0]).toMatchObject({ x: 16, y: 16 })
})

test('region authoring refuses future private artwork schemas without changing either document', () => {
  const art = createTilesetAsset({ name: 'arte', tileSize: 16 }),
    resource = { sourceId: art.id, capturedAt: 1, asset: { ...art, id: 'future', schema: 99 } },
    object = createRegionMapObject({
      id: 'tree',
      shape: 'art',
      art: { assetId: 'future', tile: 0 },
      width: 16,
      height: 16,
    })!,
    map = scene(),
    before = structuredClone(resource)
  const refused = pasteObjectSelection(map, 'objects', [object], 0, 0, [resource])
  expect(refused.map).toBe(map)
  expect(refused.reason).toBe('resources')
  expect(resource).toEqual(before)
  const source = { ...addMapObjects(map, 'objects', [object]), resources: [resource] }
  expect(createObjectTemplate(source, 'objects', 'tree', 16, 'Árvore')).toBeNull()
  expect(source.resources[0]!.asset.schema).toBe(99)
})
test('alignment refuses the entire region gesture if one target cannot be represented', () => {
  const map = addMapObjects(scene(), 'objects', [
      createRegionMapObject({ id: 'a', x: 480000, width: 10 })!,
      createRegionMapObject({ id: 'b', x: 479980, width: 0 })!,
      createRegionMapObject({ id: 'c', x: 479900, width: 20 })!,
    ]),
    before = structuredClone(map)
  expect(arrangeObjects(map, 'objects', ['a', 'b', 'c'], 'right')).toBe(map)
  expect(map).toEqual(before)
})
test('an object template from a sparse world preserves its full rotated fractional geometry', () => {
  const map = addMapObjects(scene(), 'objects', [
      createRegionMapObject({
        id: 'tree',
        name: 'Árvore',
        x: -32.5,
        y: -16.25,
        width: 16.5,
        height: 24.25,
        rotation: 45,
        shape: 'rect',
        properties: { self: { type: 'object', value: 'tree' } },
      })!,
    ]),
    before = structuredClone(map)
  const set = createObjectTemplate(map, 'objects', 'tree', 16, 'Árvore')
  expect(set).not.toBeNull()
  expect(set!.schema).toBe(8)
  const object = set!.map.layers.find(isObjectLayer)!.objects[0]!
  expect(object).toMatchObject({ width: 16.5, height: 24.25, rotation: 45 })
  expect(object.properties.self).toEqual({ type: 'object', value: object.id })
  expect(decodeRegionSetDocument(encodeRegionSetDocument(set!))).toEqual(set)
  expect(map).toEqual(before)
})
