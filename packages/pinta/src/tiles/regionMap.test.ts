import { expect, test } from 'bun:test'
import { PINTA_REGION_LIMITS, type PintaRegionCells } from '@sistemazero/core/creations'
import {
  createTilemapAsset,
  effectiveLayer,
  isGroupLayer,
  isObjectLayer,
  isTileLayer,
  type RegionTilemapAsset,
  tilemapTilesetIds,
} from '../core/project'
import { CELL_FLIP_H, makeCell } from './cell'
import { createTileCellReader } from './mapCells'
import {
  editRegionMapCells,
  expandRegionMap,
  prepareMapRegions,
  regionMapBounds,
} from './regionMap'

function prepared() {
  const source = createTilemapAsset({ name: 'Vila', tilesetId: 'ground', cols: 3, rows: 2 })
  source.layers[0]!.cells![2] = makeCell(7, CELL_FLIP_H)
  source.layers.push({
    kind: 'group',
    id: 'g',
    name: 'Floresta',
    visible: true,
    opacity: 0.5,
    offsetX: 0.25,
  })
  source.layers.push({
    id: 'trees',
    name: 'Árvores',
    visible: true,
    parentId: 'g',
    tilesetId: 'trees',
    front: true,
    cells: new Int16Array(6).fill(-1),
  })
  source.layers.push({
    kind: 'objects',
    id: 'doors',
    name: 'Portas',
    visible: true,
    objects: [
      {
        id: 'door',
        name: 'Cabana',
        type: 'door',
        role: 'door',
        shape: 'rect',
        x: 16.5,
        y: 8.25,
        width: 16,
        height: 32,
        properties: { map: 'cabana', arrival: { type: 'object', value: 'entrada' } },
      },
    ],
  })
  const result = prepareMapRegions(source)
  if (!result.ok) throw Error(result.reason)
  return { source, map: result.map, id: source.layers[0]!.id }
}
const read = (map: RegionTilemapAsset, id: string, col: number, row: number) => {
  const layer = map.layers.find((l) => l.id === id)
  if (!layer || !isTileLayer(layer)) throw Error('Expected tile layer')
  return createTileCellReader(layer.cells, regionMapBounds(map)).at(col, row)
}

test('explicit conversion reuses the same map model and retains layer/object relationships', () => {
  const { source, map, id } = prepared()
  expect(map.id).toBe(source.id)
  expect(map.schema).toBe(8)
  expect(map.origin).toEqual({ col: 0, row: 0 })
  expect(map.layers.map((l) => l.id)).toEqual(source.layers.map((l) => l.id))
  expect(map.layers.find(isGroupLayer)).toBe(source.layers.find(isGroupLayer))
  expect(map.layers.find(isObjectLayer)).toBe(source.layers.find(isObjectLayer))
  expect(tilemapTilesetIds(map)).toEqual(['ground', 'trees'])
  expect(effectiveLayer(map, map.layers[2]!)).toMatchObject({ opacity: 0.5, offsetX: 0.25 })
  expect(read(map, id, 2, 0)).toBe(makeCell(7, CELL_FLIP_H))
  expect(source.schema).toBeUndefined()
  expect(source.layers[0]!.cells).toBeInstanceOf(Int16Array)
})

test('growing left/up shares all buffers and leaves objects and old cell coordinates fixed', () => {
  const { map, id } = prepared()
  const result = expandRegionMap(map, { col: -40, row: -40, cols: 100, rows: 100 })
  if (!result.ok) throw Error(result.reason)
  expect(result.map.layers).toBe(map.layers)
  expect(read(result.map, id, 2, 0)).toBe(makeCell(7, CELL_FLIP_H))
  expect(read(result.map, id, -1, 0)).toBe(-1)
  expect(map.origin).toEqual({ col: 0, row: 0 })
  expect(result.map.origin).toEqual({ col: -40, row: -40 })
  expect(regionMapBounds(result.map)).toEqual({ col: -40, row: -40, cols: 100, rows: 100 })
})

test('bounds changes are no-ops or explicit atomic rejections, never implicit crop', () => {
  const { map } = prepared()
  expect(expandRegionMap(map, regionMapBounds(map))).toEqual({ ok: true, map })
  expect(expandRegionMap(map, { col: 0, row: 0, cols: 2, rows: 2 })).toEqual({
    ok: false,
    reason: 'would-crop',
  })
  expect(expandRegionMap(map, { col: -10001, row: 0, cols: 10000, rows: 2 })).toEqual({
    ok: false,
    reason: 'invalid-bounds',
  })
  expect(expandRegionMap(map, { col: 0, row: 0, cols: 10001, rows: 2 })).toEqual({
    ok: false,
    reason: 'invalid-bounds',
  })
})

