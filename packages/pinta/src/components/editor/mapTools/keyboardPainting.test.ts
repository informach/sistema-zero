import { expect, it } from 'bun:test'
import { createTilemapAsset, createTilesetAsset, isTileLayer } from '../../../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from '../../../tiles/cell'
import { updateMapLayer } from '../../../tiles/layerTree'
import { singleTileStamp } from '../../../tiles/stamp'
import { setCell } from '../../../tiles/tilemapOps'
import { DEFAULT_MAP_BRUSH } from '../MapTerrainPanel'
import { keyboardCellBounds, keyboardPaintCandidate } from './keyboardPainting'
import type { MapBrushContext } from './mapBrush'

function fixture() {
  const tileset = createTilesetAsset({ name: 'peças', tileSize: 16 })
  const map = createTilemapAsset({ name: 'teclado', tilesetId: tileset.id, cols: 4, rows: 4 })
  const context: MapBrushContext = {
    layerId: map.layers[0]!.id,
    erasing: false,
    selectedTile: 0,
    stamp: null,
    anchor: null,
    tileset,
    brush: DEFAULT_MAP_BRUSH,
  }
  return { map, context }
}

it('scatter shares the selected stamp transform across pencil, shapes and bucket', () => {
  const { map, context } = fixture()
  for (const flags of [
    0,
    CELL_FLIP_H,
    CELL_FLIP_V,
    CELL_FLIP_D,
    CELL_FLIP_H | CELL_FLIP_V,
    CELL_FLIP_H | CELL_FLIP_D,
    CELL_FLIP_V | CELL_FLIP_D,
    CELL_FLIP_H | CELL_FLIP_V | CELL_FLIP_D,
  ]) {
    const value = makeCell(0, flags)
    for (const tool of ['pencil', 'line', 'rect', 'fill'] as const) {
      const result = keyboardPaintCandidate(
        map,
        tool,
        { col: 2, row: 2 },
        { col: 0, row: 0 },
        {
          ...context,
          stamp: singleTileStamp(value),
          brush: { ...DEFAULT_MAP_BRUSH, scatter: true, density: 1, tiles: [0] },
        },
      )!
      const cells = result.map.layers.find(isTileLayer)!.cells.filter((cell) => cell >= 0)
      expect(cells.length).toBeGreaterThan(0)
      expect(cells.every((cell) => cell === value)).toBe(true)
    }
  }
  expect(map.layers.find(isTileLayer)!.cells.every((cell) => cell === -1)).toBe(true)
})
it('pencil and eraser edit only the chosen cell without mutating the input', () => {
  const { map, context } = fixture()
  const painted = keyboardPaintCandidate(map, 'pencil', { col: 1, row: 2 }, null, context)!.map
  expect(painted.layers.find(isTileLayer)!.cells[9]).toBe(0)
  expect(map.layers.find(isTileLayer)!.cells.every((v) => v === -1)).toBe(true)
  const erased = keyboardPaintCandidate(painted, 'eraser', { col: 1, row: 2 }, null, context)!.map
  expect(erased.layers.find(isTileLayer)!.cells.every((v) => v === -1)).toBe(true)
})
it('line and rectangle wait for an anchor and share the existing shape operations', () => {
  const { map, context } = fixture()
  expect(keyboardPaintCandidate(map, 'line', { col: 2, row: 2 }, null, context)).toBeNull()
  for (const [tool, expected] of [
    ['line', 3],
    ['rect', 9],
  ] as const) {
    const result = keyboardPaintCandidate(
      map,
      tool,
      { col: 2, row: 2 },
      { col: 0, row: 0 },
      context,
    )!
    expect(result.map.layers.find(isTileLayer)!.cells.filter((v) => v >= 0)).toHaveLength(expected)
  }
})
it('fill preserves stamp transforms and locked layers remain unchanged', () => {
  const { map, context } = fixture()
  const flipped = makeCell(0, CELL_FLIP_H)
  const result = keyboardPaintCandidate(map, 'fill', { col: 1, row: 1 }, null, {
    ...context,
    stamp: singleTileStamp(flipped),
  })!
  expect(result.map.layers.find(isTileLayer)!.cells.every((v) => v === flipped)).toBe(true)
  const locked = updateMapLayer(map, context.layerId, { locked: true })
  expect(keyboardPaintCandidate(locked, 'pencil', { col: 1, row: 1 }, null, context)!.map).toBe(
    locked,
  )
})
it('an unchanged cell and tools that do not paint do not invent an edit', () => {
  const { map, context } = fixture()
  const painted = setCell(map, context.layerId, 1, 1, 0)
  expect(keyboardPaintCandidate(painted, 'pencil', { col: 1, row: 1 }, null, context)!.map).toBe(
    painted,
  )
  expect(keyboardPaintCandidate(map, 'object-point', { col: 1, row: 1 }, null, context)).toBeNull()
})
it('the cursor measures the visible footprint of a partially clipped edge cell', () => {
  const { map, context } = fixture()
  const shifted = updateMapLayer(map, context.layerId, { offsetX: 6.5, offsetY: 8.5 })
  expect(keyboardCellBounds(shifted, context.layerId, { col: 3, row: 3 }, 16)).toEqual({
    x: 54.5,
    y: 56.5,
    width: 9.5,
    height: 7.5,
  })
  const outside = updateMapLayer(map, context.layerId, { offsetX: 1000 })
  expect(keyboardCellBounds(outside, context.layerId, { col: 0, row: 0 }, 16)).toBeNull()
})
