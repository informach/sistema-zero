import { expect, test } from 'bun:test'
import { createTilemapAsset, isTileLayer } from '../core/project'
import { CELL_FLAGS_MASK, makeCell } from './cell'
import {
  clearRegion,
  copyRegion,
  extractRegion,
  hasFilledCell,
  stampRegionAt,
} from './mapSelection'
import { expandRegionMap, prepareMapRegions } from './regionMap'
import { blockCells, stampCells, stampFromTileset } from './stamp'
import { cellAt, setCell } from './tilemapOps'

function fixture() {
  const map = createTilemapAsset({ name: 'vila', tilesetId: 'terra', cols: 3, rows: 2 })
  const id = map.layers[0]!.id
  return { map: setCell(setCell(map, id, 0, 0, 1), id, 0, 1, 4), id }
}

test('selection clips logical columns instead of aliasing the following dense row', () => {
  const { map, id } = fixture(),
    rect = { col: 3, row: 0, cols: 1, rows: 1 }
  expect(hasFilledCell(map, id, rect)).toBe(false)
  expect([...copyRegion(map, id, rect).tiles]).toEqual([-1])
  expect(clearRegion(map, id, rect)).toBe(map)
})

test('invalid selection extents are refused without clearing or allocating a partial cut', () => {
  const { map, id } = fixture()
  for (const rect of [
    { col: 0.5, row: 0, cols: 1, rows: 1 },
    { col: 0, row: 0, cols: 65537, rows: 1 },
    { col: 0, row: 0, cols: -1, rows: 1 },
    { col: NaN, row: 0, cols: 1, rows: 1 },
  ]) {
    const cut = extractRegion(map, id, rect)
    expect(cut.remaining).toBe(map)
    expect(cut.floating.tiles.length).toBe(0)
    expect(hasFilledCell(map, id, rect)).toBe(false)
  }
})

test('a heterogeneous paste refuses all cells if one reference is outside the native format', () => {
  const { map, id } = fixture()
  for (const invalid of [256, makeCell(256, CELL_FLAGS_MASK), -2]) {
    const stamp = { cols: 2, rows: 1, tiles: Int16Array.of(2, invalid) }
    expect(stampRegionAt(map, id, { col: 0, row: 0 }, stamp)).toBe(map)
    expect(
      stampCells(
        map,
        id,
        [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
        ],
        stamp,
        { col: 0, row: 0 },
        256,
      ),
    ).toBe(map)
  }
})

test('malformed stamps and fractional anchors do not create a partial gesture', () => {
  const { map, id } = fixture()
  for (const stamp of [
    { cols: 2, rows: 1, tiles: Int16Array.of(2) },
    { cols: 0, rows: 1, tiles: new Int16Array() },
    { cols: 0.5, rows: 2, tiles: Int16Array.of(2) },
  ]) {
    expect(stampRegionAt(map, id, { col: 0, row: 0 }, stamp)).toBe(map)
    expect(blockCells({ col: 0, row: 0 }, { col: 0, row: 0 }, stamp)).toEqual([])
  }
  expect(
    stampRegionAt(map, id, { col: 0.5, row: 0 }, { cols: 1, rows: 1, tiles: Int16Array.of(2) }),
  ).toBe(map)
  expect(stampFromTileset(256, 8, { col: 0, row: 0, cols: 65537, rows: 1 }).tiles.length).toBe(0)
})

test('selection and repeating stamps work at negative origins in a sparse maximum-extent map', () => {
  const { map, id } = fixture(),
    prepared = prepareMapRegions(map)
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -32, row: -32, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  const value = makeCell(255, CELL_FLAGS_MASK),
    source = setCell(expanded.map, id, -32, -32, value)
  const rect = { col: -32, row: -32, cols: 2, rows: 1 }
  expect(hasFilledCell(source, id, rect)).toBe(true)
  const cut = extractRegion(source, id, rect)
  expect([...cut.floating.tiles]).toEqual([value, -1])
  expect(cellAt(cut.remaining, id, -32, -32)).toBe(-1)
  const restored = stampRegionAt(cut.remaining, id, { col: -32, row: -32 }, cut.floating)
  expect(restored).toEqual(source)
  const repeated = stampCells(
    restored,
    id,
    [
      { col: -30, row: -32 },
      { col: -29, row: -32 },
    ],
    cut.floating,
    { col: -32, row: -32 },
    256,
  )
  expect(cellAt(repeated, id, -30, -32)).toBe(value)
  expect(cellAt(repeated, id, -29, -32)).toBe(-1)
  expect(cellAt(source, id, -30, -32)).toBe(-1)
  const layer = repeated.layers[0]
  if (!layer || !isTileLayer(layer)) throw Error('Expected region tile layer')
  expect(layer.cells.chunks.length).toBeLessThan(4)
})

test('locked layers and no-op pastes preserve the original map and snapshots', () => {
  const { map, id } = fixture()
  map.layers[0]!.locked = true
  const stamp = { cols: 1, rows: 1, tiles: Int16Array.of(2) }
  expect(clearRegion(map, id, { col: 0, row: 0, cols: 1, rows: 1 })).toBe(map)
  expect(stampRegionAt(map, id, { col: 0, row: 0 }, stamp)).toBe(map)
  expect(stampCells(map, id, [{ col: 0, row: 0 }], stamp, { col: 0, row: 0 }, 256)).toBe(map)
})

test('picker rectangles clip columns and never alias another tileset row', () => {
  expect([...stampFromTileset(8, 4, { col: 4, row: 0, cols: 1, rows: 1 }).tiles]).toEqual([-1])
  expect([...stampFromTileset(8, 4, { col: -1, row: 1, cols: 2, rows: 1 }).tiles]).toEqual([-1, 4])
})

test('an oversized repeating gesture is refused before applying its valid prefix', () => {
  const { map, id } = fixture()
  expect(
    stampCells(
      map,
      id,
      Array.from({ length: 65537 }, () => ({ col: 0, row: 0 })),
      { cols: 1, rows: 1, tiles: Int16Array.of(2) },
      { col: 0, row: 0 },
      256,
    ),
  ).toBe(map)
})

test('seeded dense and region selection gestures preserve identical cells and earlier snapshots', () => {
  let seed = 20261121
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed
  }
  for (let trial = 0; trial < 32; trial++) {
    let dense = createTilemapAsset({ name: 'bosque', tilesetId: 'terra', cols: 16, rows: 8 })
    const id = dense.layers[0]!.id
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 16; col++)
        if (next() % 3)
          dense = setCell(dense, id, col, row, makeCell(next() % 256, next() & CELL_FLAGS_MASK))
    const prepared = prepareMapRegions(dense)
    if (!prepared.ok) throw Error(prepared.reason)
    const region = prepared.map,
      snapshot = structuredClone(region)
    const rect = {
      col: (next() % 18) - 1,
      row: (next() % 10) - 1,
      cols: 1 + (next() % 8),
      rows: 1 + (next() % 4),
    }
    const a = extractRegion(dense, id, rect),
      b = extractRegion(region, id, rect)
    expect(b.floating).toEqual(a.floating)
    const at = { col: (next() % 18) - 1, row: (next() % 10) - 1 }
    const pastedDense = stampRegionAt(a.remaining, id, at, a.floating)
    const pastedRegion = stampRegionAt(b.remaining, id, at, b.floating)
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 16; col++)
        expect(cellAt(pastedRegion, id, col, row)).toBe(cellAt(pastedDense, id, col, row))
    expect(region).toEqual(snapshot)
  }
})
