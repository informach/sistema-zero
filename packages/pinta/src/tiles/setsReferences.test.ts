import { expect, test } from 'bun:test'
import {
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  isTilesetKind,
  type TilemapAsset,
} from '../core/project'
import { addMapObject, createMapObject } from './mapObjects'
import { createMapSet, detachMapSet } from './sets'
import { addObjectLayer } from './tilemapOps'

function sourceMap(): TilemapAsset {
  const art = createTilesetAsset({ name: 'Pedra', tileSize: 16 })
  const frozen = {
    ...art,
    id: 'frozen-stone',
    tileProperties: {
      '0': {
        target: { type: 'object' as const, value: 'marker' },
        outside: { type: 'object' as const, value: 'outside' },
        literal: 'marker',
      },
    },
  }
  const map = addObjectLayer(
    createTilemapAsset({ name: 'Vila', tilesetId: frozen.id, cols: 8, rows: 8 }),
    'Marcas',
  )
  const layer = map.layers.find(isObjectLayer)!
  const withMarker = addMapObject(
    map,
    layer.id,
    createMapObject({ id: 'marker', name: 'Marca', x: 16, y: 16 }),
  )
  const withOutside = addMapObject(
    withMarker,
    layer.id,
    createMapObject({ id: 'outside', name: 'Fora do pedaço', x: 96, y: 96 }),
  )
  return { ...withOutside, resources: [{ sourceId: art.id, capturedAt: 1000, asset: frozen }] }
}
function properties(map: TilemapAsset) {
  const art = map.resources?.[0]?.asset
  if (!art || !isTilesetKind(art)) throw Error('Versão de peças esperada')
  return { id: art.id, values: art.tileProperties!['0']! }
}
test('a captured set relinks embedded tile object properties and gives changed immutable versions new IDs', () => {
  const source = sourceMap(),
    before = structuredClone(source)
  const set = createMapSet(source, { col: 0, row: 0, cols: 4, rows: 4 }, 16, 'Jardim')
  const marker = set.map.layers
    .filter(isObjectLayer)
    .flatMap((l) => l.objects)
    .find((o) => o.name === 'Marca')!
  expect(marker.id).not.toBe('marker')
  expect(properties(set.map).values.target).toEqual({ type: 'object', value: marker.id })
  expect(properties(set.map).values.outside).toEqual({ type: 'object', value: 'outside' })
  expect(properties(set.map).values.literal).toBe('marker')
  expect(properties(set.map).id).not.toBe(properties(source).id)
  expect(set.map.tilesetId).toBe(properties(set.map).id)
  expect(source).toEqual(before)
})

test('detaching a set relinks tile resource properties to the newly independent objects', () => {
  const set = createMapSet(sourceMap(), { col: 0, row: 0, cols: 4, rows: 4 }, 16, 'Jardim')
  const target = addObjectLayer(
    createTilemapAsset({ name: 'Destino', tilesetId: 'ground', cols: 8, rows: 8 }),
    'Conjuntos',
  )
  const owner = target.layers.find(isObjectLayer)!
  const instance = createMapObject({
    shape: 'set',
    setId: set.id,
    x: 16,
    y: 16,
    width: 64,
    height: 64,
  })
  const placed = addMapObject(target, owner.id, instance),
    before = structuredClone(set)
  const detached = detachMapSet(placed, owner.id, instance.id, set, 16)
  expect(detached).not.toBe(placed)
  const marker = detached.layers
    .filter(isObjectLayer)
    .flatMap((l) => l.objects)
    .find((o) => o.name === 'Marca')!
  expect(properties(detached).values.target).toEqual({ type: 'object', value: marker.id })
  expect(properties(detached).values.outside).toEqual({ type: 'object', value: 'outside' })
  expect(properties(detached).id).not.toBe(properties(set.map).id)
  expect(set).toEqual(before)
})

test('detaching retains locks inherited from a template group', () => {
  const base = sourceMap(),
    source: TilemapAsset = {
      ...base,
      layers: [
        { id: 'locked-group', kind: 'group', name: 'Protegido', visible: true, locked: true },
        ...base.layers.map((l) => ({ ...l, parentId: 'locked-group' })),
      ],
    }
  const set = createMapSet(source, { col: 0, row: 0, cols: 4, rows: 4 }, 16, 'Jardim')
  const target = addObjectLayer(
      createTilemapAsset({ name: 'Destino', tilesetId: 'ground', cols: 8, rows: 8 }),
      'Conjuntos',
    ),
    owner = target.layers.find(isObjectLayer)!
  const instance = createMapObject({
    shape: 'set',
    setId: set.id,
    x: 16,
    y: 16,
    width: 64,
    height: 64,
  })
  const detached = detachMapSet(
    addMapObject(target, owner.id, instance),
    owner.id,
    instance.id,
    set,
    16,
  )
  const objects = detached.layers
    .filter(isObjectLayer)
    .find((l) => l.objects.some((o) => o.name === 'Marca'))!
  expect(objects.locked).toBe(true)
})

test('unchanged frozen artwork is reused when no object property needs rebinding', () => {
  const source = sourceMap(),
    art = source.resources![0]!.asset
  if (!isTilesetKind(art)) throw Error('Peças esperadas')
  delete art.tileProperties!['0']!.target
  const set = createMapSet(source, { col: 0, row: 0, cols: 4, rows: 4 }, 16, 'Jardim')
  expect(properties(set.map).id).toBe(properties(source).id)
  const base = addObjectLayer(
      createTilemapAsset({ name: 'Destino', tilesetId: 'ground', cols: 8, rows: 8 }),
      'Conjuntos',
    ),
    owner = base.layers.find(isObjectLayer)!
  const target = { ...base, resources: set.map.resources },
    instance = createMapObject({ shape: 'set', setId: set.id, x: 16, y: 16, width: 64, height: 64 })
  const detached = detachMapSet(
    addMapObject(target, owner.id, instance),
    owner.id,
    instance.id,
    set,
    16,
  )
  expect(detached.resources).toHaveLength(1)
  expect(properties(detached).id).toBe(properties(set.map).id)
})

test('invalid or oversized crops are refused before an invalid dense template can be produced', () => {
  const source = sourceMap()
  for (const rect of [
    { col: 0, row: 0, cols: 0, rows: 1 },
    { col: 0, row: 0, cols: 257, rows: 1 },
    { col: 0.5, row: 0, cols: 2, rows: 2 },
    { col: 0, row: 0, cols: 1.5, rows: 2 },
  ])
    expect(() => createMapSet(source, rect, 16, 'Pedaço')).toThrow()
  expect(() => createMapSet(source, { col: 0, row: 0, cols: 2, rows: 2 }, 0, 'Pedaço')).toThrow()
})
