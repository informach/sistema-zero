import {
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_LIMITS,
  PINTA_REGION_SIDE,
  type PintaRegionBounds,
  type PintaRegionCells,
  parsePintaRegionBounds,
  regionChunkKey,
} from '@sistemazero/core/creations'
import { prepareMapResourceVersions } from '../core/mapResourceVersions'
import {
  effectiveLayer,
  isTileLayer,
  PINTA_MAP_FORMAT_LIMITS,
  PINTA_MAX_SCHEMA,
  type RegionTilemapAsset,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapLayer,
} from '../core/project'
import { EMPTY_CELL, isValidCellForTiles } from './cell'
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
    (map.schema !== undefined &&
      (!Number.isSafeInteger(map.schema) || map.schema < 0 || map.schema > PINTA_MAX_SCHEMA)) ||
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
  const resources = prepareMapResourceVersions(map, sanitizePintaAsset)
  if (!resources) return { ok: false, reason: 'invalid-map' }
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
  return {
    ok: true,
    map: {
      ...map,
      schema: 8,
      origin: { col: 0, row: 0 },
      layers,
      ...(map.resources !== undefined ? { resources } : {}),
    },
  }
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

/** Canvas bounds in world space: clip tile cells, keep objects and their relationships intact. */
export function resizeRegionMap(
  map: RegionTilemapAsset,
  rawBounds: PintaRegionBounds,
): RegionMapResult {
  const bounds = parsePintaRegionBounds(rawBounds),
    old = regionMapBounds(map)
  if (!bounds) return { ok: false, reason: 'invalid-bounds' }
  if (
    bounds.col <= old.col &&
    bounds.row <= old.row &&
    bounds.col + bounds.cols >= old.col + old.cols &&
    bounds.row + bounds.rows >= old.row + old.rows
  )
    return expandRegionMap(map, bounds)
  const tileLayers = map.layers.filter(isTileLayer)
  if (
    map.layers.length > PINTA_REGION_LIMITS.maxLayers ||
    tileLayers.reduce((sum, layer) => sum + layer.cells.chunks.length, 0) >
      PINTA_REGION_LIMITS.maxChunks
  )
    return { ok: false, reason: 'cell-budget' }
  // Document maintenance is bounded by allocated storage (4 MiB), not logical extent.
  for (const layer of tileLayers)
    for (const chunk of layer.cells.chunks)
      if (!(chunk.cells instanceof Int16Array) || chunk.cells.length !== PINTA_REGION_CELL_COUNT)
        return { ok: false, reason: 'invalid-map' }
  let changed = false
  const layers = map.layers.map((layer) => {
    if (!isTileLayer(layer)) return layer
    let touched = false
    const chunks: PintaRegionCells['chunks'] = []
    for (const chunk of layer.cells.chunks) {
      const col = chunk.col * PINTA_REGION_SIDE,
        row = chunk.row * PINTA_REGION_SIDE
      if (
        col + PINTA_REGION_SIDE <= bounds.col ||
        row + PINTA_REGION_SIDE <= bounds.row ||
        col >= bounds.col + bounds.cols ||
        row >= bounds.row + bounds.rows
      ) {
        touched = true
        continue
      }
      if (
        col >= bounds.col &&
        row >= bounds.row &&
        col + PINTA_REGION_SIDE <= bounds.col + bounds.cols &&
        row + PINTA_REGION_SIDE <= bounds.row + bounds.rows
      ) {
        chunks.push(chunk)
        continue
      }
      let cells = chunk.cells,
        occupied = false
      for (let index = 0; index < PINTA_REGION_CELL_COUNT; index++) {
        const x = col + (index % PINTA_REGION_SIDE),
          y = row + Math.floor(index / PINTA_REGION_SIDE)
        const value =
          x < bounds.col ||
          y < bounds.row ||
          x >= bounds.col + bounds.cols ||
          y >= bounds.row + bounds.rows
            ? -1
            : chunk.cells[index]!
        if (value !== chunk.cells[index] && cells === chunk.cells) cells = chunk.cells.slice()
        if (cells !== chunk.cells) cells[index] = value
        if (value >= 0) occupied = true
      }
      if (cells !== chunk.cells || !occupied) touched = true
      if (occupied) chunks.push(cells === chunk.cells ? chunk : { ...chunk, cells })
    }
    if (!touched) return layer
    changed = true
    return { ...layer, cells: { ...layer.cells, chunks } }
  })
  return {
    ok: true,
    map: {
      ...map,
      cols: bounds.cols,
      rows: bounds.rows,
      origin: { col: bounds.col, row: bounds.row },
      layers: changed ? layers : map.layers,
    },
  }
}

/** One history value per gesture; all layers share the same occupied-buffer budget. */
export function editRegionMapCells(
  map: RegionTilemapAsset,
  layerId: string,
  edits: readonly RegionCellEdit[],
  options?: { expand: boolean },
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
  let target = map
  let writes = edits
  if (options?.expand) {
    const current = regionMapBounds(map)
    const finalOutside = new Map<string, RegionCellEdit>()
    const inside: RegionCellEdit[] = []
    for (const edit of edits) {
      if (!Number.isSafeInteger(edit.col) || !Number.isSafeInteger(edit.row))
        return { ok: false, reason: 'invalid-edit' }
      if (
        edit.col >= current.col &&
        edit.row >= current.row &&
        edit.col < current.col + current.cols &&
        edit.row < current.row + current.rows
      )
        inside.push(edit)
      else finalOutside.set(regionChunkKey(edit.col, edit.row), edit)
    }
    let col = current.col
    let row = current.row
    let endCol = current.col + current.cols
    let endRow = current.row + current.rows
    for (const point of finalOutside.values()) {
      if (point.cell === EMPTY_CELL) continue
      col = Math.min(col, point.col)
      row = Math.min(row, point.row)
      endCol = Math.max(endCol, point.col + 1)
      endRow = Math.max(endRow, point.row + 1)
      inside.push(point)
    }
    const grown = expandRegionMap(map, { col, row, cols: endCol - col, rows: endRow - row })
    if (!grown.ok) return grown
    target = grown.map
    writes = inside
  }
  const result = editRegionCells(
    layer.cells,
    regionMapBounds(target),
    writes,
    PINTA_REGION_LIMITS.maxChunks - occupied + layer.cells.chunks.length,
  )
  if (!result.ok) return result
  if (result.cells === layer.cells) return { ok: true, map: target }
  return {
    ok: true,
    map: {
      ...target,
      layers: target.layers.map((item) =>
        item === layer ? { ...layer, cells: result.cells } : item,
      ),
    },
  }
}
