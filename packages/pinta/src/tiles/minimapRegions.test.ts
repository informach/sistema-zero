import { expect, test } from 'bun:test'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
  resolveAssetPalette,
  type TilesetAsset,
} from '../core/project'
import { CELL_FLIP_H, makeCell } from './cell'
import * as cells from './mapCells'
import { primaryMapTileset, resolveMapTilesets } from './mapTilesets'
import * as minimap from './minimap'
import { editRegionMapCells, prepareMapRegions } from './regionMap'
import { setCell } from './tilemapOps'

function art(name: string, index: number) {
  const asset = createTilesetAsset({ name, tileSize: 16 })
  asset.tiles[0]!.data.fill(index)
  return asset
}
function region(
  tilesetId: string,
  col = -100,
  row = -100,
  cols = 10000,
  rows = 10000,
): RegionTilemapAsset {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'mundo', tilesetId, cols: 2, rows: 2 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  return { ...prepared.map, origin: { col, row }, cols, rows }
}
function edited(
  map: RegionTilemapAsset,
  layerId: string,
  positions: Array<{ col: number; row: number; cell: number }>,
) {
  const result = editRegionMapCells(map, layerId, positions)
  if (!result.ok) throw Error(result.reason)
  return result.map
}
const color = (asset: TilesetAsset, index: number) => resolveAssetPalette(asset)[index]!

test('a region map never borrows a different primary sheet, while single-sheet legacy compatibility stays intact', () => {
  const other = art('outra', 2),
    dense = createTilemapAsset({ name: 'legado', tilesetId: 'missing', cols: 2, rows: 2 }),
    map = region('missing')
  expect(primaryMapTileset(dense, other)).toBe(other)
  expect(primaryMapTileset(map, other)).toBeNull()
  expect(resolveMapTilesets(map, [other])).toEqual([null])
})

test('a 100-million-cell world produces a bounded overview and counts only allocated storage', () => {
  const ground = art('chao', 1),
    base = region(ground.id),
    map = edited(base, base.layers[0]!.id, [
      { col: -50, row: -40, cell: makeCell(0, CELL_FLIP_H) },
      { col: 9000, row: 9000, cell: 0 },
    ]),
    before = structuredClone(map),
    overview = minimap.tilemapOverview(map, ground)!
  expect(overview.width).toBe(256)
  expect(overview.height).toBe(256)
  expect(overview.colors).toHaveLength(65536)
  expect(overview.colors.filter((c) => c !== null)).toHaveLength(2)
  expect(new Set(overview.colors.filter((c) => c !== null))).toEqual(new Set([color(ground, 1)]))
  expect(cells.mapAllocatedCellCount(map)).toBe(2048)
  expect(map).toEqual(before)
})

test('overview resolves embedded sheets before gallery copies and keeps upper compatible layers', () => {
  const ground = art('chao', 1),
    other = art('casas', 2),
    frozen = { ...ground, id: 'frozen' },
    decoy = { ...art('outra', 3), id: 'frozen' },
    base: RegionTilemapAsset = {
      ...region('frozen', -2, -2, 4, 4),
      resources: [{ sourceId: ground.id, capturedAt: 1, asset: frozen }],
    }
  let map = edited(base, base.layers[0]!.id, [
    { col: -2, row: -2, cell: 0 },
    { col: -1, row: -2, cell: 0 },
  ])
  map = {
    ...map,
    layers: [
      ...map.layers,
      {
        id: 'houses',
        name: 'Casas',
        visible: true,
        tilesetId: other.id,
        cells: { kind: 'regions', version: 1, side: 32, chunks: [] },
      },
    ],
  }
  map = edited(map, 'houses', [{ col: -1, row: -2, cell: 0 }])
  const overview = minimap.tilemapOverview(map, [decoy, other])!
  expect(overview.colors.slice(0, 4)).toEqual([color(ground, 1), color(other, 2), null, null])
  const incompatible = { ...other, tileSize: 32 as const }
  expect(minimap.tilemapOverview(map, [decoy, incompatible])!.colors.slice(0, 2)).toEqual([
    color(ground, 1),
    color(ground, 1),
  ])
})

