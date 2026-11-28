import {
  createHexRegionCellReader,
  createRegionCellReader,
  PINTA_HEX_EMPTY_CELL,
} from '@sistemazero/core/creations'
import { isWorkshopProjectedMap } from '../../core/assetMemory'
import type { WorkshopProjectedMap } from '../../core/projectedDocument'
import { isValidCellForTiles } from '../cell'
import { type AuthorMap, tryEditMapCellBatch } from '../mapCellEdits'
import { editProjectedMapCells } from '../projectedMap'
import type { RegionCellEdit } from '../regionCells'
import { createMapLayerCellReader } from '../tilemapOps'

export type AutomapMap = AuthorMap | WorkshopProjectedMap
type Layer = AutomapMap['layers'][number]
export function validAutomapCell(map: AutomapMap, value: number, count: number): boolean {
  return isWorkshopProjectedMap(map) && map.projection.kind === 'hexagonal'
    ? Number.isInteger(value) && value >= -1 && value < count
    : isValidCellForTiles(value, count)
}
export function isAutomapTileLayer(
  layer: Layer,
): layer is Exclude<Layer, { kind: 'objects' | 'group' }> {
  return layer.kind === undefined || layer.kind === 'tiles'
}
/** Rulebook 1 uses -1 for empty. Hex transforms remain exact; unsupported examples are refused. */
export function automapCellReader(
  map: AutomapMap,
  layerId: string,
): { at(col: number, row: number): number } | null {
  if (!isWorkshopProjectedMap(map)) return createMapLayerCellReader(map, layerId)
  const layer = map.layers.find((item) => item.id === layerId)
  if (!layer || !isAutomapTileLayer(layer)) return null
  const reader =
    layer.cells.kind === 'hex-regions'
      ? createHexRegionCellReader(layer.cells)
      : createRegionCellReader(layer.cells)
  return {
    at(col, row) {
      const value = reader.at(col, row)
      return value === PINTA_HEX_EMPTY_CELL ? -1 : value
    },
  }
}
/** One rule evaluator dispatches writes to the same atomic cell writers used by the brush. */
export function editAutomapCells<Map extends AutomapMap>(
  map: Map,
  layerId: string,
  edits: readonly RegionCellEdit[],
): { map: Map; failure?: string } {
  if (!isWorkshopProjectedMap(map)) {
    const result = tryEditMapCellBatch(map, layerId, edits)
    return { ...result, map: result.map as Map }
  }
  const result = editProjectedMapCells(
    map,
    layerId,
    map.projection.kind === 'hexagonal'
      ? edits.map((point) => ({
          ...point,
          cell: point.cell === -1 ? PINTA_HEX_EMPTY_CELL : point.cell,
        }))
      : edits,
  )
  // The writer changes only cells/bounds, preserving every additional authored field of Map.
  return result.ok ? { map: result.map as Map } : { map, failure: result.reason }
}
