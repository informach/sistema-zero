/** Shared, bounded painting kernels for pointer and keyboard gestures. */
import {
  type AnyTilesetAsset,
  effectiveLayer,
  type TilemapCells,
  type TileTerrain,
} from '../../../core/project'
import { cellFlags } from '../../../tiles/cell'
import {
  type CellPos,
  type CellRect,
  lineCells,
  normalizeCellRect,
  rectCells,
} from '../../../tiles/cellGeometry'
import { collectTileFloodFill } from '../../../tiles/floodFill'
import {
  type AuthorMap,
  isCellPosition,
  type MapCellEditFailure,
  tryEditMapCellBatch,
} from '../../../tiles/mapCellEdits'
import { mapCellBounds } from '../../../tiles/mapCells'
import { REGION_EDIT_LIMIT } from '../../../tiles/regionCells'
import { tryScatterTiles } from '../../../tiles/scatter'
import {
  isValidTileStamp,
  stampBlockRect,
  type TileStamp,
  tryStampCells,
} from '../../../tiles/stamp'
import { collectTerrainRegion, paintTerrain } from '../../../tiles/terrain'
import { createMapLayerCellReader, tileLayerById } from '../../../tiles/tilemapOps'
import type { MapBrushSettings } from '../MapTerrainPanel'

export interface MapBrushContext {
  layerId: string
  erasing: boolean
  selectedTile: number
  stamp: TileStamp | null
  anchor: CellPos | null
  tileset: AnyTilesetAsset | null
  brush: MapBrushSettings
}
export type MapBrushFailure = MapCellEditFailure | 'storage-budget'
export interface MapBrushResult<Map extends AuthorMap> {
  map: Map
  unmatched: boolean
  failure?: MapBrushFailure
}
export type BrushCellsResult =
  | { ok: true; positions: CellPos[] }
  | { ok: false; reason: 'invalid-edit' | 'work-budget' }

/** Per-stroke admission. Anchor-relative keys survive dense growth to the left/top. */
export class BrushStrokeBudget {
  private readonly visited = new Set<string>()

  collect(cells: readonly CellPos[], anchor: CellPos): BrushCellsResult {
    if (cells.length > REGION_EDIT_LIMIT) return { ok: false, reason: 'work-budget' }
    if (!isCellPosition(anchor)) return { ok: false, reason: 'invalid-edit' }
    const pending = new Set<string>(),
      positions: CellPos[] = []
    for (const cell of cells) {
      if (!cell || !isCellPosition(cell)) return { ok: false, reason: 'invalid-edit' }
      const relative = { col: cell.col - anchor.col, row: cell.row - anchor.row }
      if (!isCellPosition(relative)) return { ok: false, reason: 'invalid-edit' }
      const key = `${relative.col},${relative.row}`
      if (this.visited.has(key) || pending.has(key)) continue
      if (this.visited.size + pending.size >= REGION_EDIT_LIMIT)
        return { ok: false, reason: 'work-budget' }
      pending.add(key)
      positions.push(cell)
    }
    for (const key of pending) this.visited.add(key)
    return { ok: true, positions }
  }
}

export function brushTerrain(context: MapBrushContext): TileTerrain | undefined {
  return context.tileset?.terrains?.find((t) => t.id === context.brush.terrainId)
}

/** Admit input and distinct blocks before allocating their cells. */
export function collectTargetBrushCells(
  cells: readonly CellPos[],
  context: MapBrushContext,
): BrushCellsResult {
  if (cells.length > REGION_EDIT_LIMIT) return { ok: false, reason: 'work-budget' }
  if (cells.some((cell) => !cell || !isCellPosition(cell)))
    return { ok: false, reason: 'invalid-edit' }
  const { erasing, stamp, anchor } = context
  const seen = new Set<string>()
  if (erasing || !stamp || !anchor) {
    const positions: CellPos[] = []
    for (const cell of cells) {
      const key = `${cell.col},${cell.row}`
      if (!seen.has(key)) {
        seen.add(key)
        positions.push(cell)
      }
    }
    return { ok: true, positions }
  }
  if (!isCellPosition(anchor) || !isValidTileStamp(stamp))
    return { ok: false, reason: 'invalid-edit' }
  const blocks: CellRect[] = [],
    area = stamp.cols * stamp.rows
  for (const cell of cells) {
    const rect = stampBlockRect(cell, anchor, stamp)
    if (!rect) return { ok: false, reason: 'invalid-edit' }
    const key = `${rect.col},${rect.row}`
    if (seen.has(key)) continue
    if ((blocks.length + 1) * area > REGION_EDIT_LIMIT) return { ok: false, reason: 'work-budget' }
    seen.add(key)
    blocks.push(rect)
  }
  const positions: CellPos[] = []
  for (const rect of blocks)
    for (let row = 0; row < rect.rows; row++)
      for (let col = 0; col < rect.cols; col++)
        positions.push({ col: rect.col + col, row: rect.row + row })
  return { ok: true, positions }
}

