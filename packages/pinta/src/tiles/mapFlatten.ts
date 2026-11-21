import { type PintaRegionBounds, parsePintaRegionBounds } from '@sistemazero/core/creations'
import {
  isLayerShown,
  isTileLayer,
  type TilemapAsset,
  type TilemapCells,
  tileLayerTilesetId,
  tilemapTilesetIds,
} from '../core/project'
import { cellTile } from './cell'
import { createTileCellReader, mapCellBounds } from './mapCells'
import type { DrawableTile, TileLayerFilter } from './tilemapOps'

/** Previous dense map's area. Do not increase when the authoring extent grows. */
export const MAP_FLATTEN_MAX_CELLS = 65_536
export interface FlattenedMapWindow {
  bounds: PintaRegionBounds
  tilesetIds: string[]
  tiles: Int16Array
  sources: Uint8Array
}
export type MapFlattenResult =
  | { ok: true; grid: FlattenedMapWindow }
  | { ok: false; reason: 'invalid-window' | 'cell-budget' }

/** A disposable tile grid, never an authored document or a substitute for its layers/objects. */
export function flattenMapWindow<Cells extends TilemapCells>(
  map: TilemapAsset<Cells>,
  window: PintaRegionBounds,
  include?: TileLayerFilter<Cells>,
  drawable?: DrawableTile,
): MapFlattenResult {
  const bounds = parsePintaRegionBounds(window)
  if (!bounds) return { ok: false, reason: 'invalid-window' }
  const count = bounds.cols * bounds.rows
  if (count > MAP_FLATTEN_MAX_CELLS) return { ok: false, reason: 'cell-budget' }
  const tilesetIds = tilemapTilesetIds(map),
    tiles = new Int16Array(count).fill(-1),
    sources = new Uint8Array(count)
  for (const layer of map.layers) {
    if (!isTileLayer(layer) || !isLayerShown(map, layer) || (include && !include(layer))) continue
    if (!(layer.cells instanceof Int16Array) && !('origin' in map))
      throw new RangeError('Region map requires its logical origin')
    const tilesetId = tileLayerTilesetId(map, layer),
      source = tilesetIds.indexOf(tilesetId)
    createTileCellReader(layer.cells, mapCellBounds(map)).visitOccupied(
      bounds,
      (cell, col, row) => {
        const tile = cellTile(cell)
        if (tile < 0 || (drawable && !drawable(tilesetId, tile))) return
        const index = (row - bounds.row) * bounds.cols + col - bounds.col
        tiles[index] = tile
        sources[index] = source
      },
    )
  }
  return { ok: true, grid: { bounds, tilesetIds, tiles, sources } }
}

/** Explicit refusal before allocating a world-sized grid through a legacy-shaped API. */
export function flattenWholeRegionMap<Cells extends TilemapCells>(
  map: TilemapAsset<Cells>,
  include?: TileLayerFilter<Cells>,
  drawable?: DrawableTile,
): FlattenedMapWindow {
  const result = flattenMapWindow(map, mapCellBounds(map), include, drawable)
  if (!result.ok)
    throw new RangeError(
      `Tilemap flatten ${result.reason === 'cell-budget' ? 'budget exceeded' : 'window invalid'}`,
    )
  return result.grid
}
