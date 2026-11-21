/** Rectangular selection shared by the existing dense workshop and region documents. */
import type { CellPos, CellRect } from './cellGeometry'
import { type AuthorMap, editMapCellBatch, isBoundedCellRect, isCellPosition } from './mapCellEdits'
import type { RegionCellEdit } from './regionCells'
import { emptyTileStamp, isValidTileStamp, type TileStamp } from './stamp'
import { createMapLayerCellReader } from './tilemapOps'

export function hasFilledCell(tilemap: AuthorMap, layerId: string, rect: CellRect): boolean {
  if (!isBoundedCellRect(rect)) return false
  const read = createMapLayerCellReader(tilemap, layerId)
  if (!read) return false
  for (let r = 0; r < rect.rows; r += 1)
    for (let c = 0; c < rect.cols; c += 1) if (read.at(rect.col + c, rect.row + r) >= 0) return true
  return false
}

/** Outside-map cells become holes; invalid/over-budget selections return an empty stamp. */
export function copyRegion(tilemap: AuthorMap, layerId: string, rect: CellRect): TileStamp {
  if (!isBoundedCellRect(rect)) return emptyTileStamp()
  const read = createMapLayerCellReader(tilemap, layerId)
  const tiles = new Int16Array(rect.cols * rect.rows).fill(-1)
  if (read)
    for (let r = 0; r < rect.rows; r += 1)
      for (let c = 0; c < rect.cols; c += 1)
        tiles[r * rect.cols + c] = read.at(rect.col + c, rect.row + r)
  return { cols: rect.cols, rows: rect.rows, tiles }
}

/** One history value, preserving the same asset on an unchanged or refused gesture. */
export function clearRegion<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  rect: CellRect,
): Map {
  if (!isBoundedCellRect(rect)) return tilemap
  const edits: RegionCellEdit[] = []
  for (let r = 0; r < rect.rows; r += 1)
    for (let c = 0; c < rect.cols; c += 1)
      edits.push({ col: rect.col + c, row: rect.row + r, cell: -1 })
  return editMapCellBatch(tilemap, layerId, edits)
}

export function extractRegion<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  rect: CellRect,
): { remaining: Map; floating: TileStamp } {
  const floating = copyRegion(tilemap, layerId, rect)
  return {
    remaining: floating.tiles.length ? clearRegion(tilemap, layerId, rect) : tilemap,
    floating,
  }
}

/** Paste once, preserving holes and clipping at logical bounds without moving the origin. */
export function stampRegionAt<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  at: CellPos,
  stamp: TileStamp,
): Map {
  if (!isCellPosition(at) || !isValidTileStamp(stamp)) return tilemap
  const edits: RegionCellEdit[] = []
  for (let r = 0; r < stamp.rows; r += 1)
    for (let c = 0; c < stamp.cols; c += 1) {
      const cell = stamp.tiles[r * stamp.cols + c]!
      if (cell >= 0) edits.push({ col: at.col + c, row: at.row + r, cell })
    }
  return editMapCellBatch(tilemap, layerId, edits)
}
