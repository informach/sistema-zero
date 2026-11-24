import { expect, test } from 'bun:test'
import { sparseMemoryMap } from '../../scripts/homologacao/memoryRegions'
import { smallQueryMap as small } from '../../scripts/homologacao/queryRegions'
import { isTileLayer, type RegionTilemapAsset } from '../core/project'
import { flattenMapWindow, MAP_FLATTEN_MAX_CELLS } from './mapFlatten'
import { editRegionMapCells } from './regionMap'
import {
  flattenBackground,
  flattenCellAt,
  flattenFront,
  flattenLayers,
  flattenWithTilesets,
  hasFrontLayer,
  topTileAt,
  usesMapTileset,
} from './tilemapOps'

test('point queries use signed world coordinates and preserve the winning layer and drawable filter', () => {
  const map = small()
  const layers = map.layers.filter(isTileLayer)
  expect(topTileAt(map, -2, -1)).toEqual({ layer: layers[0]!, tile: 1 })
  expect(topTileAt(map, -1, -1)).toEqual({ layer: layers[1]!, tile: 2 })
  expect(flattenCellAt(map, -1, -1, usesMapTileset(map))).toBe(-1)
  expect(flattenCellAt(map, -1, -1, undefined, (id) => id === 'ground')).toBe(-1)
  expect(topTileAt(map, -1.5, -1)).toBeNull()
  expect(topTileAt(map, 0, -1)).toBeNull()
  expect(topTileAt(sparseMemoryMap(), 9899, 9899)?.tile).toBe(1)
})

test('bounded whole-map flattening preserves the signed origin, front split and multiple sheets', () => {
  const map = small()
  expect(Array.from(flattenLayers(map))).toEqual([1, 2])
  expect(Array.from(flattenBackground(map))).toEqual([1, -1])
  expect(Array.from(flattenFront(map))).toEqual([-1, 2])
  const all = flattenWithTilesets(map)
  expect(all.tilesetIds).toEqual(['ground', 'trees'])
  expect(Array.from(all.tiles)).toEqual([1, 2])
  expect(Array.from(all.sources)).toEqual([0, 1])
  expect(Array.from(flattenWithTilesets(map, undefined, (id) => id === 'ground').tiles)).toEqual([
    1, -1,
  ])
})

test('front detection reads stored chunks and respects hidden regional ancestors', () => {
  const map = small()
  expect(hasFrontLayer(map)).toBe(true)
  expect(hasFrontLayer(map, usesMapTileset(map))).toBe(false)
  const hidden: RegionTilemapAsset = {
    ...map,
    layers: [
      map.layers[0]!,
      { kind: 'group', id: 'hidden', name: 'Escondido', visible: false },
      { ...map.layers[1]!, parentId: 'hidden' },
    ],
  }
  expect(hasFrontLayer(hidden)).toBe(false)
})

test('flattening refuses an oversized logical grid before inspecting layer payloads', () => {
  const map = sparseMemoryMap()
  const large: RegionTilemapAsset = {
    ...map,
    cols: 257,
    rows: 256,
    layers: [
      {
        ...map.layers[0]!,
        get cells(): never {
          throw Error('Payload touched')
        },
      },
    ],
  }
  expect(() => flattenLayers(large)).toThrow('budget')
  expect(() => flattenWithTilesets(large)).toThrow('budget')
})

test('window flattening clips signed sparse cells without allocating empty world gaps', () => {
  const map = sparseMemoryMap(),
    before = structuredClone(map)
  const corner = flattenMapWindow(map, { col: -101, row: -101, cols: 3, rows: 3 })
  if (!corner.ok) throw Error(corner.reason)
  expect(corner.grid.bounds).toEqual({ col: -101, row: -101, cols: 3, rows: 3 })
  expect(Array.from(corner.grid.tiles)).toEqual([-1, -1, -1, -1, 0, -1, -1, -1, -1])
  const far = flattenMapWindow(map, { col: 9898, row: 9898, cols: 2, rows: 2 })
  if (!far.ok) throw Error(far.reason)
  expect(Array.from(far.grid.tiles)).toEqual([-1, -1, -1, 1])
  expect(map).toEqual(before)
})

test('window admission uses the existing dense output area and rejects malformed bounds', () => {
  const map = sparseMemoryMap()
  const full = flattenMapWindow(map, { col: -100, row: -100, cols: 256, rows: 256 })
  if (!full.ok) throw Error(full.reason)
  expect(full.grid.tiles.length).toBe(MAP_FLATTEN_MAX_CELLS)
  expect(full.grid.tiles.byteLength + full.grid.sources.byteLength).toBe(196608)
  expect(full.grid.tiles[0]).toBe(0)
  expect(full.grid.tiles.filter((v) => v >= 0).length).toBe(1)
  expect(flattenMapWindow(map, { col: -100, row: -100, cols: 257, rows: 256 })).toEqual({
    ok: false,
    reason: 'cell-budget',
  })
  for (const col of [NaN, Infinity, -10001, 1.5])
    expect(flattenMapWindow(map, { col, row: 0, cols: 1, rows: 1 })).toEqual({
      ok: false,
      reason: 'invalid-window',
    })
})

test('window winners fall through absent artwork and preserve the source sheet', () => {
  const map = small(),
    first = map.layers.filter(isTileLayer)[0]!,
    last = map.layers[1]!
  const edited = editRegionMapCells(map, last.id, [{ col: -2, row: -1, cell: 9 }])
  if (!edited.ok) throw Error(edited.reason)
  const window = { col: -2, row: -1, cols: 2, rows: 1 }
  const output = flattenMapWindow(
    edited.map,
    window,
    undefined,
    (id, tile) => id === 'ground' || tile < 3,
  )
  if (!output.ok) throw Error(output.reason)
  expect(Array.from(output.grid.tiles)).toEqual([1, 2])
  expect(Array.from(output.grid.sources)).toEqual([0, 1])
  expect(topTileAt(edited.map, -2, -1, undefined, (id) => id === 'ground')).toEqual({
    layer: first,
    tile: 1,
  })
})
