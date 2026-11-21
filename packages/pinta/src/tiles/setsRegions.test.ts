import { expect, test } from 'bun:test'
import {
  createTilemapAsset,
  effectiveLayer,
  isGroupLayer,
  isObjectLayer,
  isTileLayer,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  sanitizePintaAsset,
} from '../core/project'
import {
  decodeRegionMapDocument,
  decodeRegionSetDocument,
  encodeRegionMapDocument,
  encodeRegionSetDocument,
} from '../core/regionDocument'
import { CELL_FLIP_H, makeCell } from './cell'
import { createTileCellReader } from './mapCells'
import { addMapObject, createRegionMapObject, updateMapObject } from './mapObjects'
import { editRegionMapCells, expandRegionMap, prepareMapRegions } from './regionMap'
import { createMapSet, detachMapSet, placeMapSet } from './sets'

function region(): RegionTilemapAsset {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'Mundo', tilesetId: 'ground', cols: 4, rows: 4 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  return expanded.map
}

test('capture uses signed occupied regions, retains transforms and round trips a native 8 set', () => {
  const base = region(),
    layer = base.layers.find(isTileLayer)!
  const edited = editRegionMapCells(base, layer.id, [
    { col: -33, row: -1, cell: makeCell(3, CELL_FLIP_H) },
  ])
  if (!edited.ok) throw Error(edited.reason)
  const before = structuredClone(edited.map)
  const set = createMapSet(edited.map, { col: -34, row: -2, cols: 4, rows: 4 }, 16, 'Bosque')
  expect(set.schema).toBe(8)
  expect(set.map.origin).toEqual({ col: 0, row: 0 })
  const cells = set.map.layers.find(isTileLayer)!.cells
  expect(createTileCellReader(cells, { col: 0, row: 0, cols: 4, rows: 4 }).at(1, 1)).toBe(
    makeCell(3, CELL_FLIP_H),
  )
  const wire = encodeRegionSetDocument(set)
  expect(wire).not.toBeNull()
  expect(decodeRegionSetDocument(JSON.parse(JSON.stringify(wire)))).toEqual(set)
  expect(sanitizePintaAsset(wire)).toBeNull()
  expect(edited.map).toEqual(before)
})

