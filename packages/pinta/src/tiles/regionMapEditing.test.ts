import { expect, test } from 'bun:test'
import { createTilemapAsset, type RegionTilemapAsset } from '../core/project'
import { CELL_FLIP_H, makeCell } from './cell'
import { REGION_EDIT_LIMIT } from './regionCells'
import { expandRegionMap, fillRegionMapCells, prepareMapRegions } from './regionMap'
import { cellAt, floodFillCells, setCell, setCells, tileLayerById } from './tilemapOps'

function expanded() {
  const dense = createTilemapAsset({ name: 'Paint', tilesetId: 'tiles', cols: 3, rows: 2 })
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  const grown = expandRegionMap(prepared.map, { col: -40, row: -40, cols: 80, rows: 80 })
  if (!grown.ok) throw Error(grown.reason)
  return grown.map
}

test('existing pencil paints and erases negative region coordinates without changing the snapshot', () => {
  const map = expanded(),
    id = map.layers[0]!.id,
    value = makeCell(3, CELL_FLIP_H)
  const painted = setCell(map, id, -1, -1, value)
  expect(painted.origin).toEqual(map.origin)
  expect(cellAt(painted, id, -1, -1)).toBe(value)
  expect(cellAt(map, id, -1, -1)).toBe(-1)
  expect(setCell(painted, id, -1, -1, value)).toBe(painted)
  const erased = setCell(painted, id, -1, -1, -1)
  expect(cellAt(erased, id, -1, -1)).toBe(-1)
  expect(cellAt(painted, id, -1, -1)).toBe(value)
})

test('one batch paints across regions, clips outside cells and keeps the previous history value', () => {
  const map = expanded(),
    id = map.layers[0]!.id
  const painted = setCells(
    map,
    id,
    [
      { col: -1, row: -1 },
      { col: 33, row: 33 },
      { col: 41, row: 33 },
    ],
    4,
  )
  expect(painted.origin).toEqual(map.origin)
  expect(cellAt(painted, id, -1, -1)).toBe(4)
  expect(cellAt(painted, id, 33, 33)).toBe(4)
  expect(cellAt(map, id, -1, -1)).toBe(-1)
  expect(cellAt(map, id, 33, 33)).toBe(-1)
  expect(setCells(painted, id, [{ col: -1, row: -1 }], 4)).toBe(painted)
  expect(
    setCells(
      map,
      id,
      Array.from({ length: REGION_EDIT_LIMIT + 1 }, () => ({ col: 0, row: 0 })),
      4,
    ),
  ).toBe(map)
})

test('dense pencil and batches cannot alias fractional coordinates into a different valid cell', () => {
  const map = createTilemapAsset({ name: 'Dense', tilesetId: 'tiles', cols: 3, rows: 2 })
  const id = map.layers[0]!.id
  expect(setCell(map, id, 0.5, 0.5, 5)).toBe(map)
  expect(setCells(map, id, [{ col: 0.5, row: 0.5 }], 5)).toBe(map)
  expect(floodFillCells(map, id, 0.5, 0.5, 5)).toBe(map)
  expect(cellAt(map, id, 2, 0)).toBe(-1)
})

test('the bucket crosses chunk seams without crossing a wall or changing the previous snapshot', () => {
  const source = expanded(),
    id = source.layers[0]!.id
  const wall = setCells(
    source,
    id,
    Array.from({ length: 80 }, (_, i) => ({ col: 0, row: i - 40 })),
    1,
  )
  const filled = floodFillCells(wall, id, -1, -1, 2)
  expect(filled.origin).toEqual(source.origin)
  expect(cellAt(filled, id, -40, -40)).toBe(2)
  expect(cellAt(filled, id, -1, 39)).toBe(2)
  expect(cellAt(filled, id, 0, 0)).toBe(1)
  expect(cellAt(filled, id, 1, 0)).toBe(-1)
  expect(cellAt(wall, id, -1, -1)).toBe(-1)
  expect(floodFillCells(filled, id, -1, -1, 2)).toBe(filled)
})

test('an oversized empty flood is refused as a whole without materializing the world', () => {
  const source = expanded(),
    id = source.layers[0]!.id
  const expandedMap = expandRegionMap(source, { col: -40, row: -40, cols: 10000, rows: 10000 })
  if (!expandedMap.ok) throw Error(expandedMap.reason)
  expect(floodFillCells(expandedMap.map, id, 0, 0, 3)).toBe(expandedMap.map)
  expect(fillRegionMapCells(expandedMap.map, id, 0, 0, 3)).toEqual({
    ok: false,
    reason: 'work-budget',
  })
  expect(cellAt(expandedMap.map, id, 0, 0)).toBe(-1)
})

test('region editing respects inherited locks and refuses malformed cell values without history', () => {
  const source = expanded(),
    id = source.layers[0]!.id
  const map: RegionTilemapAsset = {
    ...source,
    layers: [
      { kind: 'group', id: 'locked', name: 'Locked', visible: true, locked: true },
      ...source.layers.map((layer) => ({ ...layer, parentId: 'locked' })),
    ],
  }
  expect(setCell(map, id, 0, 0, 2)).toBe(map)
  expect(setCells(map, id, [{ col: 0, row: 0 }], 2)).toBe(map)
  expect(floodFillCells(map, id, 0, 0, 2)).toBe(map)
  expect(setCell(source, id, 0, 0, 65535)).toBe(source)
  expect(setCells(source, id, [{ col: 0, row: 0 }], 65535)).toBe(source)
})

test('the shared bucket still fills the complete maximum dense layer with flags preserved', () => {
  const source = createTilemapAsset({
    name: 'Maximum dense',
    tilesetId: 'tiles',
    cols: 256,
    rows: 256,
  })
  const id = source.layers[0]!.id,
    value = makeCell(9, CELL_FLIP_H)
  const filled = floodFillCells(source, id, 255, 255, value)
  expect(tileLayerById(filled, id)?.cells.length).toBe(65536)
  expect(tileLayerById(filled, id)?.cells.every((cell) => cell === value)).toBe(true)
  expect(tileLayerById(source, id)?.cells.every((cell) => cell === -1)).toBe(true)
})

test('the shared bucket does not join diagonal cells or wrap between rows', () => {
  const source = createTilemapAsset({ name: 'Connected', tilesetId: 'tiles', cols: 2, rows: 2 })
  const id = source.layers[0]!.id
  const corners = setCells(
    source,
    id,
    [
      { col: 0, row: 0 },
      { col: 1, row: 1 },
    ],
    1,
  )
  const filled = floodFillCells(corners, id, 0, 0, 2)
  expect(cellAt(filled, id, 0, 0)).toBe(2)
  expect(cellAt(filled, id, 1, 1)).toBe(1)
  expect(cellAt(filled, id, 1, 0)).toBe(-1)
  expect(cellAt(filled, id, 0, 1)).toBe(-1)
})
