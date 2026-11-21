import { expect, test } from 'bun:test'
import { createTilemapAsset, type RegionTilemapAsset, type TileTerrain } from '../core/project'
import { CELL_FLIP_H, makeCell } from './cell'
import { REGION_EDIT_LIMIT } from './regionCells'
import { expandRegionMap, prepareMapRegions } from './regionMap'
import { collectTerrainRegion, paintTerrain, terrainRegion } from './terrain'
import { cellAt, setCell, tileLayerById } from './tilemapOps'

function terrain(mode: TileTerrain['mode'] = 'edge'): TileTerrain {
  const active =
    mode === 'corner' ? [1, 3, 5, 7] : mode === 'edge' ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7]
  const tiles: Record<string, number[]> = {}
  for (let bits = 1; bits < 1 << active.length; bits++) {
    const pattern = Array<number>(8).fill(0)
    active.forEach((slot, bit) => {
      pattern[slot] = bits & (1 << bit) ? 1 : 0
    })
    tiles[String(bits)] = pattern
  }
  return { id: 'grass', name: 'Grama', mode, colors: ['#00ff00'], tiles }
}
function regions() {
  const dense = createTilemapAsset({ name: 'Terrenos', tilesetId: 'tiles', cols: 5, rows: 5 })
  const result = prepareMapRegions(dense)
  if (!result.ok) throw Error(result.reason)
  return { dense, map: result.map, id: dense.layers[0]!.id }
}
function expanded(cols = 80, rows = 80) {
  const { map, id } = regions()
  const result = expandRegionMap(map, { col: -40, row: -40, cols, rows })
  if (!result.ok) throw Error(result.reason)
  return { map: result.map, id }
}

for (const mode of ['edge', 'corner', 'mixed'] as const)
  test(`the existing ${mode} painter gives identical dense and region results, including variants and erasure`, () => {
    const { dense, map, id } = regions(),
      rule = terrain(mode)
    rule.tiles['0'] = [...rule.tiles[String((1 << (mode === 'mixed' ? 8 : 4)) - 1)]!]
    for (const seed of [1, 9, 32]) {
      const points = [
        { col: 1, row: 1 },
        { col: 2, row: 2 },
        { col: 3, row: 2 },
      ]
      const a = paintTerrain(dense, id, rule, 1, points, seed)
      const b = paintTerrain(map, id, rule, 1, points, seed)
      expect(a.unmatched).toBe(0)
      expect(b.unmatched).toBe(0)
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 5; col++)
          expect(cellAt(b.map, id, col, row)).toBe(cellAt(a.map, id, col, row))
      const erasedA = paintTerrain(a.map, id, rule, 0, [points[1]!], seed)
      const erasedB = paintTerrain(b.map, id, rule, 0, [points[1]!], seed)
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 5; col++)
          expect(cellAt(erasedB.map, id, col, row)).toBe(cellAt(erasedA.map, id, col, row))
      expect(cellAt(map, id, 2, 2)).toBe(-1)
    }
  })

test('a terrain gesture crosses negative chunk seams, preserves foreign art and keeps the undo snapshot', () => {
  const { map, id } = expanded(),
    rule = terrain('corner')
  const source = setCell(map, id, -2, -2, makeCell(0, CELL_FLIP_H))
  const result = paintTerrain(
    source,
    id,
    rule,
    1,
    [
      { col: -1, row: -1 },
      { col: 0, row: 0 },
    ],
    17,
  )
  expect(result.unmatched).toBe(0)
  expect(cellAt(result.map, id, -1, -1)).toBeGreaterThanOrEqual(0)
  expect(cellAt(result.map, id, 0, 0)).toBeGreaterThanOrEqual(0)
  expect(cellAt(result.map, id, -2, -2)).toBe(makeCell(0, CELL_FLIP_H))
  expect(cellAt(source, id, -1, -1)).toBe(-1)
  expect(cellAt(source, id, 0, 0)).toBe(-1)
  expect(result.map.origin).toEqual(source.origin)
  expect(
    paintTerrain(
      result.map,
      id,
      rule,
      1,
      [
        { col: -1, row: -1 },
        { col: 0, row: 0 },
      ],
      17,
    ).map,
  ).toBe(result.map)
})