test('one gesture edits negative cells with sharing and keeps the previous map usable', () => {
  const { map, id } = prepared()
  const expanded = expandRegionMap(map, { col: -64, row: -64, cols: 128, rows: 128 })
  if (!expanded.ok) throw Error(expanded.reason)
  const result = editRegionMapCells(expanded.map, id, [
    { col: -1, row: -1, cell: 4 },
    { col: -2, row: -1, cell: 5 },
  ])
  if (!result.ok) throw Error(result.reason)
  expect(read(result.map, id, -1, -1)).toBe(4)
  expect(read(result.map, id, -2, -1)).toBe(5)
  expect(read(expanded.map, id, -1, -1)).toBe(-1)
  expect(result.map.layers[1]).toBe(map.layers[1])
  expect(result.map.layers[3]).toBe(map.layers[3])
  expect(editRegionMapCells(result.map, id, [{ col: -1, row: -1, cell: 4 }])).toEqual({
    ok: true,
    map: result.map,
  })
})

test('invalid targets, inherited locks and invalid edits preserve every layer', () => {
  const { map, id } = prepared()
  expect(editRegionMapCells(map, 'missing', [])).toEqual({ ok: false, reason: 'invalid-layer' })
  expect(editRegionMapCells(map, 'doors', [])).toEqual({ ok: false, reason: 'invalid-layer' })
  const locked = {
    ...map,
    layers: map.layers.map((l) => (l.id === 'g' ? { ...l, locked: true as const } : l)),
  }
  expect(editRegionMapCells(locked, 'trees', [{ col: 0, row: 0, cell: 1 }])).toEqual({
    ok: false,
    reason: 'locked',
  })
  expect(
    editRegionMapCells(map, id, [
      { col: 0, row: 0, cell: 5 },
      { col: 100, row: 0, cell: 6 },
    ]),
  ).toEqual({ ok: false, reason: 'outside-map' })
  expect(read(map, id, 0, 0)).toBe(-1)
})

test('occupied chunk budget is shared across layers, including untouched layers', () => {
  const { map, id } = prepared()
  const chunk = () => new Int16Array(1024).fill(-1)
  const cells: PintaRegionCells = {
    kind: 'regions',
    version: 1,
    side: 32,
    chunks: Array.from({ length: PINTA_REGION_LIMITS.maxChunks }, (_, i) => {
      const data = chunk()
      data[0] = 1
      return { col: i % 64, row: Math.floor(i / 64), cells: data }
    }),
  }
  const full: RegionTilemapAsset = {
    ...map,
    origin: { col: 0, row: 0 },
    cols: 3000,
    rows: 3000,
    layers: [
      {
        id,
        name: 'Empty',
        visible: true,
        cells: { kind: 'regions', version: 1, side: 32, chunks: [] },
      },
      { id: 'occupied', name: 'Occupied', visible: true, cells },
    ],
  }
  expect(editRegionMapCells(full, id, [{ col: 0, row: 0, cell: 1 }])).toEqual({
    ok: false,
    reason: 'cell-budget',
  })
  expect(full.layers[1]!.cells).toBe(cells)
  const moved = editRegionMapCells(full, 'occupied', [
    { col: 0, row: 0, cell: -1 },
    { col: 2500, row: 2500, cell: 3 },
  ])
  if (!moved.ok) throw Error(moved.reason)
  expect(read(moved.map, 'occupied', 2500, 2500)).toBe(3)
  expect(read(moved.map, 'occupied', 0, 0)).toBe(-1)
  expect(read(full, 'occupied', 0, 0)).toBe(1)
})

test('conversion refuses inconsistent or invalid cells before returning any migrated document', () => {
  const source = createTilemapAsset({ name: 'Invalid', tilesetId: 'ground', cols: 2, rows: 2 })
  const layer = source.layers[0]
  if (!layer || !isTileLayer(layer)) throw Error('Expected tile layer')
  const broken = { ...source, layers: [{ ...layer, cells: new Int16Array(3) }] }
  expect(prepareMapRegions(broken)).toEqual({ ok: false, reason: 'invalid-map' })
  layer.cells[0] = -2
  expect(prepareMapRegions(source)).toEqual({ ok: false, reason: 'invalid-map' })
  expect(source.schema).toBeUndefined()
  expect(layer.cells[0]).toBe(-2)
})
