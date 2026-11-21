import { effectiveLayer, PINTA_MAP_FORMAT_LIMITS, type TilemapCells } from '../core/project'
import { makeCell } from './cell'
import type { CellPos } from './cellGeometry'
import { type AuthorMap, editMapCellBatch, isCellPosition } from './mapCellEdits'
import { REGION_EDIT_LIMIT, type RegionCellEdit } from './regionCells'
import { seededChoice } from './terrain'
import { tileLayerById } from './tilemapOps'
/** O resultado depende só da semente e da célula; a prévia é exatamente o que será gravado. */
export function scatterTiles<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  positions: readonly CellPos[],
  tiles: readonly number[],
  density: number,
  seed: number,
  flags = 0,
): Map {
  if (
    !tiles.length ||
    tiles.length > REGION_EDIT_LIMIT ||
    tiles.some(
      (tile) => !Number.isInteger(tile) || tile < 0 || tile >= PINTA_MAP_FORMAT_LIMITS.maxTiles,
    ) ||
    positions.length > REGION_EDIT_LIMIT ||
    positions.some((p) => !p || !isCellPosition(p)) ||
    !Number.isFinite(density)
  )
    return map
  const layer = tileLayerById<TilemapCells>(map, layerId)
  if (!layer || effectiveLayer(map, layer).locked) return map
  const origin = 'origin' in map ? map.origin : { col: 0, row: 0 },
    edits: RegionCellEdit[] = []
  for (const { col, row } of positions) {
    if (
      col < origin.col ||
      row < origin.row ||
      col >= origin.col + map.cols ||
      row >= origin.row + map.rows ||
      seededChoice(seed, col, row) >= density
    )
      continue
    edits.push({
      col,
      row,
      cell: makeCell(tiles[Math.floor(seededChoice(seed + 1009, col, row) * tiles.length)]!, flags),
    })
  }
  return editMapCellBatch(map, layerId, edits)
}