test('the terrain bucket crosses a negative seam without crossing a foreign wall', () => {
  let { map, id } = expanded()
  for (let row = -40; row < 40; row++) map = setCell(map, id, 0, row, 0)
  const found = terrainRegion(map, id, { col: -1, row: -1 }, terrain())
  expect(found).toHaveLength(40 * 80)
  expect(found.every((p) => p.col < 0)).toBe(true)
  expect(terrainRegion(map, id, { col: -40.5, row: 0 })).toEqual([])
  expect(terrainRegion(map, id, { col: -41, row: 0 })).toEqual([])
})

test('missing terrain transitions refuse the entire sparse gesture', () => {
  const { map, id } = expanded(),
    rule = terrain()
  delete rule.tiles['8']
  const result = paintTerrain(map, id, rule, 1, [{ col: -1, row: -1 }])
  expect(result.unmatched).toBeGreaterThan(0)
  expect(result.map).toBe(map)
})

test('terrain gestures and buckets refuse excess work without materializing an empty world', () => {
  const { map, id } = expanded(10000, 10000)
  expect(collectTerrainRegion(map, id, { col: 0, row: 0 })).toEqual({
    ok: false,
    reason: 'work-budget',
  })
  expect(terrainRegion(map, id, { col: 0, row: 0 })).toEqual([])
  expect(
    paintTerrain(
      map,
      id,
      terrain(),
      1,
      Array.from({ length: REGION_EDIT_LIMIT + 1 }, () => ({ col: 0, row: 0 })),
    ).map,
  ).toBe(map)
  const spread = Array.from({ length: REGION_EDIT_LIMIT }, (_, n) => ({
    col: (n % 200) * 3,
    row: Math.floor(n / 200) * 3,
  }))
  expect(paintTerrain(map, id, terrain(), 1, spread).map).toBe(map)
  expect(paintTerrain(map, id, terrain(), 1, [{ col: 0.5, row: 0.5 }]).map).toBe(map)
  expect(tileLayerById(map, id)?.cells.chunks).toHaveLength(0)
  expect(paintTerrain(map, id, terrain(), 1, spread).failure).toBe('work-budget')
  expect(paintTerrain(map, id, terrain(), 1, [{ col: 0.5, row: 0.5 }]).failure).toBe('invalid-edit')
})

test('an inherited lock and the global occupied chunk budget both refuse terrain atomically', () => {
  const { map, id } = regions(),
    rule = terrain()
  const locked: RegionTilemapAsset = {
    ...map,
    layers: [
      { kind: 'group', id: 'lock', name: 'Trancado', visible: true, locked: true },
      ...map.layers.map((l) => ({ ...l, parentId: 'lock' })),
    ],
  }
  expect(paintTerrain(locked, id, rule, 1, [{ col: 0, row: 0 }]).map).toBe(locked)
  const layer = tileLayerById(map, id)!
  const chunks = Array.from({ length: 2048 }, (_, n) => {
    const cells = new Int16Array(1024).fill(-1)
    cells[0] = 1
    return { col: n % 64, row: Math.floor(n / 64), cells }
  })
  const full: RegionTilemapAsset = {
    ...map,
    cols: 2100,
    rows: 1100,
    origin: { col: -32, row: -32 },
    layers: [{ ...layer, cells: { ...layer.cells, chunks } }],
  }
  expect(paintTerrain(full, id, rule, 1, [{ col: -1, row: -1 }]).map).toBe(full)
  expect(paintTerrain(full, id, rule, 1, [{ col: -1, row: -1 }]).failure).toBe('storage-budget')
  expect(cellAt(full, id, -1, -1)).toBe(-1)
})

test('the complete previous maximum dense map remains paintable in one terrain gesture', () => {
  const source = createTilemapAsset({ name: 'Grande', tilesetId: 'tiles', cols: 256, rows: 256 })
  const id = source.layers[0]!.id,
    points = terrainRegion(source, id, { col: 0, row: 0 })
  expect(points).toHaveLength(REGION_EDIT_LIMIT)
  const result = paintTerrain(source, id, terrain(), 1, points)
  expect(result.failure).toBeUndefined()
  expect(result.unmatched).toBe(0)
  expect(tileLayerById(result.map, id)?.cells.every((cell) => cell === 15)).toBe(true)
  expect(tileLayerById(source, id)?.cells.every((cell) => cell === -1)).toBe(true)
})
