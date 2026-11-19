import { effectiveLayer, type TilemapAsset } from '../../../core/project'
import type { CellPos, CellRect } from '../../../tiles/cellGeometry'
import type { MapTool } from '../TilemapPanels'
import {
  applyMapBrush,
  fillWithBrush,
  type MapBrushContext,
  shapeBrushCells,
  targetBrushCells,
} from './mapBrush'

/** A marca acompanha somente a parte visível no mapa, como o desenho recortado. */
export function keyboardRegionBounds(
  map: TilemapAsset,
  layerId: string,
  rect: CellRect,
  tileSize: number,
): { x: number; y: number; width: number; height: number } | null {
  const layer = map.layers.find((l) => l.id === layerId)
  if (!layer) return null
  const offset = effectiveLayer(map, layer)
  const x = rect.col * tileSize + offset.offsetX,
    y = rect.row * tileSize + offset.offsetY
  const left = Math.max(0, x),
    top = Math.max(0, y)
  const right = Math.min(map.cols * tileSize, x + rect.cols * tileSize)
  const bottom = Math.min(map.rows * tileSize, y + rect.rows * tileSize)
  return right <= left || bottom <= top
    ? null
    : { x: left, y: top, width: right - left, height: bottom - top }
}
export function keyboardCellBounds(
  map: TilemapAsset,
  layerId: string,
  cell: CellPos,
  tileSize: number,
) {
  return keyboardRegionBounds(map, layerId, { ...cell, cols: 1, rows: 1 }, tileSize)
}

/** Só calcula a edição/prévia; não grava, não renderiza e não recebe eventos DOM. */
export function keyboardPaintCandidate(
  map: TilemapAsset,
  tool: MapTool,
  cursor: CellPos,
  anchor: CellPos | null,
  brush: MapBrushContext,
): { map: TilemapAsset; unmatched: boolean } | null {
  const context = { ...brush, erasing: tool === 'eraser', anchor: anchor ?? cursor }
  if (tool === 'fill') return fillWithBrush(map, cursor, context)
  if (tool === 'line' || tool === 'rect')
    return anchor ? applyMapBrush(map, shapeBrushCells(map, tool, anchor, cursor), context) : null
  if (tool === 'pencil' || tool === 'eraser')
    return applyMapBrush(map, targetBrushCells([cursor], context), context)
  return null
}
