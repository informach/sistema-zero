import { expect, test } from 'bun:test'
import { createTilemapAsset } from '../core/project'
import { createRegionCellReader, regionCellAt } from './regionCells'
import { editRegionMapCells, expandRegionMap, prepareMapRegions } from './regionMap'
import { cellAt, createMapLayerCellReader, tileLayerById } from './tilemapOps'

test('existing map access reads sparse cells and their logical origin', () => {
  const dense = createTilemapAsset({ name: 'Access', tilesetId: 'tiles', cols: 2, rows: 2 })
  const id = dense.layers[0]!.id
  const converted = prepareMapRegions(dense)
  if (!converted.ok) throw Error(converted.reason)
  const grown = expandRegionMap(converted.map, { col: -40, row: -40, cols: 80, rows: 80 })
  if (!grown.ok) throw Error(grown.reason)
  const edited = editRegionMapCells(grown.map, id, [
    { col: -1, row: -1, cell: 7 },
    { col: 39, row: 39, cell: 2 },
  ])
  if (!edited.ok) throw Error(edited.reason)
  const map = edited.map
  expect(tileLayerById(map, id)?.cells.kind).toBe('regions')
  expect(cellAt(map, id, -1, -1)).toBe(7)
  expect(cellAt(map, id, 39, 39)).toBe(2)
  expect(cellAt(map, id, -41, -1)).toBe(-1)
  expect(cellAt(map, id, -1.5, -1)).toBe(-1)
  const reader = createMapLayerCellReader(map, id)
  expect(reader?.at(-1, -1)).toBe(7)
  expect(createMapLayerCellReader(map, 'missing')).toBeNull()
})

test('point lookup and indexed readers agree even when valid chunks are unordered', () => {
  const source = createTilemapAsset({ name: 'Order', tilesetId: 'tiles', cols: 64, rows: 64 })
  const id = source.layers[0]!.id
  const converted = prepareMapRegions(source)
  if (!converted.ok) throw Error(converted.reason)
  const edited = editRegionMapCells(converted.map, id, [
    { col: 1, row: 1, cell: 1 },
    { col: 40, row: 40, cell: 2 },
  ])
  if (!edited.ok) throw Error(edited.reason)
  const layer = tileLayerById(edited.map, id)
  if (!layer) throw Error('Expected layer')
  const grid = { ...layer.cells, chunks: [...layer.cells.chunks].reverse() },
    indexed = createRegionCellReader(grid)
  for (const [col, row] of [
    [1, 1],
    [40, 40],
    [0, 0],
    [-1, -1],
    [Infinity, 0],
  ])
    expect(regionCellAt(grid, col!, row!)).toBe(indexed.at(col!, row!))
})
