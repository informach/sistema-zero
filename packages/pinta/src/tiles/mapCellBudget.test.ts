import { expect, test } from 'bun:test'
import { createTilemapAsset } from '../core/project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../core/regionDocument'
import { CELL_FLAGS_MASK, CELL_FLIP_H, isValidCellForTiles, makeCell } from './cell'
import { editRegionMapCells, fillRegionMapCells, prepareMapRegions } from './regionMap'
import { cellAt, floodFillCells, setCell, setCells } from './tilemapOps'

function fixture() {
  const dense = createTilemapAsset({ name: 'vila', tilesetId: 'terra', cols: 3, rows: 2 })
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  return { dense, region: prepared.map, id: dense.layers[0]!.id }
}

test('cell reference limits are independent of the shared flag representation', () => {
  expect(isValidCellForTiles(-1, 0)).toBe(true)
  expect(isValidCellForTiles(0, 0)).toBe(false)
  expect(isValidCellForTiles(makeCell(4095, CELL_FLAGS_MASK), 4096)).toBe(true)
  expect(isValidCellForTiles(makeCell(256, CELL_FLAGS_MASK), 256)).toBe(false)
  for (const count of [-1, 1.5, 4097, NaN, Infinity])
    expect(isValidCellForTiles(-1, count)).toBe(false)
})

test('dense editing cannot create a tile reference the native map reader refuses', () => {
  const { dense, id } = fixture()
  for (const cell of [256, makeCell(256, CELL_FLIP_H), 4095]) {
    expect(setCell(dense, id, 0, 0, cell)).toBe(dense)
    expect(setCells(dense, id, [{ col: 0, row: 0 }], cell)).toBe(dense)
    expect(floodFillCells(dense, id, 0, 0, cell)).toBe(dense)
  }
})

test('region editing refuses out-of-format tile references atomically before changing history', () => {
  const { region, id } = fixture()
  for (const cell of [256, makeCell(256, CELL_FLIP_H), 4095]) {
    expect(setCell(region, id, 0, 0, cell)).toBe(region)
    expect(setCells(region, id, [{ col: 0, row: 0 }], cell)).toBe(region)
    expect(floodFillCells(region, id, 0, 0, cell)).toBe(region)
    expect(fillRegionMapCells(region, id, 0, 0, cell).ok).toBe(false)
    expect(
      editRegionMapCells(region, id, [
        { col: 0, row: 0, cell: 1 },
        { col: 1, row: 0, cell },
      ]).ok,
    ).toBe(false)
    expect(cellAt(region, id, 0, 0)).toBe(-1)
  }
})

test('the last supported tile keeps every transform and survives a native region round trip', () => {
  const { dense, region, id } = fixture()
  const value = makeCell(255, CELL_FLAGS_MASK)
  expect(cellAt(setCell(dense, id, 0, 0, value), id, 0, 0)).toBe(value)
  const painted = setCell(region, id, 0, 0, value)
  const reopened = decodeRegionMapDocument(
    JSON.parse(JSON.stringify(encodeRegionMapDocument(painted))),
  )
  expect(reopened).toEqual(painted)
  expect(cellAt(painted, id, 0, 0)).toBe(value)
  expect(cellAt(region, id, 0, 0)).toBe(-1)
})

test('explicit region conversion refuses an unsavable source instead of preserving an invalid reference', () => {
  const { dense } = fixture()
  dense.layers[0]!.cells![1] = 256
  const before = structuredClone(dense)
  expect(prepareMapRegions(dense).ok).toBe(false)
  expect(dense).toEqual(before)
})
