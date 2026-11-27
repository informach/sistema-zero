import {
  isPintaHexCell,
  PINTA_HEX_EMPTY_CELL,
  PINTA_HEX_REGION_MAX_CHUNKS,
  PINTA_REGION_LIMITS,
  parsePintaRegionBounds,
  pintaHexCellTile,
} from '@sistemazero/core/creations'
import { createAsset } from '../core/newAsset'
import type { AnyTilesetAsset } from '../core/project'
import { effectiveLayer, PINTA_MAP_FORMAT_LIMITS } from '../core/project'
import { isProjectedTileLayer, type WorkshopProjectedMap } from '../core/projectedDocument'
import { sanitizeWorkshopProjectedMap } from '../export/workshopProjection'
import { EMPTY_CELL, isValidCellForTiles } from './cell'
import {
  editHexRegionCells,
  editRegionCells,
  REGION_EDIT_LIMIT,
  type RegionCellEdit,
} from './regionCells'
import { prepareMapRegions } from './regionMap'

/** New projected maps use the same map factory and native admission as existing creations. */
export function createProjectedMap(
  name: string,
  sheet: AnyTilesetAsset,
  kind: 'isometric' | 'hexagonal',
): WorkshopProjectedMap | null {
  const seed = createAsset({ kind: 'tilemap', name, tilesetId: sheet.id, cols: 20, rows: 15 })
  if (seed.kind !== 'tilemap') return null
  const prepared = prepareMapRegions(seed)
  if (!prepared.ok) return null
  const size = sheet.tileSize
  const projection =
    kind === 'isometric'
      ? { kind, tileWidth: size, tileHeight: size / 2 }
      : {
          kind,
          tileWidth: size,
          tileHeight: size,
          hexSideLength: size / 2,
          staggerAxis: 'y' as const,
          staggerIndex: 'odd' as const,
        }
  return sanitizeWorkshopProjectedMap({
    ...prepared.map,
    schema: 9,
    physics: 'precise',
    projection,
    growth: 'expandable',
    layers: prepared.map.layers.map((layer) =>
      kind === 'hexagonal' && isProjectedTileLayer(layer)
        ? { ...layer, cells: { kind: 'hex-regions', version: 1, side: 32, chunks: [] } }
        : layer,
    ),
  })
}

export type ProjectedMapEditResult =
  | { ok: true; map: WorkshopProjectedMap }
  | {
      ok: false
      reason:
        | 'invalid-edit'
        | 'outside-map'
        | 'work-budget'
        | 'cell-budget'
        | 'invalid-layer'
        | 'locked'
    }

/** Native projected edits keep their grid dialect and geometry; no orthogonal surrogate is stored. */
export function editProjectedMapCells(
  map: WorkshopProjectedMap,
  layerId: string,
  edits: readonly RegionCellEdit[],
): ProjectedMapEditResult {
  if (edits.length > REGION_EDIT_LIMIT) return { ok: false, reason: 'work-budget' }
  const layer = map.layers.find((entry) => entry.id === layerId)
  if (!layer || !isProjectedTileLayer(layer)) return { ok: false, reason: 'invalid-layer' }
  if (effectiveLayer(map, layer).locked) return { ok: false, reason: 'locked' }
  const hex = map.projection.kind === 'hexagonal'
  if (
    edits.some(
      (point) =>
        !point ||
        !Number.isSafeInteger(point.col) ||
        !Number.isSafeInteger(point.row) ||
        (hex
          ? !isPintaHexCell(point.cell) ||
            pintaHexCellTile(point.cell) >= PINTA_MAP_FORMAT_LIMITS.maxTiles
          : !isValidCellForTiles(point.cell, PINTA_MAP_FORMAT_LIMITS.maxTiles)),
    )
  )
    return { ok: false, reason: 'invalid-edit' }
  let bounds = { ...map.origin, cols: map.cols, rows: map.rows }
  let writes = edits
  if (map.growth === 'expandable') {
    const last = new Map(edits.map((point) => [`${point.col},${point.row}`, point]))
    const empty = hex ? PINTA_HEX_EMPTY_CELL : EMPTY_CELL
    writes = [...last.values()].filter(
      (point) =>
        point.cell !== empty ||
        (point.col >= bounds.col &&
          point.row >= bounds.row &&
          point.col < bounds.col + bounds.cols &&
          point.row < bounds.row + bounds.rows),
    )
    for (const point of writes) {
      const endCol = Math.max(bounds.col + bounds.cols, point.col + 1)
      const endRow = Math.max(bounds.row + bounds.rows, point.row + 1)
      bounds = {
        col: Math.min(bounds.col, point.col),
        row: Math.min(bounds.row, point.row),
        cols: 0,
        rows: 0,
      }
      bounds.cols = endCol - bounds.col
      bounds.rows = endRow - bounds.row
    }
    if (!parsePintaRegionBounds(bounds)) return { ok: false, reason: 'outside-map' }
  }
  const occupied = map.layers
    .filter(isProjectedTileLayer)
    .reduce((sum, item) => sum + item.cells.chunks.length, 0)
  const maximum = hex ? PINTA_HEX_REGION_MAX_CHUNKS : PINTA_REGION_LIMITS.maxChunks
  const available = maximum - occupied + layer.cells.chunks.length
  const edited =
    layer.cells.kind === 'hex-regions'
      ? editHexRegionCells(layer.cells, bounds, writes, available)
      : editRegionCells(layer.cells, bounds, writes, available)
  if (!edited.ok) return edited
  if (
    edited.cells === layer.cells &&
    bounds.col === map.origin.col &&
    bounds.row === map.origin.row &&
    bounds.cols === map.cols &&
    bounds.rows === map.rows
  )
    return { ok: true, map }
  return {
    ok: true,
    map: {
      ...map,
      origin: { col: bounds.col, row: bounds.row },
      cols: bounds.cols,
      rows: bounds.rows,
      layers: map.layers.map((entry) =>
        entry === layer ? { ...layer, cells: edited.cells } : entry,
      ),
    },
  }
}
