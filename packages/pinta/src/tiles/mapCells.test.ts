import { expect, test } from 'bun:test'
import type { PintaRegionCells } from '@sistemazero/core/creations'
import { createTilemapAsset } from '../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, makeCell } from './cell'
import { createTileCellReader } from './mapCells'
import { denseToRegionCells, editRegionCells } from './regionCells'
import { cellAt, setCell } from './tilemapOps'

const bounds = { col: -2, row: -1, cols: 4, rows: 3 }
const dense = () =>
  new Int16Array([
    0,
    -1,
    2,
    -1,
    -1,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    makeCell(255, CELL_FLIP_H | CELL_FLIP_D),
  ])
function grid(sparse: boolean) {
  const cells = dense()
  const result = sparse ? denseToRegionCells(cells, bounds) : cells
  if (!result) throw Error('Expected validated grid')
  return result
}

test.each([
  false,
  true,
])('same bounded reads preserve indices and transforms: sparse=%s', (sparse) => {
  const cells = grid(sparse),
    reader = createTileCellReader(cells, bounds)
  expect(reader.at(-2, -1)).toBe(0)
  expect(reader.at(-1, 0)).toBe(3)
  expect(reader.at(1, 1)).toBe(makeCell(255, CELL_FLIP_H | CELL_FLIP_D))
  expect(reader.at(0, 0)).toBe(-1)
  for (const [col, row] of [
    [-3, -1],
    [2, 1],
    [-2, -2],
    [1, 2],
    [-1.5, 0.5],
    [NaN, 0],
    [0, Infinity],
  ])
    expect(reader.at(col!, row!)).toBe(-1)
  expect(reader.allocatedCellBytes).toBe(reader.allocatedCellCount * 2)
  expect(reader.allocatedCellCount).toBe(
    cells instanceof Int16Array ? 12 : cells.chunks.length * 1024,
  )
})

test.each([
  false,
  true,
])('viewport clipping visits only occupied cells inside the map: sparse=%s', (sparse) => {
  const reader = createTileCellReader(grid(sparse), bounds)
  const found: number[][] = []
  reader.visitOccupied({ col: -100, row: -100, cols: 100, rows: 101 }, (cell, col, row) => {
    found.push([cell, col, row])
  })
  expect(found.sort((a, b) => a[2]! - b[2]! || a[1]! - b[1]!)).toEqual([
    [0, -2, -1],
    [3, -1, 0],
  ])
  for (const rect of [
    { col: NaN, row: 0, cols: 1, rows: 1 },
    { col: 0, row: 0, cols: 0, rows: 1 },
    { col: 0.5, row: 0, cols: 1, rows: 1 },
    { col: Number.MAX_SAFE_INTEGER, row: 0, cols: 2, rows: 1 },
  ])
    reader.visitOccupied(rect, () => {
      throw Error('Invalid viewport must not visit')
    })
})

test('large sparse extent counts buffers and visits regions without materializing gaps', () => {
  const area = { col: -5000, row: -5000, cols: 10000, rows: 10000 }
  const empty: PintaRegionCells = { kind: 'regions', version: 1, side: 32, chunks: [] }
  const result = editRegionCells(empty, area, [
    { col: -5000, row: -5000, cell: 1 },
    { col: 4999, row: 4999, cell: 2 },
  ])
  if (!result.ok) throw Error(result.reason)
  const reader = createTileCellReader(result.cells, area),
    found: number[] = []
  reader.visitOccupied({ col: -10000, row: -10000, cols: 20000, rows: 20000 }, (cell) => {
    found.push(cell)
  })
  expect(found).toEqual([1, 2])
  expect(reader.allocatedCellCount).toBe(2048)
  expect(reader.allocatedCellBytes).toBe(4096)
  expect(reader.at(0, 0)).toBe(-1)
})

test('readers hold immutable history snapshots and copy the logical bounds', () => {
  const area = { ...bounds },
    cells = grid(true)
  if (cells instanceof Int16Array) throw Error('Expected sparse grid')
  const before = createTileCellReader(cells, area)
  const result = editRegionCells(cells, area, [{ col: -2, row: -1, cell: 7 }])
  if (!result.ok) throw Error(result.reason)
  const after = createTileCellReader(result.cells, area)
  area.col = 500
  expect(before.at(-2, -1)).toBe(0)
  expect(after.at(-2, -1)).toBe(7)
  expect(before.at(500, -1)).toBe(-1)
})

test('invalid logical extent and inconsistent dense storage fail before a consumer can read', () => {
  expect(() => createTileCellReader(new Int16Array(12), { ...bounds, cols: 0 })).toThrow(RangeError)
  expect(() => createTileCellReader(new Int16Array(11), bounds)).toThrow(RangeError)
})

test('the existing map accessor never aliases fractional coordinates to another cell', () => {
  const map = createTilemapAsset({ name: 'Coordinates', tilesetId: 'tiles', cols: 3, rows: 2 })
  const id = map.layers[0]!.id,
    painted = setCell(map, id, 2, 0, 9)
  expect(cellAt(painted, id, 2, 0)).toBe(9)
  expect(cellAt(painted, id, 0.5, 0.5)).toBe(-1)
  expect(cellAt(painted, 'missing', 2, 0)).toBe(-1)
})
