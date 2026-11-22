import { expect, test } from 'bun:test'
import { PINTA_REGION_CELL_COUNT, PINTA_REGION_LIMITS } from '@sistemazero/core/creations'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import { createTilemapAsset, isTileLayer, type RegionTilemapAsset } from '../core/project'
import { CELL_FLIP_H, makeCell } from './cell'
import { REGION_EDIT_LIMIT } from './regionCells'
import {
  editRegionMapCells,
  expandRegionMap,
  fillRegionMapCells,
  prepareMapRegions,
} from './regionMap'
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

test('expandable painting admits a signed world and preserves authoring identities and untouched chunks', () => {
  const ready = prepareMapRegions(vilaEFloresta().map)
  if (!ready.ok) throw Error(ready.reason)
  const source = ready.map
  const layer = source.layers.find(isTileLayer)!
  const corner = { col: -9968, row: -9976, cell: makeCell(12, CELL_FLIP_H) }
  const changed = editRegionMapCells(source, layer.id, [corner], { expand: true })
  if (!changed.ok) throw Error(changed.reason)
  expect(changed.map.id).toBe(source.id)
  expect(changed.map.origin).toEqual({ col: -9968, row: -9976 })
  expect([changed.map.cols, changed.map.rows]).toEqual([10000, 10000])
  expect(cellAt(changed.map, layer.id, corner.col, corner.row)).toBe(corner.cell)
  expect(cellAt(source, layer.id, corner.col, corner.row)).toBe(-1)
  expect(changed.map.layers.at(-1)).toBe(source.layers.at(-1))
  const updated = changed.map.layers.find((entry) => entry.id === layer.id)
  if (!updated || !isTileLayer(updated)) throw Error('Camada expandida ausente')
  expect(updated.cells.chunks).toHaveLength(layer.cells.chunks.length + 1)
  expect(updated.cells.chunks.at(-1)?.cells).toBe(layer.cells.chunks.at(-1)?.cells)
})

test('expansion rolls back bound and chunk failures and ignores erases outside the map', () => {
  const source = expanded()
  const layerId = source.layers[0]!.id
  const options = { expand: true }
  const outside = { col: -41, row: -41, cell: 3 }
  expect(editRegionMapCells(source, layerId, [outside])).toEqual({
    ok: false,
    reason: 'outside-map',
  })
  const cancelled = editRegionMapCells(
    source,
    layerId,
    [outside, { ...outside, cell: -1 }],
    options,
  )
  expect(cancelled).toEqual({ ok: true, map: source })
  if (cancelled.ok) expect(cancelled.map).toBe(source)
  expect(
    editRegionMapCells(
      source,
      layerId,
      [
        { col: 1, row: 1, cell: 3 },
        { ...outside, col: -10000 },
      ],
      options,
    ),
  ).toEqual({ ok: false, reason: 'invalid-bounds' })
  expect(cellAt(source, layerId, 1, 1)).toBe(-1)
  expect(editRegionMapCells(source, layerId, [{ ...outside, col: -41.5 }], options)).toEqual({
    ok: false,
    reason: 'invalid-edit',
  })

  const cells = new Int16Array(PINTA_REGION_CELL_COUNT).fill(-1)
  cells[0] = 0
  const fullLayer = source.layers.find(isTileLayer)!
  const full = {
    ...source,
    origin: { col: 0, row: 0 },
    cols: 2048,
    rows: 1024,
    layers: [
      {
        ...fullLayer,
        cells: {
          ...fullLayer.cells,
          chunks: Array.from({ length: PINTA_REGION_LIMITS.maxChunks }, (_, index) => ({
            col: index % 64,
            row: Math.floor(index / 64),
            cells,
          })),
        },
      },
    ],
  }
  expect(
    editRegionMapCells(
      full,
      layerId,
      [
        { col: 0, row: 0, cell: 4 },
        { col: 2048, row: 0, cell: 12 },
      ],
      options,
    ),
  ).toEqual({ ok: false, reason: 'cell-budget' })
  expect(cellAt(full, layerId, 0, 0)).toBe(0)
  expect(full.cols).toBe(2048)
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
