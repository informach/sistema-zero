import {
  PINTA_MAP_FORMAT_LIMITS,
  type RegionTilemapAsset,
  type TilemapAsset,
} from '../core/project'
import { isValidCellForTiles } from './cell'
import type { CellPos, CellRect } from './cellGeometry'
import { REGION_EDIT_LIMIT, type RegionCellEdit } from './regionCells'
import { editRegionMapCells } from './regionMap'
import { withTileLayer } from './tilemapOps'

export type AuthorMap = TilemapAsset | RegionTilemapAsset

export function isCellPosition(pos: CellPos): boolean {
  return Number.isSafeInteger(pos.col) && Number.isSafeInteger(pos.row)
}

/** Selections/stamps never allocate or inspect more than one previous maximum map area. */
export function isBoundedCellRect(rect: CellRect): boolean {
  return (
    isCellPosition(rect) &&
    Number.isSafeInteger(rect.cols) &&
    Number.isSafeInteger(rect.rows) &&
    rect.cols > 0 &&
    rect.rows > 0 &&
    rect.cols * rect.rows <= REGION_EDIT_LIMIT &&
    Number.isSafeInteger(rect.col + rect.cols) &&
    Number.isSafeInteger(rect.row + rect.rows)
  )
}

/** Heterogeneous gesture: validate everything, clip coordinates, then clone once. */
export function editMapCellBatch<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  edits: readonly RegionCellEdit[],
): Map {
  if (
    edits.length > REGION_EDIT_LIMIT ||
    edits.some(
      (edit) =>
        !isCellPosition(edit) || !isValidCellForTiles(edit.cell, PINTA_MAP_FORMAT_LIMITS.maxTiles),
    )
  )
    return map
  const origin = 'origin' in map ? map.origin : { col: 0, row: 0 }
  const clipped = edits.filter(
    ({ col, row }) =>
      col >= origin.col &&
      row >= origin.row &&
      col < origin.col + map.cols &&
      row < origin.row + map.rows,
  )
  if ('origin' in map) {
    const result = editRegionMapCells(map, layerId, clipped)
    // The writer preserves the supplied model, IDs and all additional map fields.
    return (result.ok ? result.map : map) as Map
  }
  return withTileLayer(map, layerId, (layer) => {
    let cells: Int16Array | null = null
    for (const edit of clipped) {
      const at = edit.row * map.cols + edit.col
      if ((cells ?? layer.cells)[at] === edit.cell) continue
      if (!cells) cells = new Int16Array(layer.cells)
      cells[at] = edit.cell
    }
    return cells ? { ...layer, cells } : layer
  }) as Map
}