test('region set decoder refuses unknown wrapper metadata and nested live sets atomically', () => {
  const set = createMapSet(region(), { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'Bosque')
  expect(decodeRegionSetDocument({ ...set, future: true })).toBeNull()
  expect(decodeRegionSetDocument({ ...set, schema: 9 })).toBeNull()
  expect(decodeRegionSetDocument({ ...set, map: { ...set.map, future: true } })).toBeNull()
  const object = createRegionMapObject({ shape: 'set', setId: set.id })!
  expect(
    decodeRegionSetDocument({
      ...set,
      map: {
        ...set.map,
        layers: [
          ...set.map.layers,
          {
            id: 'nested',
            kind: 'objects',
            name: 'Dentro',
            visible: true,
            objects: [object],
          },
        ],
      },
    }),
  ).toBeNull()
})

test('linked placement and editing keep signed fractional geometry and refuse invalid changes', () => {
  const base = region(),
    map: RegionTilemapAsset = {
      ...base,
      layers: [
        ...base.layers,
        {
          id: 'sets',
          kind: 'objects',
          name: 'Conjuntos',
          visible: true,
          objects: [],
        },
      ],
    }
  const set = createMapSet(base, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'Bosque')
  const placed = placeMapSet(map, 'sets', set, -100.5, -20.25, 16)
  const object = placed.layers.find(isObjectLayer)!.objects[0]!
  expect(object).toMatchObject({ x: -100.5, y: -20.25, width: 32, height: 32, setId: set.id })
  const updated = updateMapObject(placed, 'sets', object.id, { x: -480000.5 })
  expect(updated).toBe(placed)
  expect(placeMapSet(map, 'sets', set, NaN, 1, 16)).toBe(map)
  expect(detachMapSet(map, 'sets', 'missing', set, 16)).toBe(map)
  const marker = createRegionMapObject({ id: 'same', x: -1.25, y: -2.5, rotation: 0 })!
  const first = addMapObject(map, 'sets', marker)
  const other: RegionTilemapAsset = {
    ...first,
    layers: [
      ...first.layers,
      { id: 'other', kind: 'objects', name: 'Outro', visible: true, objects: [] },
    ],
  }
  expect(addMapObject(other, 'other', marker)).toBe(other)
  expect(first.layers.find(isObjectLayer)!.objects[0]).toMatchObject({
    x: -1.25,
    y: -2.5,
    rotation: 0,
  })
})

test('detach into a signed region map preserves the visual position and source snapshot', () => {
  const source = region(),
    layer = source.layers.find(isTileLayer)!
  const edited = editRegionMapCells(source, layer.id, [
    { col: 1, row: 1, cell: makeCell(3, CELL_FLIP_H) },
  ])
  if (!edited.ok) throw Error(edited.reason)
  const set = createMapSet(edited.map, { col: 0, row: 0, cols: 4, rows: 4 }, 16, 'Bosque')
  const target: RegionTilemapAsset = {
    ...region(),
    layers: [
      ...region().layers,
      {
        kind: 'objects',
        id: 'sets',
        name: 'Conjuntos',
        visible: true,
        objects: [
          {
            id: 'instance',
            name: 'Bosque',
            type: '',
            shape: 'set',
            setId: set.id,
            x: -600,
            y: -500,
            width: 64,
            height: 64,
            properties: {},
          },
        ],
      },
    ],
  }
  const before = structuredClone(target),
    frozen = structuredClone(set)
  const result = detachMapSet(target, 'sets', 'instance', set, 16)
  expect(result).not.toBe(target)
  const placed = result.layers.filter(isTileLayer).find((l) => l.id !== target.layers[0]!.id)!
  const e = effectiveLayer(result, placed),
    points: Array<{ x: number; y: number; cell: number }> = []
  createTileCellReader(placed.cells, {
    ...result.origin,
    cols: result.cols,
    rows: result.rows,
  }).visitOccupied({ ...result.origin, cols: result.cols, rows: result.rows }, (cell, col, row) =>
    points.push({ x: col * 16 + e.offsetX, y: row * 16 + e.offsetY, cell }),
  )
  expect(points).toEqual([{ x: -584, y: -484, cell: makeCell(3, CELL_FLIP_H) }])
  expect(result.layers.find(isObjectLayer)!.objects).toHaveLength(0)
  expect(target).toEqual(before)
  expect(set).toEqual(frozen)
})

test('detaching keeps region groups, typed properties, inherited parallax and fractional object geometry', () => {
  const base = region(),
    marker = createRegionMapObject({
      id: 'marker',
      name: 'Flor',
      x: 2.25,
      y: 4.75,
      rotation: 30,
      properties: { self: { type: 'object', value: 'marker' } },
    })!
  const source: RegionTilemapAsset = {
    ...base,
    layers: [
      {
        id: 'garden',
        kind: 'group',
        name: 'Jardim',
        visible: true,
        offsetX: 16.25,
        offsetY: -0.5,
        opacity: 0.5,
        parallaxX: 0.5,
        properties: { note: 'vivo' },
      },
      { ...base.layers[0]!, parentId: 'garden' },
      {
        id: 'flowers',
        kind: 'objects',
        name: 'Flores',
        visible: true,
        parentId: 'garden',
        offsetX: 0.25,
        objects: [marker],
      },
    ],
  }
  const set = createMapSet(source, { col: 0, row: 0, cols: 4, rows: 4 }, 16, 'Jardim')
  const blank = region(),
    target: RegionTilemapAsset = {
      ...blank,
      layers: [
        ...blank.layers,
        {
          id: 'outer',
          kind: 'group',
          name: 'Vila',
          visible: true,
          offsetX: 100.5,
          offsetY: -10.25,
          parallaxX: 0.75,
        },
        {
          id: 'sets',
          kind: 'objects',
          name: 'Conjuntos',
          visible: true,
          parentId: 'outer',
          offsetX: 3.25,
          parallaxX: 0.8,
          objects: [],
        },
      ],
    }
  const placed = placeMapSet(target, 'sets', set, -600.5, -500.25, 16),
    instance = placed.layers.find((l) => l.id === 'sets')!
  if (!isObjectLayer(instance)) throw Error('Layer expected')
  const turned = updateMapObject(placed, 'sets', instance.objects[0]!.id, {
    rotation: 90,
    flipX: true,
  })
  const before = structuredClone(turned),
    detached = detachMapSet(turned, 'sets', instance.objects[0]!.id, set, 16)
  expect(detached).not.toBe(turned)
  const group = detached.layers.filter(isGroupLayer).find((l) => l.name === 'Jardim')!
  expect(group.properties).toEqual({ note: 'vivo' })
  expect(group.parentId).toBe('outer')
  const objects = detached.layers.filter(isObjectLayer).find((l) => l.name === 'Flores')!,
    object = objects.objects[0]!,
    e = effectiveLayer(detached, objects)
  const original = set.map.layers.filter(isObjectLayer)[0]!,
    old = original.objects[0]!,
    oldE = effectiveLayer(set.map, original),
    ownerE = effectiveLayer(turned, instance)
  expect(objects.parentId).toBe(group.id)
  expect(object.x + e.offsetX).toBeCloseTo(ownerE.offsetX - 600.5 - (old.y + oldE.offsetY))
  expect(object.y + e.offsetY).toBeCloseTo(ownerE.offsetY - 500.25 + 64 - (old.x + oldE.offsetX))
  expect(e.parallaxX).toBeCloseTo(0.75 * 0.8 * 0.5)
  expect(e.opacity).toBe(0.5)
  expect(object.rotation).toBe(60)
  expect(object.properties.self).toEqual({ type: 'object', value: object.id })
  expect(decodeRegionMapDocument(encodeRegionMapDocument(detached))).toEqual(detached)
  expect(turned).toEqual(before)
})

test('region detachment refuses global storage and gesture budgets without removing the live instance', () => {
  const source = region(),
    sourceLayer = source.layers.find(isTileLayer)!
  const edited = editRegionMapCells(source, sourceLayer.id, [{ col: 0, row: 0, cell: 0 }])
  if (!edited.ok) throw Error(edited.reason)
  const set = createMapSet(edited.map, { col: 0, row: 0, cols: 1, rows: 1 }, 16, 'Pedaço')
  const chunks = Array.from({ length: 2048 }, (_, i) => {
    const cells = new Int16Array(1024).fill(-1)
    cells[0] = 0
    return { col: i % 64, row: Math.floor(i / 64), cells }
  })
  const grid = { kind: 'regions' as const, version: 1 as const, side: 32 as const, chunks }
  const target: RegionTilemapAsset = {
    ...source,
    layers: [
      { ...sourceLayer, cells: grid },
      { id: 'sets', kind: 'objects', name: 'Conjuntos', visible: true, objects: [] },
    ],
  }
  const placed = placeMapSet(target, 'sets', set, 1, 1, 16),
    id = placed.layers.find(isObjectLayer)!.objects[0]!.id
  expect(detachMapSet(placed, 'sets', id, set, 16)).toBe(placed)
  expect(placed.layers.find(isObjectLayer)!.objects).toHaveLength(1)
  expect(placed.layers.find(isTileLayer)!.cells).toBe(grid)
  const dense = createTilemapAsset({ name: 'Cheio', tilesetId: 'ground', cols: 256, rows: 256 })
  dense.layers.find(isTileLayer)!.cells.fill(0)
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  const grown = expandRegionMap(prepared.map, { col: 0, row: 0, cols: 257, rows: 257 })
  if (!grown.ok) throw Error(grown.reason)
  const overflow = editRegionMapCells(grown.map, grown.map.layers.find(isTileLayer)!.id, [
    { col: 256, row: 0, cell: 0 },
  ])
  if (!overflow.ok) throw Error(overflow.reason)
  const heavy: RegionMapSetAsset = { ...set, map: overflow.map }
  const empty: RegionTilemapAsset = {
    ...source,
    layers: [
      ...source.layers,
      { id: 'sets', kind: 'objects', name: 'Conjuntos', visible: true, objects: [] },
    ],
  }
  const live = placeMapSet(empty, 'sets', heavy, 0, 0, 16),
    instance = live.layers.find(isObjectLayer)!.objects[0]!
  expect(detachMapSet(live, 'sets', instance.id, heavy, 16)).toBe(live)
})

test('legacy flattening keeps inherited parallax when independent layers replace a set', () => {
  const base = createTilemapAsset({ name: 'Fonte', tilesetId: 'ground', cols: 2, rows: 2 })
  base.layers = [
    { id: 'group', kind: 'group', name: 'Longe', visible: true, parallaxX: 0.5, parallaxY: 0.25 },
    ...base.layers.map((l) => ({ ...l, parentId: 'group' })),
  ]
  const set = createMapSet(base, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'Longe')
  const target = createTilemapAsset({ name: 'Destino', tilesetId: 'ground', cols: 4, rows: 4 })
  target.layers.push({
    id: 'sets',
    kind: 'objects',
    name: 'Conjuntos',
    visible: true,
    parallaxX: 0.8,
    parallaxY: 2,
    objects: [],
  })
  const placed = placeMapSet(target, 'sets', set, 0, 0, 16),
    id = placed.layers.find(isObjectLayer)!.objects[0]!.id
  const result = detachMapSet(placed, 'sets', id, set, 16)
  const layer = result.layers.filter(isTileLayer).find((l) => l.id !== target.layers[0]!.id)!
  expect(effectiveLayer(result, layer)).toMatchObject({ parallaxX: 0.4, parallaxY: 0.5 })
  const tooFast = {
    ...set,
    map: {
      ...set.map,
      layers: set.map.layers.map((l) => (isGroupLayer(l) ? { ...l, parallaxX: 4 } : l)),
    },
  }
  const accelerated = {
    ...placed,
    layers: placed.layers.map((l) => (l.id === 'sets' ? { ...l, parallaxX: 4 } : l)),
  }
  expect(detachMapSet(accelerated, 'sets', id, tooFast, 16)).toBe(accelerated)
})
