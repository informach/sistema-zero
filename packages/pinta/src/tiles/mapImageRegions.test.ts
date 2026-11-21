import { expect, spyOn, test } from 'bun:test'
import {
  createTilemapAsset,
  createTilesetAsset,
  createVectorTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
} from '../core/project'
import { createTileCellReader, mapCellBounds } from './mapCells'
import { MapImageBudgetError, mapImageSize } from './mapImageBudget'
import { editRegionMapCells, prepareMapRegions } from './regionMap'
import { tilemapPngDataUrl, tilemapThumbnail } from './renderTilemap'
import { vectorTilemapPngDataUrl, vectorTilemapSvg } from './renderVectorTilemap'

function fixture() {
  const art = createVectorTilesetAsset({ name: 'Peças', tileSize: 16 })
  art.tiles = [
    [
      {
        id: 'r',
        type: 'rect',
        x: 0,
        y: 0,
        w: 16,
        h: 16,
        rx: 0,
        fill: '#ff2121',
        stroke: null,
        opacity: 1,
        rotation: 0,
      },
    ],
  ]
  const dense = createTilemapAsset({ name: 'Mapa', tilesetId: art.id, cols: 64, rows: 4 }),
    prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  let map: RegionTilemapAsset = { ...prepared.map, origin: { col: -64, row: -2 } }
  const edited = editRegionMapCells(map, map.layers[0]!.id, [
    { col: -63, row: -1, cell: 0 },
    { col: -31, row: -2, cell: 0 },
  ])
  if (!edited.ok) throw Error(edited.reason)
  map = edited.map
  return { art, map }
}

test('image visitation can request global row-major order across signed chunks', () => {
  const { map } = fixture(),
    grid = map.layers[0]!
  if (!isTileLayer(grid)) throw Error('Camada de peças ausente')
  const reader = createTileCellReader(grid.cells, mapCellBounds(map)),
    points: Array<[number, number]> = []
  reader.visitOccupied(mapCellBounds(map), (_, col, row) => points.push([col, row]), 'row-major')
  expect(points).toEqual([
    [-31, -2],
    [-63, -1],
  ])
  const chunks: Array<[number, number]> = []
  reader.visitOccupied(mapCellBounds(map), (_, col, row) => chunks.push([col, row]))
  expect(chunks).toEqual([
    [-63, -1],
    [-31, -2],
  ])
})

test('a signed region SVG is clipped and expressed relative to its own image bounds', () => {
  const { map, art } = fixture(),
    svg = vectorTilemapSvg(map, art)
  expect(svg).toContain('viewBox="0 0 1024 64"')
  expect(svg).toContain('overflow="hidden"')
  expect(svg).toContain('translate(536 8)')
  expect(svg).toContain('translate(24 24)')
  expect(svg.indexOf('translate(536 8)')).toBeLessThan(svg.indexOf('translate(24 24)'))
  expect(svg.match(/<symbol /g)).toHaveLength(1)
  expect(svg.match(/<use /g)).toHaveLength(2)
})

test('invalid scales and oversized raster requests are refused before any canvas is created', async () => {
  const { map, art } = fixture(),
    world = { ...map, cols: 10000, rows: 10000 },
    pixel = createTilesetAsset({ name: 'Peças pixel', tileSize: 16 }),
    create = spyOn(document, 'createElement')
  try {
    for (const scale of [0, -1, NaN, Infinity])
      expect(await vectorTilemapPngDataUrl(map, art, scale)).toBeNull()
    expect(await vectorTilemapPngDataUrl(world, art)).toBeNull()
    expect(tilemapPngDataUrl({ ...world, tilesetId: pixel.id }, pixel)).toBeNull()
    for (const scale of [0, -1, NaN, Infinity])
      expect(tilemapPngDataUrl({ ...map, tilesetId: pixel.id }, pixel, scale)).toBeNull()
    expect(tilemapThumbnail(map, [], Infinity)).toBeNull()
    expect(create).not.toHaveBeenCalled()
  } finally {
    create.mockRestore()
  }
})

test('a sparse world SVG contains its two occupied cells without flattening logical gaps', () => {
  const { map, art } = fixture(),
    world = { ...map, cols: 10000, rows: 10000 },
    before = structuredClone(world),
    svg = vectorTilemapSvg(world, art)
  expect(svg).toContain('viewBox="0 0 160000 160000"')
  expect(svg.match(/<use /g)).toHaveLength(2)
  expect(svg.length).toBeLessThan(2048)
  expect(world).toEqual(before)
})

test('region SVG refuses absent primary artwork instead of returning an empty success', () => {
  const { map } = fixture()
  expect(() => vectorTilemapSvg(map, [])).toThrow('As peças deste mapa não foram encontradas.')
})

test('region SVG refuses its entire output when the bounded string budget is exceeded', () => {
  const { art } = fixture(),
    dense = createTilemapAsset({ name: 'Cheio', tilesetId: art.id, cols: 256, rows: 256 })
  const layer = dense.layers[0]!
  if (!isTileLayer(layer)) throw Error('Camada de peças ausente')
  layer.cells.fill(0)
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  const before = prepared.map.layers
  expect(() => vectorTilemapSvg(prepared.map, art)).toThrow(MapImageBudgetError)
  expect(prepared.map.layers).toBe(before)
})

test('raster admission enforces side and area budgets separately, with bounded thumbnails', () => {
  expect(mapImageSize({ cols: 512, rows: 128 }, 16, 1)).toEqual({
    width: 8192,
    height: 2048,
    scale: 1,
  })
  expect(mapImageSize({ cols: 512, rows: 129 }, 16, 1)).toBeNull()
  expect(mapImageSize({ cols: 513, rows: 1 }, 16, 1)).toBeNull()
  expect(mapImageSize({ cols: 10000, rows: 10000 }, 16, 1, 512)).toEqual({
    width: 512,
    height: 512,
    scale: 512 / 160000,
  })
})
