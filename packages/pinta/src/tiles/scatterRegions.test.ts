import { expect, test } from 'bun:test'
import { createTilemapAsset, type RegionTilemapAsset } from '../core/project'
import { CELL_FLIP_H, makeCell } from './cell'
import { REGION_EDIT_LIMIT } from './regionCells'
import { expandRegionMap, prepareMapRegions } from './regionMap'
import { scatterTiles } from './scatter'
import { cellAt, tileLayerById } from './tilemapOps'

function maps() {
  const dense = createTilemapAsset({ name: 'Flores', tilesetId: 'tiles', cols: 5, rows: 5 })
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  return { dense, sparse: prepared.map, id: dense.layers[0]!.id }
}

test('the existing seeded scatter keeps the same cells and flips in dense and region maps', () => {
  const { dense, sparse, id } = maps()
  const positions = Array.from({ length: 25 }, (_, n) => ({ col: n % 5, row: Math.floor(n / 5) }))
  for (const density of [0, 0.3, 0.7, 1])
    for (const seed of [1, 17, 99]) {
      const a = scatterTiles(dense, id, positions, [0, 2, 4], density, seed, CELL_FLIP_H)
      const b = scatterTiles(sparse, id, positions, [0, 2, 4], density, seed, CELL_FLIP_H)
      for (const p of positions)
        expect(cellAt(b, id, p.col, p.row)).toBe(cellAt(a, id, p.col, p.row))
      expect(scatterTiles(b, id, positions, [0, 2, 4], density, seed, CELL_FLIP_H)).toBe(b)
      expect(tileLayerById(sparse, id)?.cells.chunks).toHaveLength(0)
    }
})

test('scatter crosses signed region seams, clips outside cells and preserves the previous snapshot', () => {
  const { sparse, id } = maps(),
    grown = expandRegionMap(sparse, { col: -40, row: -40, cols: 80, rows: 80 })
  if (!grown.ok) throw Error(grown.reason)
  const points = [
    { col: -33, row: -33 },
    { col: -1, row: -1 },
    { col: 0, row: 0 },
    { col: 39, row: 39 },
    { col: 40, row: 40 },
  ]
  const value = makeCell(3, CELL_FLIP_H),
    result = scatterTiles(grown.map, id, points, [3], 1, 9, CELL_FLIP_H)
  for (const p of points.slice(0, 4)) {
    expect(cellAt(result, id, p.col, p.row)).toBe(value)
    expect(cellAt(grown.map, id, p.col, p.row)).toBe(-1)
  }
  expect(cellAt(result, id, 40, 40)).toBe(-1)
  expect(result.origin).toEqual(grown.map.origin)
})

test('scatter refuses invalid input or an excessive gesture as a whole', () => {
  const { dense, sparse, id } = maps()
  for (const map of [dense, sparse]) {
    expect(
      scatterTiles(
        map,
        id,
        [
          { col: 0, row: 0 },
          { col: 0.5, row: 0.5 },
        ],
        [2],
        1,
        9,
      ),
    ).toBe(map)
    for (const tiles of [[2, 4096], [-1], [NaN]])
      expect(scatterTiles(map, id, [{ col: 0, row: 0 }], tiles, 1, 9)).toBe(map)
    expect(scatterTiles(map, id, [{ col: 0, row: 0 }], [2], NaN, 9)).toBe(map)
    expect(
      scatterTiles(
        map,
        id,
        Array.from({ length: REGION_EDIT_LIMIT + 1 }, () => ({ col: 0, row: 0 })),
        [2],
        1,
        9,
      ),
    ).toBe(map)
  }
})

test('scatter honors group locks and the whole map chunk budget', () => {
  const { sparse, id } = maps()
  const locked: RegionTilemapAsset = {
    ...sparse,
    layers: [
      { kind: 'group', id: 'locked', name: 'Trancado', visible: true, locked: true },
      ...sparse.layers.map((l) => ({ ...l, parentId: 'locked' })),
    ],
  }
  expect(scatterTiles(locked, id, [{ col: 0, row: 0 }], [2], 1, 9)).toBe(locked)
  const layer = tileLayerById(sparse, id)!
  const chunks = Array.from({ length: 2048 }, (_, n) => {
    const cells = new Int16Array(1024).fill(-1)
    cells[0] = 1
    return { col: n % 64, row: Math.floor(n / 64), cells }
  })
  const full: RegionTilemapAsset = {
    ...sparse,
    origin: { col: -32, row: -32 },
    cols: 2100,
    rows: 1100,
    layers: [{ ...layer, cells: { ...layer.cells, chunks } }],
  }
  expect(
    scatterTiles(
      full,
      id,
      [
        { col: 0, row: 0 },
        { col: -1, row: -1 },
      ],
      [2],
      1,
      9,
    ),
  ).toBe(full)
  expect(cellAt(full, id, 0, 0)).toBe(1)
})

test('repeated piece choices retain their previous weighting without using a tileset size as a list limit', () => {
  const { dense, sparse, id } = maps(),
    choices = Array<number>(300).fill(3)
  for (const source of [dense, sparse]) {
    const result = scatterTiles(source, id, [{ col: 1, row: 1 }], choices, 1, 42)
    expect(cellAt(result, id, 1, 1)).toBe(3)
    expect(cellAt(source, id, 1, 1)).toBe(-1)
  }
})