/** Compatibility array API; gesture controllers use the detailed collector. */
export function targetBrushCells(cells: readonly CellPos[], context: MapBrushContext): CellPos[] {
  const result = collectTargetBrushCells(cells, context)
  return result.ok ? result.positions : []
}

export function collectShapeBrushCells(
  map: AuthorMap,
  tool: 'line' | 'rect',
  anchor: CellPos,
  target: CellPos,
): BrushCellsResult {
  if (!anchor || !target || !isCellPosition(anchor) || !isCellPosition(target))
    return { ok: false, reason: 'invalid-edit' }
  const bounds = mapCellBounds(map)
  if (tool === 'line') {
    if (
      Math.max(Math.abs(target.col - anchor.col), Math.abs(target.row - anchor.row)) + 1 >
      REGION_EDIT_LIMIT
    )
      return { ok: false, reason: 'work-budget' }
    // Generate the admitted full line, then clip: clamping endpoints changes its phase.
    return {
      ok: true,
      positions: lineCells(anchor, target).filter(
        (cell) =>
          cell.col >= bounds.col &&
          cell.row >= bounds.row &&
          cell.col < bounds.col + bounds.cols &&
          cell.row < bounds.row + bounds.rows,
      ),
    }
  }
  const relative = normalizeCellRect(
    { col: anchor.col - bounds.col, row: anchor.row - bounds.row },
    { col: target.col - bounds.col, row: target.row - bounds.row },
    bounds.cols,
    bounds.rows,
  )
  if (!relative) return { ok: true, positions: [] }
  if (relative.cols * relative.rows > REGION_EDIT_LIMIT) return { ok: false, reason: 'work-budget' }
  return {
    ok: true,
    positions: rectCells({
      ...relative,
      col: relative.col + bounds.col,
      row: relative.row + bounds.row,
    }),
  }
}

export function shapeBrushCells(
  map: AuthorMap,
  tool: 'line' | 'rect',
  anchor: CellPos,
  target: CellPos,
): CellPos[] {
  const result = collectShapeBrushCells(map, tool, anchor, target)
  return result.ok ? result.positions : []
}

export function applyMapBrush<Map extends AuthorMap>(
  map: Map,
  cells: readonly CellPos[],
  context: MapBrushContext,
): MapBrushResult<Map> {
  if (cells.length > REGION_EDIT_LIMIT) return { map, unmatched: false, failure: 'work-budget' }
  if (cells.some((cell) => !cell || !isCellPosition(cell)))
    return { map, unmatched: false, failure: 'invalid-edit' }
  const { layerId, erasing, brush, stamp, anchor, selectedTile } = context,
    layer = tileLayerById<TilemapCells>(map, layerId)
  if (!layer) return { map, unmatched: false, failure: 'invalid-layer' }
  if (effectiveLayer(map, layer).locked) return { map, unmatched: false, failure: 'locked' }
  const terrain = brushTerrain(context)
  if (terrain) {
    const result = paintTerrain(map, layerId, terrain, erasing ? 0 : brush.color, cells, brush.seed)
    return {
      map: result.map,
      unmatched: result.unmatched > 0,
      ...(result.failure ? { failure: result.failure } : {}),
    }
  }
  if (brush.scatter && !erasing)
    return {
      ...tryScatterTiles(
        map,
        layerId,
        cells,
        brush.tiles.length ? brush.tiles : [selectedTile],
        brush.density,
        brush.seed,
        cellFlags(stamp?.tiles[0] ?? selectedTile),
      ),
      unmatched: false,
    }
  if (!erasing && stamp && anchor)
    return {
      ...tryStampCells(map, layerId, cells, stamp, anchor, context.tileset?.tiles.length ?? 0),
      unmatched: false,
    }
  return {
    ...tryEditMapCellBatch(
      map,
      layerId,
      cells.map((cell) => ({ ...cell, cell: erasing ? -1 : selectedTile })),
    ),
    unmatched: false,
  }
}

export function fillWithBrush<Map extends AuthorMap>(
  map: Map,
  at: CellPos,
  context: MapBrushContext,
): MapBrushResult<Map> {
  const layer = tileLayerById<TilemapCells>(map, context.layerId)
  if (!layer) return { map, unmatched: false, failure: 'invalid-layer' }
  if (effectiveLayer(map, layer).locked) return { map, unmatched: false, failure: 'locked' }
  const terrain = brushTerrain(context)
  if (terrain || context.brush.scatter) {
    const result = collectTerrainRegion(map, context.layerId, at, terrain)
    return result.ok
      ? applyMapBrush(map, result.positions, {
          ...context,
          erasing: false,
          anchor: context.anchor ?? at,
        })
      : { map, unmatched: false, failure: result.reason }
  }
  const cell = context.stamp ? (context.stamp.tiles[0] ?? -1) : context.selectedTile,
    reader = createMapLayerCellReader(map, context.layerId)!
  const result = collectTileFloodFill(reader, mapCellBounds(map), at.col, at.row, cell)
  return result.ok
    ? { ...tryEditMapCellBatch(map, context.layerId, result.edits), unmatched: false }
    : { map, unmatched: false, failure: result.reason }
}
