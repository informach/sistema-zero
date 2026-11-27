import { createHexRegionCellReader, createRegionCellReader } from '@sistemazero/core/creations'
import { tileLayerTilesetId } from '../core/project'
import { isProjectedTileLayer, type WorkshopProjectedMap } from '../core/projectedDocument'
import type { CellPos, CellRect } from './cellGeometry'
import { isBoundedCellRect } from './mapCellEdits'
import { editProjectedMapCells } from './projectedMap'

export interface ProjectedSelection {
  projection: WorkshopProjectedMap['projection']
  sheet: string
  cols: number
  rows: number
  cells: readonly number[]
}

/** Bounded, exact values: clipboard cells never pass through a signed 16-bit buffer. */
export function copyProjectedSelection(
  map: WorkshopProjectedMap,
  layerId: string,
  rect: CellRect,
): ProjectedSelection | null {
  if (
    !isBoundedCellRect(rect) ||
    rect.col < map.origin.col ||
    rect.row < map.origin.row ||
    rect.col + rect.cols > map.origin.col + map.cols ||
    rect.row + rect.rows > map.origin.row + map.rows
  )
    return null
  const layer = map.layers.find((entry) => entry.id === layerId)
  if (!layer || !isProjectedTileLayer(layer)) return null
  const reader =
    layer.cells.kind === 'hex-regions'
      ? createHexRegionCellReader(layer.cells)
      : createRegionCellReader(layer.cells)
  const cells: number[] = []
  for (let row = rect.row; row < rect.row + rect.rows; row++)
    for (let col = rect.col; col < rect.col + rect.cols; col++) cells.push(reader.at(col, row))
  return {
    projection: map.projection,
    sheet: tileLayerTilesetId(map, layer),
    cols: rect.cols,
    rows: rect.rows,
    cells,
  }
}

export function pasteProjectedSelection(
  map: WorkshopProjectedMap,
  layerId: string,
  clip: ProjectedSelection,
  at: CellPos,
) {
  const layer = map.layers.find((entry) => entry.id === layerId)
  if (
    !layer ||
    !isProjectedTileLayer(layer) ||
    tileLayerTilesetId(map, layer) !== clip.sheet ||
    JSON.stringify(map.projection) !== JSON.stringify(clip.projection) ||
    !isBoundedCellRect({ ...at, cols: clip.cols, rows: clip.rows }) ||
    clip.cells.length !== clip.cols * clip.rows
  )
    return { ok: false as const, reason: 'invalid-edit' as const }
  return editProjectedMapCells(
    map,
    layerId,
    clip.cells.map((cell, index) => ({
      col: at.col + (index % clip.cols),
      row: at.row + Math.floor(index / clip.cols),
      cell,
    })),
  )
}
