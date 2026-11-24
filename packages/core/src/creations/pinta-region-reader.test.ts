import { expect, test } from 'bun:test'
import { createRegionCellReader, regionCellAt } from './pinta-region-reader'
import {
  encodePintaRegionLayers,
  type PintaRegionBounds,
  type PintaRegionCells,
  parsePintaRegionLayers,
} from './pinta-regions'

function fixture() {
  const dense = Int16Array.from({ length: 128 * 128 }, (_, index) =>
    index % 5 === 0 ? -1 : (index % 8) * 4096 + (index % 11),
  )
  const grid: PintaRegionCells = { kind: 'regions', version: 1, side: 32, chunks: [] }
  for (let row = -2; row < 2; row++)
    for (let col = -2; col < 2; col++) {
      const cells = new Int16Array(1024)
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++)
          cells[y * 32 + x] = dense[(row * 32 + y + 64) * 128 + col * 32 + x + 64]!
      grid.chunks.push({ row, col, cells })
    }
  return { grid, dense }
}
function reference(dense: Int16Array, rect: PintaRegionBounds) {
  const values: Array<[number, number, number]> = []
  for (let row = Math.max(-64, rect.row); row < Math.min(64, rect.row + rect.rows); row++)
    for (let col = Math.max(-64, rect.col); col < Math.min(64, rect.col + rect.cols); col++) {
      const cell = dense[(row + 64) * 128 + col + 64]!
      if (cell >= 0) values.push([col, row, cell])
    }
  return values
}

test('shared point readers equal an independent dense reference at every signed cell and chunk boundary', () => {
  const { grid, dense } = fixture(),
    reader = createRegionCellReader(grid)
  for (let row = -65; row <= 64; row++)
    for (let col = -65; col <= 64; col++) {
      const expected =
        col >= -64 && row >= -64 && col < 64 && row < 64 ? dense[(row + 64) * 128 + col + 64]! : -1
      expect(regionCellAt(grid, col, row)).toBe(expected)
      expect(reader.at(col, row)).toBe(expected)
    }
})

test('shared visitation preserves complete flags, coverage and global row-major order across region boundaries', () => {
  const { grid, dense } = fixture(),
    reader = createRegionCellReader(grid)
  for (const rect of [
    { col: -3, row: -2, cols: 8, rows: 6 },
    { col: -70, row: -70, cols: 12, rows: 12 },
    { col: 60, row: 60, cols: 12, rows: 12 },
    { col: -5000, row: -5000, cols: 10000, rows: 10000 },
  ]) {
    const expected = reference(dense, rect),
      ordered: Array<[number, number, number]> = [],
      chunked: Array<[number, number, number]> = []
    reader.visitOccupied(
      rect,
      (cell, col, row) => {
        ordered.push([col, row, cell])
      },
      'row-major',
    )
    reader.visitOccupied(rect, (cell, col, row) => {
      chunked.push([col, row, cell])
    })
    expect(ordered).toEqual(expected)
    chunked.sort((a, b) => a[1] - b[1] || a[0] - b[0])
    expect(chunked).toEqual(expected)
  }
})

test('invalid query geometry is empty and an unallocated grid remains empty', () => {
  const { grid } = fixture(),
    reader = createRegionCellReader(grid)
  for (const value of [0.5, NaN, Infinity, -Infinity]) {
    expect(reader.at(value, 0)).toBe(-1)
    expect(regionCellAt(grid, 0, value)).toBe(-1)
  }
  let visited = 0
  for (const rect of [
    { col: 0, row: 0, cols: 0, rows: 1 },
    { col: 0, row: 0, cols: 1, rows: -1 },
    { col: 0.5, row: 0, cols: 1, rows: 1 },
    { col: 0, row: NaN, cols: 1, rows: 1 },
  ])
    reader.visitOccupied(rect, () => {
      visited++
    })
  expect(visited).toBe(0)
  const empty = createRegionCellReader({ kind: 'regions', version: 1, side: 32, chunks: [] })
  expect(empty.at(-1, -1)).toBe(-1)
  empty.visitOccupied({ col: -5000, row: -5000, cols: 10000, rows: 10000 }, () => {
    visited++
  })
  expect(visited).toBe(0)
})

test('separate decoded documents do not share a global reader index or cell buffers', () => {
  const { grid } = fixture(),
    other = structuredClone(grid),
    a = createRegionCellReader(grid)
  other.chunks[0]!.cells[0] = 7 * 4096 + 3
  const b = createRegionCellReader(other)
  expect(a.at(-64, -64)).toBe(-1)
  expect(b.at(-64, -64)).toBe(7 * 4096 + 3)
  expect(other.chunks[0]!.cells.buffer).not.toBe(grid.chunks[0]!.cells.buffer)
})

test('decoded portable chunks use the same shared reader while leaving the large world gaps unallocated', () => {
  const grid: PintaRegionCells = {
      kind: 'regions',
      version: 1,
      side: 32,
      chunks: [-150, 150].map((position) => {
        const cells = new Int16Array(1024).fill(-1)
        cells[0] = 3 * 4096 + 2
        return { col: position, row: position, cells }
      }),
    },
    bounds = { col: -5000, row: -5000, cols: 10000, rows: 10000 },
    wire = encodePintaRegionLayers([grid], bounds)
  if (!wire) throw Error('Missing positive wire')
  const decoded = parsePintaRegionLayers(wire, bounds)?.[0]
  if (!decoded) throw Error('Missing positive memory')
  const reader = createRegionCellReader(decoded),
    values: Array<[number, number, number]> = []
  reader.visitOccupied(
    bounds,
    (cell, col, row) => {
      values.push([col, row, cell])
    },
    'row-major',
  )
  expect(values).toEqual([
    [-4800, -4800, 3 * 4096 + 2],
    [4800, 4800, 3 * 4096 + 2],
  ])
  expect(reader.at(0, 0)).toBe(-1)
  expect(decoded.chunks).toHaveLength(2)
  expect(decoded.chunks.reduce((sum, chunk) => sum + chunk.cells.byteLength, 0)).toBe(4096)
})
