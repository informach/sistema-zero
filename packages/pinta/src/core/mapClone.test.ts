import { expect, test } from 'bun:test'
import { prepareMapRegions } from '../tiles/regionMap'
import { cloneMapIds } from './mapClone'
import {
  createTilemapAsset,
  createTilesetAsset,
  isGroupLayer,
  isObjectLayer,
  isTileLayer,
  isTilesetKind,
  remapTilemapTilesetIds,
  type TilemapAsset,
} from './project'

function overlappingNamespaces(): TilemapAsset {
  const map = createTilemapAsset({ name: 'IDs por tipo', tilesetId: 'tiles', cols: 2, rows: 2 })
  return {
    ...map,
    layers: [
      { kind: 'group', id: 'same', name: 'Grupo', visible: true },
      ...map.layers.map((l) => ({ ...l, parentId: 'same' })),
      {
        kind: 'objects',
        id: 'objects',
        name: 'Marcas',
        visible: true,
        parentId: 'same',
        objects: [
          {
            id: 'same',
            name: 'Marca',
            type: '',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            properties: { target: { type: 'object', value: 'same' } },
          },
        ],
      },
    ],
  }
}
test('layer and object IDs have separate namespaces when a map graph is cloned', () => {
  const source = overlappingNamespaces(),
    before = structuredClone(source),
    copy = cloneMapIds(source)
  const group = copy.layers.find(isGroupLayer)!,
    objects = copy.layers.find(isObjectLayer)!,
    object = objects.objects[0]!
  expect(group.id).not.toBe(object.id)
  expect(objects.parentId).toBe(group.id)
  expect(object.properties.target).toEqual({ type: 'object', value: object.id })
  expect(source).toEqual(before)
})

test('a fragment versions indirect dependents when an embedded object reference is rebound', () => {
  const base = overlappingNamespaces(),
    art = createTilesetAsset({ name: 'Peças', tileSize: 16 })
  const direct = {
    ...art,
    id: 'direct',
    tileProperties: { '0': { target: { type: 'object' as const, value: 'same' } } },
  }
  const dependent = {
    ...art,
    id: 'dependent',
    tileProperties: { '0': { via: { type: 'asset' as const, value: 'direct' } } },
  }
  const map: TilemapAsset = {
      ...base,
      tilesetId: 'dependent',
      resources: [
        { sourceId: 'source-a', capturedAt: 1, asset: direct },
        { sourceId: 'source-b', capturedAt: 1, asset: dependent },
      ],
    },
    before = structuredClone(map)
  const copy = cloneMapIds(map, undefined, new Set(['same'])),
    a = copy.resources![0]!.asset,
    b = copy.resources![1]!.asset
  expect(a.id).not.toBe('direct')
  expect(b.id).not.toBe('dependent')
  if (!isTilesetKind(b)) throw Error('Tiles expected')
  expect(b.tileProperties!['0']!.via).toEqual({ type: 'asset', value: a.id })
  expect(copy.tilesetId).toBe(b.id)
  expect(map).toEqual(before)
})
test('a fragment keeps external object references even when they match an old layer ID', () => {
  const source = overlappingNamespaces(),
    layer = source.layers.find(isObjectLayer)!
  layer.objects.push({
    id: 'inside',
    name: 'Dentro',
    type: '',
    x: 16,
    y: 16,
    width: 0,
    height: 0,
    properties: { external: { type: 'object', value: 'same' } },
  })
  const copy = cloneMapIds(source, undefined, new Set(['inside'])),
    objects = copy.layers.find(isObjectLayer)!.objects
  expect(objects[0]!.id).toBe('same')
  expect(objects[1]!.id).not.toBe('inside')
  expect(objects[1]!.properties.external).toEqual({ type: 'object', value: 'same' })
})
test('the same clone retains the region representation and origin without materializing cells', () => {
  const prepared = prepareMapRegions(overlappingNamespaces())
  if (!prepared.ok) throw Error(prepared.reason)
  const copy = cloneMapIds(prepared.map)
  expect(copy.schema).toBe(8)
  expect(copy.origin).toEqual(prepared.map.origin)
  expect(copy.layers.find(isTileLayer)!.cells).toBe(prepared.map.layers.find(isTileLayer)!.cells)
  expect(copy.layers.find(isGroupLayer)!.id).not.toBe(
    copy.layers.find(isObjectLayer)!.objects[0]!.id,
  )
})

test('region remapping preserves explicit sheet bindings while dense maps retain legacy canonicalization', () => {
  const base = createTilemapAsset({
    name: 'Vínculo explícito',
    tilesetId: 'tiles',
    cols: 2,
    rows: 2,
  })
  const dense: TilemapAsset = {
    ...base,
    layers: base.layers.map((l) => (isTileLayer(l) ? { ...l, tilesetId: base.tilesetId } : l)),
  }
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  const remap = (id: string) => `copy-${id}`
  const legacy = remapTilemapTilesetIds(dense, remap)
  expect(legacy.layers.find(isTileLayer)!.tilesetId).toBeUndefined()
  const region = remapTilemapTilesetIds(prepared.map, remap)
  expect(region.layers.find(isTileLayer)!.tilesetId).toBe(region.tilesetId)
  expect(remapTilemapTilesetIds(prepared.map, (id) => id)).toBe(prepared.map)
})