test('overview ignores hidden, transparent, missing and collision artwork and applies inherited offsets', () => {
  const ground = art('chao', 1),
    other = art('casa', 2),
    blank = createTilesetAsset({ name: 'vazio', tileSize: 16 }),
    base = region(ground.id, -2, -2, 4, 4)
  let map = edited(base, base.layers[0]!.id, [{ col: -2, row: -2, cell: 0 }])
  map = {
    ...map,
    layers: [
      ...map.layers,
      { id: 'group', kind: 'group', name: 'Grupo', visible: true, offsetX: 16 },
      {
        id: 'decor',
        name: 'Decoração',
        visible: true,
        parentId: 'group',
        tilesetId: other.id,
        cells: { kind: 'regions', version: 1, side: 32, chunks: [] },
      },
    ],
  }
  map = edited(map, 'decor', [{ col: -2, row: -2, cell: 0 }])
  expect(minimap.tilemapOverview(map, [ground, other])!.colors.slice(0, 2)).toEqual([
    color(ground, 1),
    color(other, 2),
  ])
  for (const patch of [{ visible: false }, { opacity: 0 }, { collision: true }] as const) {
    const changed: RegionTilemapAsset = {
      ...map,
      layers: map.layers.map((layer) =>
        isTileLayer(layer) && layer.id === 'decor' ? { ...layer, ...patch } : layer,
      ),
    }
    expect(minimap.tilemapOverview(changed, [ground, other])!.colors.slice(0, 2)).toEqual([
      color(ground, 1),
      null,
    ])
  }
  const transparent: RegionTilemapAsset = {
    ...map,
    layers: map.layers.map((layer) =>
      isTileLayer(layer) && layer.id === 'decor'
        ? { ...layer, parentId: undefined, tilesetId: blank.id }
        : layer,
    ),
  }
  expect(minimap.tilemapOverview(transparent, [ground, blank])!.colors[0]).toBe(color(ground, 1))
})

test('pixel collisions use global row-major order even when chunks are rearranged', () => {
  const ground = art('chao', 1),
    other = ground.tiles[0]!,
    second = { ...other, data: new Uint8Array(other.data.length).fill(2) },
    source = { ...ground, tiles: [other, second], solid: [false, false], platform: [false, false] },
    base = region(source.id, -100, -100, 1000, 1000),
    map = edited(base, base.layers[0]!.id, [
      { col: -65, row: -99, cell: 1 },
      { col: -64, row: -100, cell: 0 },
    ]),
    a = minimap.tilemapOverview(map, source, 1)!,
    reversed: RegionTilemapAsset = {
      ...map,
      layers: map.layers.map((layer) =>
        isTileLayer(layer)
          ? { ...layer, cells: { ...layer.cells, chunks: [...layer.cells.chunks].reverse() } }
          : layer,
      ),
    }
  expect(a.colors).toEqual([color(source, 2)])
  expect(minimap.tilemapOverview(reversed, source, 1)).toEqual(a)
})

test('the legacy non-cached color API continues observing source changes made in place', () => {
  const ground = art('chao', 1),
    base = createTilemapAsset({ name: 'legado', tilesetId: ground.id, cols: 1, rows: 1 }),
    map = setCell(base, base.layers[0]!.id, 0, 0, 0)
  expect(minimap.tilemapMinimapColors(map, ground)).toEqual([color(ground, 1)])
  ground.tiles[0]!.data.fill(2)
  expect(minimap.tilemapMinimapColors(map, ground)).toEqual([color(ground, 2)])
})

test('legacy minimap colors keep their existing contract and invalid canvas sizes are refused before mutation', () => {
  const ground = art('chao', 1),
    base = createTilemapAsset({ name: 'legado', tilesetId: ground.id, cols: 4, rows: 3 }),
    map = setCell(base, base.layers[0]!.id, 1, 1, 0)
  expect(minimap.tilemapOverview(map, ground)!.colors).toEqual(
    minimap.tilemapMinimapColors(map, ground),
  )
  for (const size of [0, -1, 1.5, 257, NaN, Infinity])
    expect(minimap.tilemapOverview(region(ground.id), ground, size)).toBeNull()
  const canvas = document.createElement('canvas'),
    before = [canvas.width, canvas.height]
  expect(minimap.paintMinimap(canvas, 10000, 10000, [])).toBe(false)
  expect([canvas.width, canvas.height]).toEqual(before)
})
