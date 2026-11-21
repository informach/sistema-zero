import { expect, test } from 'bun:test'
import { fullMemoryMap, sparseMemoryMap } from '../../scripts/homologacao/memoryRegions'
import { resizeRegionWorld as world } from '../../scripts/homologacao/resizeRegions'
import { mapFeaturesInUse } from '../components/editor/mapTools/mapLevels'
import { snapshotShared } from '../state/editorStore'
import { CELL_FLIP_H, makeCell } from '../tiles/cell'
import { resizeRegionMap } from '../tiles/regionMap'
import { createMapLayerCellReader, growTilemap } from '../tiles/tilemapOps'
import { retainedAssetBytes } from './assetMemory'
import { resizeAsset, resizeCuts, resizeTargetOf } from './assetResize'
import { createHistory } from './history'
import { isTileLayer, type RegionTilemapAsset } from './project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from './regionDocument'

test('growing a regional canvas changes bounds without moving world cells, doors or paths', () => {
  const map = world()
  for (const side of ['left', 'right', 'top', 'bottom'] as const) {
    const grown = growTilemap(map, side, 16)
    expect(grown.layers).toBe(map.layers)
    expect(grown.origin).toEqual({
      col: side === 'left' ? -33 : -32,
      row: side === 'top' ? -33 : -32,
    })
    expect(grown.cols).toBe(side === 'left' || side === 'right' ? 65 : 64)
    expect(grown.rows).toBe(side === 'top' || side === 'bottom' ? 65 : 64)
    expect(decodeRegionMapDocument(encodeRegionMapDocument(grown))).toEqual(grown)
  }
})

test('resizing regional bounds keeps global geometry and clips tile buffers without filling world gaps', () => {
  const map = world()
  expect(resizeTargetOf(map)).toEqual({ width: 64, height: 64, unit: 'cells', min: 1, max: 10000 })
  const large = resizeAsset(map, 10000, 10000, 'top-left')
  if (!large) throw Error('Expansão recusada')
  expect(large.cols).toBe(10000)
  expect(large.layers).toBe(map.layers)
  const centered = resizeAsset(map, 66, 66, 'center')
  if (!centered) throw Error('Expansão recusada')
  expect(centered.origin).toEqual({ col: -33, row: -33 })
  expect(centered.layers).toBe(map.layers)
  const small = resizeAsset(map, 2, 2, 'center', { tileSize: 16 })
  if (!small) throw Error('Recorte recusado')
  expect(small.origin).toEqual({ col: -1, row: -1 })
  expect(createMapLayerCellReader(small, small.layers[0]!.id)!.at(-1, -1)).toBe(
    makeCell(4, CELL_FLIP_H),
  )
  expect(createMapLayerCellReader(small, small.layers[0]!.id)!.at(0, 0)).toBe(2)
  expect(small.layers.at(-1)).toBe(map.layers.at(-1))
  expect(resizeCuts(map, 2, 2)).toBe(true)
  expect(decodeRegionMapDocument(encodeRegionMapDocument(small))).toEqual(small)
  expect(createMapLayerCellReader(map, map.layers[0]!.id)!.at(31, 31)).toBe(7)
})

test('curation discovers transformations in stored regional chunks', () => {
  const used = mapFeaturesInUse(world(), [])
  expect(used.transform).toBe(true)
  expect(used.objectDetails).toBe(true)
})

test('regional resize refuses invalid sizes, global edges and excessive chunks before payload', () => {
  const map = world()
  expect(resizeAsset(map, 64, 64)).toBe(map)
  for (const width of [NaN, Infinity, 0, -1, 1.5, 10001])
    expect(resizeAsset(map, width, 64)).toBeNull()
  expect(resizeRegionMap(map, { col: -10001, row: 0, cols: 2, rows: 2 })).toEqual({
    ok: false,
    reason: 'invalid-bounds',
  })
  const edge = sparseMemoryMap()
  for (const side of ['left', 'right', 'top', 'bottom'] as const)
    expect(growTilemap(edge, side)).toBe(edge)
  const first = map.layers.filter(isTileLayer)[0]!
  const over: RegionTilemapAsset = {
    ...map,
    layers: [
      {
        ...first,
        cells: {
          ...first.cells,
          chunks: Array.from({ length: 2049 }, () => ({
            col: 0,
            row: 0,
            get cells(): never {
              throw Error('Payload touched')
            },
          })),
        },
      },
    ],
  }
  expect(resizeRegionMap(over, { col: 0, row: 0, cols: 1, rows: 1 })).toEqual({
    ok: false,
    reason: 'cell-budget',
  })
})

test('cropping the full 4 MiB map shares interior chunks and clears only the clipped edge cells', () => {
  const map = fullMemoryMap(),
    result = resizeRegionMap(map, { col: 0, row: 0, cols: 255, rows: 255 })
  if (!result.ok) throw Error(result.reason)
  const before = map.layers.filter(isTileLayer),
    after = result.map.layers.filter(isTileLayer)
  expect(after).toHaveLength(32)
  let shared = 0,
    copied = 0
  for (let index = 0; index < after.length; index++) {
    for (let i = 0; i < after[index]!.cells.chunks.length; i++) {
      if (after[index]!.cells.chunks[i] === before[index]!.cells.chunks[i]) shared++
      else copied++
    }
    const last = after[index]!.cells.chunks.at(-1)!.cells
    expect(last[30 * 32 + 30]).toBe(0)
    expect(last[31 * 32 + 30]).toBe(-1)
    expect(last[30 * 32 + 31]).toBe(-1)
    expect(before[index]!.cells.chunks.at(-1)!.cells.at(-1)).toBe(0)
  }
  expect(shared).toBe(1568)
  expect(copied).toBe(480)
  expect(decodeRegionMapDocument(encodeRegionMapDocument(result.map))).toEqual(result.map)
})

test('cropping a sparse world retains already padded chunks unchanged and drops the rest', () => {
  const map = sparseMemoryMap(),
    result = resizeRegionMap(map, { col: -100, row: -100, cols: 1, rows: 1 })
  if (!result.ok) throw Error(result.reason)
  const before = map.layers.filter(isTileLayer)[0]!,
    after = result.map.layers.filter(isTileLayer)[0]!
  expect(after.cells.chunks).toHaveLength(1)
  expect(after.cells.chunks[0]).toBe(before.cells.chunks[0])
  expect(decodeRegionMapDocument(encodeRegionMapDocument(result.map))).toEqual(result.map)
})

test('regional resize uses the existing shared history and restores clipped cells on undo', () => {
  const base = world(),
    cropped = resizeAsset(base, 2, 2)
  if (!cropped) throw Error('Recorte recusado')
  const history = createHistory<RegionTilemapAsset>({
    sizeOf: (map) => retainedAssetBytes(map, false),
    sharedOf: (map) => snapshotShared({ asset: map, linkedMaps: null }),
  })
  history.record(base)
  expect(history.undo(cropped)).toBe(base)
  expect(createMapLayerCellReader(base, base.layers[0]!.id)!.at(31, 31)).toBe(7)
  expect(history.redo(base)).toBe(cropped)
  expect(decodeRegionMapDocument(encodeRegionMapDocument(cropped))).toEqual(cropped)
})
