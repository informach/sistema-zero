import { effectiveLayer } from '../../../core/project'
import type { CellPos, CellRect } from '../../../tiles/cellGeometry'
import type { AuthorMap } from '../../../tiles/mapCellEdits'
import { mapCellBounds } from '../../../tiles/mapCells'
import type { MapTool } from '../TilemapPanels'
import {
  applyMapBrush,
  type BrushCellsResult,
  collectShapeBrushCells,
  collectTargetBrushCells,
  fillWithBrush,
  type MapBrushContext,
  type MapBrushResult,
} from './mapBrush'

/** A marca acompanha somente a parte visível no mapa, como o desenho recortado. */
export function keyboardRegionBounds(
  map: AuthorMap,
  layerId: string,
  rect: CellRect,
  tileSize: number,
): { x: number; y: number; width: number; height: number } | null {
  const layer = map.layers.find((l) => l.id === layerId)
  if (!layer) return null
  const offset = effectiveLayer(map, layer),
    bounds = mapCellBounds(map)
  const x = rect.col * tileSize + offset.offsetX,
    y = rect.row * tileSize + offset.offsetY
  const left = Math.max(bounds.col * tileSize, x),
    top = Math.max(bounds.row * tileSize, y)
  const right = Math.min((bounds.col + map.cols) * tileSize, x + rect.cols * tileSize)
  const bottom = Math.min((bounds.row + map.rows) * tileSize, y + rect.rows * tileSize)
  return right <= left || bottom <= top
    ? null
    : { x: left, y: top, width: right - left, height: bottom - top }
}
export function keyboardCellBounds(
  map: AuthorMap,
  layerId: string,
  cell: CellPos,
  tileSize: number,
) {
  return keyboardRegionBounds(map, layerId, { ...cell, cols: 1, rows: 1 }, tileSize)
}

/** Só calcula a edição/prévia; não grava, não renderiza e não recebe eventos DOM. */
export function keyboardPaintCandidate<Map extends AuthorMap>(
  map: Map,
  tool: MapTool,
  cursor: CellPos,
  anchor: CellPos | null,
  brush: MapBrushContext,
): MapBrushResult<Map> | null {
  const context = { ...brush, erasing: tool === 'eraser', anchor: anchor ?? cursor }
  if (tool === 'fill') return fillWithBrush(map, cursor, context)
  let result: BrushCellsResult | null = null
  if (tool === 'line' || tool === 'rect') {
    if (!anchor) return null
    result = collectShapeBrushCells(map, tool, anchor, cursor)
  } else if (tool === 'pencil' || tool === 'eraser')
    result = collectTargetBrushCells([cursor], context)
  if (result)
    return result.ok
      ? applyMapBrush(map, result.positions, context)
      : { map, unmatched: false, failure: result.reason }
  return null
}
