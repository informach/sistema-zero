import { expect, test } from 'bun:test'
import {
  createTilemapAsset,
  createTilesetAsset,
  type RegionTilemapAsset,
} from '../../../core/project'
import { prepareMapRegions } from '../../../tiles/regionMap'
import { cellAt } from '../../../tiles/tilemapOps'
import { DEFAULT_MAP_BRUSH } from '../MapTerrainPanel'
import * as brush from './mapBrush'

function fixture() {
  const art = createTilesetAsset({ name: 'Peças', tileSize: 16 }),
    prepared = prepareMapRegions(
      createTilemapAsset({ name: 'Mapa', tilesetId: art.id, cols: 4, rows: 3 }),
    )
  if (!prepared.ok) throw Error(prepared.reason)
  const map: RegionTilemapAsset = { ...prepared.map, origin: { col: -10, row: -20 } },
    context: brush.MapBrushContext = {
      layerId: map.layers[0]!.id,
      erasing: false,
      selectedTile: 0,
      stamp: null,
      anchor: null,
      tileset: art,
      brush: DEFAULT_MAP_BRUSH,
    }
  return { map, context }
}

test('rectangle collection and the existing brush API preserve signed map coordinates', () => {
  const { map } = fixture()
  expect(brush.shapeBrushCells(map, 'rect', { col: -10, row: -20 }, { col: -8, row: -19 })).toEqual(
    [
      { col: -10, row: -20 },
      { col: -9, row: -20 },
      { col: -8, row: -20 },
      { col: -10, row: -19 },
      { col: -9, row: -19 },
      { col: -8, row: -19 },
    ],
  )
})

test('shape admission refuses oversized rectangles and lines before generating their points', () => {
  const { map } = fixture(),
    world = { ...map, cols: 10000, rows: 10000 }
  expect(
    brush.collectShapeBrushCells(world, 'rect', world.origin, { col: 9989, row: 9979 }),
  ).toEqual({ ok: false, reason: 'work-budget' })
  expect(
    brush.collectShapeBrushCells(map, 'line', { col: -10, row: -20 }, { col: 70000, row: -20 }),
  ).toEqual({ ok: false, reason: 'work-budget' })
})

test('stamp expansion visits each block once instead of multiplying a repeated trajectory', () => {
  const { context } = fixture(),
    stamp = { cols: 16, rows: 16, tiles: new Int16Array(256).fill(0) },
    result = brush.targetBrushCells(
      Array.from({ length: 257 }, () => ({ col: 1, row: 1 })),
      { ...context, stamp, anchor: { col: 0, row: 0 } },
    )
  expect(result).toHaveLength(256)
  expect(new Set(result.map((point) => `${point.col},${point.row}`)).size).toBe(256)
})

test('a collector refuses excessive input from length alone, without accessing its entries', () => {
  const { context } = fixture(),
    points = new Proxy(Array<{ col: number; row: number }>(65537), {
      get(target, key) {
        if (key !== 'length') throw Error('Positions were accessed before admission')
        return target.length
      },
    })
  expect(brush.collectTargetBrushCells(points, context)).toEqual({
    ok: false,
    reason: 'work-budget',
  })
})

test('plain painting works in negative cells and a refused bucket is distinguishable from an empty gesture', () => {
  const { map, context } = fixture(),
    painted = brush.applyMapBrush(map, [map.origin], context)
  expect(cellAt(painted.map, context.layerId, -10, -20)).toBe(0)
  expect(brush.applyMapBrush(painted.map, [map.origin], context).map).toBe(painted.map)
  const world = { ...map, cols: 10000, rows: 10000 },
    result = brush.fillWithBrush(world, world.origin, context)
  expect(result.map).toBe(world)
  expect(result.failure).toBe('work-budget')
})

test('the stroke budget admits distinct destinations atomically and does not charge revisits', () => {
  const budget = new brush.BrushStrokeBudget(),
    anchor = { col: 0, row: 0 },
    first = Array.from({ length: 65536 }, (_, at) => ({ col: at % 256, row: Math.floor(at / 256) }))
  const result = budget.collect(first, anchor)
  expect(result.ok && result.positions.length).toBe(65536)
  expect(budget.collect(first, anchor)).toEqual({ ok: true, positions: [] })
  expect(budget.collect([{ col: 256, row: 0 }], anchor)).toEqual({
    ok: false,
    reason: 'work-budget',
  })
  expect(budget.collect([anchor], anchor)).toEqual({ ok: true, positions: [] })
})

test('stroke destinations follow dense left/top growth without being charged twice', () => {
  const budget = new brush.BrushStrokeBudget()
  expect(budget.collect([{ col: 2, row: 3 }], { col: 1, row: 1 })).toEqual({
    ok: true,
    positions: [{ col: 2, row: 3 }],
  })
  expect(budget.collect([{ col: 3, row: 4 }], { col: 2, row: 2 })).toEqual({
    ok: true,
    positions: [],
  })
})

test('a full region storage budget is reported without applying the first part of the brush', () => {
  const { map, context } = fixture(),
    layer = map.layers[0]!
  if (!('cells' in layer) || !layer.cells) throw Error('Camada de peças ausente')
  const full: RegionTilemapAsset = {
    ...map,
    cols: 10000,
    rows: 10000,
    layers: [
      {
        ...layer,
        cells: {
          kind: 'regions',
          version: 1,
          side: 32,
          chunks: Array.from({ length: 2048 }, (_, at) => {
            const cells = new Int16Array(1024).fill(-1)
            cells[0] = 0
            return { col: at % 100, row: Math.floor(at / 100), cells }
          }),
        },
      },
    ],
  }
  const result = brush.applyMapBrush(
    full,
    [
      { col: 0, row: 0 },
      { col: 9000, row: 9000 },
    ],
    context,
  )
  expect(result.map).toBe(full)
  expect(result.failure).toBe('cell-budget')
})
