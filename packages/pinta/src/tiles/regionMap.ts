import {
  PINTA_REGION_LIMITS,
  PINTA_REGION_SIDE,
  type PintaRegionBounds,
  type PintaRegionCells,
  parsePintaRegionBounds,
} from '@sistemazero/core/creations'
import {
  effectiveLayer,
  isTileLayer,
  PINTA_MAP_FORMAT_LIMITS,
  type RegionTilemapAsset,
  type TilemapAsset,
  type TilemapLayer,
} from '../core/project'
import { isValidCellForTiles } from './cell'
import { collectTileFloodFill } from './floodFill'
import { createTileCellReader } from './mapCells'
import {
  denseToRegionCells,
  editRegionCells,
  REGION_EDIT_LIMIT,
  type RegionCellEdit,
  type RegionEditResult,
} from './regionCells'

type Failure =
  | 'invalid-map'
  | 'invalid-bounds'
  | 'would-crop'
  | 'invalid-layer'
  | 'locked'
  | Exclude<RegionEditResult, { ok: true }>['reason']
export type RegionMapResult = { ok: true; map: RegionTilemapAsset } | { ok: false; reason: Failure }

/** Still excluded from PintaAsset: persistence/export promotion follows complete reader integration. */
export function prepareMapRegions(map: TilemapAsset): RegionMapResult {
  const bounds = parsePintaRegionBounds({ col: 0, row: 0, cols: map.cols, rows: map.rows })
  const tiles = map.layers.filter(isTileLayer)
  if (
    !bounds ||
    !tiles.length ||
    map.cols > PINTA_MAP_FORMAT_LIMITS.maxCols ||
    map.rows > PINTA_MAP_FORMAT_LIMITS.maxRows ||
    map.layers.length > PINTA_REGION_LIMITS.maxLayers
  )
    return { ok: false, reason: 'invalid-map' }
  const cellCount = map.cols * map.rows
  // Admit the complete map before allocating any chunk. Existing dense dimensions
  // bound this upper estimate; actual empty regions will be omitted by the codec.
  const upperChunks =
    Math.ceil(map.cols / PINTA_REGION_SIDE) * Math.ceil(map.rows / PINTA_REGION_SIDE) * tiles.length
  if (
    cellCount * tiles.length > PINTA_MAP_FORMAT_LIMITS.maxCells ||
    upperChunks > PINTA_REGION_LIMITS.maxChunks
  )
    return { ok: false, reason: 'cell-budget' }
  for (const layer of tiles) {
    if (layer.cells.length !== cellCount) return { ok: false, reason: 'invalid-map' }
    for (const cell of layer.cells)
      if (!isValidCellForTiles(cell, PINTA_MAP_FORMAT_LIMITS.maxTiles))
        return { ok: false, reason: 'invalid-map' }
  }
  const layers: TilemapLayer<PintaRegionCells>[] = []
  for (const layer of map.layers) {
    if (!isTileLayer(layer)) {
      layers.push(layer)
      continue
    }
    const cells = denseToRegionCells(layer.cells, bounds)
    if (!cells) return { ok: false, reason: 'invalid-map' }
    layers.push({ ...layer, cells })
  }
  return { ok: true, map: { ...map, schema: 8, origin: { col: 0, row: 0 }, layers } }
}

export function regionMapBounds(map: RegionTilemapAsset): PintaRegionBounds {
  return { col: map.origin.col, row: map.origin.row, cols: map.cols, rows: map.rows }
}

/** Bounded connected fill, committed through the same atomic editing path. */
export function fillRegionMapCells(
  map: RegionTilemapAsset,
  layerId: string,
  col: number,
  row: number,
  cell: number,
): RegionMapResult {
  const layer = map.layers.find((candidate) => candidate.id === layerId)
  if (!layer || !isTileLayer(layer)) return { ok: false, reason: 'invalid-layer' }
  if (effectiveLayer(map, layer).locked) return { ok: false, reason: 'locked' }
  if (!isValidCellForTiles(cell, PINTA_MAP_FORMAT_LIMITS.maxTiles))
    return { ok: false, reason: 'invalid-edit' }
  const bounds = regionMapBounds(map)
  const result = collectTileFloodFill(
    createTileCellReader(layer.cells, bounds),
    bounds,
    col,
    row,
    cell,
  )
  return result.ok ? editRegionMapCells(map, layerId, result.edits) : result
}

/** Expanding never moves cells, offsets, objects, IDs or door destinations. */
export function expandRegionMap(
  map: RegionTilemapAsset,
  rawBounds: PintaRegionBounds,
): RegionMapResult {
  const bounds = parsePintaRegionBounds(rawBounds),
    old = regionMapBounds(map)
  if (!bounds) return { ok: false, reason: 'invalid-bounds' }
  if (
    bounds.col > old.col ||
    bounds.row > old.row ||
    bounds.col + bounds.cols < old.col + old.cols ||
    bounds.row + bounds.rows < old.row + old.rows
  )
    return { ok: false, reason: 'would-crop' }
  if (
    bounds.col === old.col &&
    bounds.row === old.row &&
    bounds.cols === old.cols &&
    bounds.rows === old.rows
  )
    return { ok: true, map }
  return {
    ok: true,
    map: {
      ...map,
      cols: bounds.cols,
      rows: bounds.rows,
      origin: { col: bounds.col, row: bounds.row },
    },
  }
}

/** One history value per gesture; all layers share the same occupied-buffer budget. */
export function editRegionMapCells(
  map: RegionTilemapAsset,
  layerId: string,
  edits: readonly RegionCellEdit[],
): RegionMapResult {
  const layer = map.layers.find((candidate) => candidate.id === layerId)
  if (!layer || !isTileLayer(layer)) return { ok: false, reason: 'invalid-layer' }
  if (effectiveLayer(map, layer).locked) return { ok: false, reason: 'locked' }
  if (edits.length > REGION_EDIT_LIMIT) return { ok: false, reason: 'work-budget' }
  if (
    edits.some((edit) => !edit || !isValidCellForTiles(edit.cell, PINTA_MAP_FORMAT_LIMITS.maxTiles))
  )
    return { ok: false, reason: 'invalid-edit' }
  const occupied = map.layers
    .filter(isTileLayer)
    .reduce((sum, item) => sum + item.cells.chunks.length, 0)
  if (occupied > PINTA_REGION_LIMITS.maxChunks) return { ok: false, reason: 'cell-budget' }
  const result = editRegionCells(
    layer.cells,
    regionMapBounds(map),
    edits,
    PINTA_REGION_LIMITS.maxChunks - occupied + layer.cells.chunks.length,
  )
  if (!result.ok) return result
  if (result.cells === layer.cells) return { ok: true, map }
  return {
    ok: true,
    map: {
      ...map,
      layers: map.layers.map((item) => (item === layer ? { ...layer, cells: result.cells } : item)),
    },
  }
}
