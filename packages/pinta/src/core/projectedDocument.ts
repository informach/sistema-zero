import {
  encodePintaHexRegionLayers,
  encodePintaRegionLayers,
  type PintaHexRegionCells,
  type PintaHexRegionWire,
  type PintaMapProjection,
  PintaMapProjectionSchema,
  type PintaRegionCells,
  type PintaRegionWire,
  parsePintaHexRegionLayerLocations,
  parsePintaHexRegionLayers,
  parsePintaRegionLayerLocations,
  parsePintaRegionLayers,
  pintaHexCellTile,
} from '@sistemazero/core/creations'
import { pintaAssetToWire } from '../assets/wire'
import { cellTile } from '../tiles/cell'
import { RegionMetadataBudgetCache, regionDocumentMetadata } from './mapDocumentBoundary'
import {
  isTileLayer,
  type PintaAsset,
  type RegionTilemapAsset,
  sanitizeRegionTilemapAsset,
  type TilemapGroupLayer,
  type TilemapObjectLayer,
  type TilemapResourceVersion,
  type TilemapTileLayer,
} from './project'
import { PINTA_MAP_FORMAT_LIMITS } from './projectConfig'

export const PROJECTED_TILEMAP_SCHEMA = 9
export type ProjectedTileCells = PintaRegionCells | PintaHexRegionCells
type ProjectedWireCells = PintaRegionWire | PintaHexRegionWire
type ProjectedTileLayer<Grid> = Omit<TilemapTileLayer<PintaRegionCells>, 'cells'> & { cells: Grid }
export type ProjectedMapLayer<Grid = ProjectedTileCells> =
  | ProjectedTileLayer<Grid>
  | TilemapObjectLayer
  | TilemapGroupLayer
type ProjectedMap<Grid> = Omit<RegionTilemapAsset, 'schema' | 'layers'> & {
  schema: typeof PROJECTED_TILEMAP_SCHEMA
  projection: PintaMapProjection
  growth: 'fixed' | 'expandable'
  layers: ProjectedMapLayer<Grid>[]
}

export type ProjectedTilemapAsset = ProjectedMap<ProjectedTileCells>
export type ProjectedTilemapDocument = Omit<ProjectedMap<ProjectedWireCells>, 'resources'> & {
  resources?: Array<Omit<TilemapResourceVersion, 'asset'> & { asset: unknown }>
}

export function isProjectedTileLayer<Grid>(
  layer: ProjectedMapLayer<Grid>,
): layer is ProjectedTileLayer<Grid> {
  return layer.kind === undefined || layer.kind === 'tiles'
}

const noTiles: PintaRegionCells = { kind: 'regions', version: 1, side: 32, chunks: [] }

/** Internal native-9 authoring body, shared by file admission and the in-memory boundary. */
export function decodeProjectedTilemapDocument(raw: unknown): ProjectedTilemapAsset | null {
  try {
    const metadata = regionDocumentMetadata(raw)
    if (
      !metadata ||
      !raw ||
      typeof raw !== 'object' ||
      !new RegionMetadataBudgetCache().accepts(metadata)
    )
      return null
    const { schema, projection, growth, ...body } = metadata as Record<string, unknown>
    if (schema !== PROJECTED_TILEMAP_SCHEMA || (growth !== 'fixed' && growth !== 'expandable'))
      return null
    const parsed = PintaMapProjectionSchema.safeParse(projection)
    if (!parsed.success || (parsed.data.kind !== 'orthogonal' && body.physics !== 'precise'))
      return null

    const originalLayers = Object.getOwnPropertyDescriptor(raw, 'layers')?.value
    if (!Array.isArray(body.layers) || !Array.isArray(originalLayers)) return null
    const grids: unknown[] = []
    const layerHeaders = body.layers.map((layer, index) => {
      if (layer.kind !== undefined && layer.kind !== 'tiles') return layer
      grids.push(Object.getOwnPropertyDescriptor(originalLayers[index], 'cells')?.value)
      return { ...layer, cells: noTiles }
    })
    const hex = parsed.data.kind === 'hexagonal'
    const bounds = {
      ...(body.origin && typeof body.origin === 'object' ? body.origin : {}),
      cols: body.cols,
      rows: body.rows,
    }
    const locations = hex ? parsePintaHexRegionLayerLocations : parsePintaRegionLayerLocations
    if (!locations(grids, bounds, true)) return null

    // Reuse native map metadata admission with a temporary cell-free snapshot.
    // No caller receives that snapshot or gets a format-8 fallback.
    const map = sanitizeRegionTilemapAsset({ ...body, schema: 8, layers: layerHeaders })
    if (!map) return null
    const cells = (hex ? parsePintaHexRegionLayers : parsePintaRegionLayers)(grids, bounds)
    if (!cells) return null
    const indexOf = hex ? pintaHexCellTile : cellTile
    for (const grid of cells)
      for (const chunk of grid.chunks)
        if (chunk.cells.some((cell) => indexOf(cell) >= PINTA_MAP_FORMAT_LIMITS.maxTiles))
          return null

    let index = 0
    return {
      ...map,
      schema: PROJECTED_TILEMAP_SCHEMA,
      projection: parsed.data,
      growth,
      layers: map.layers.map((layer) =>
        isTileLayer(layer) ? { ...layer, cells: cells[index++]! } : layer,
      ),
    }
  } catch {
    return null
  }
}

/** Serialize only the admitted cell dialect, regardless of host byte order. */
export function encodeProjectedTilemapDocument(
  raw: ProjectedTilemapAsset,
  serializeResource: (asset: PintaAsset) => unknown = pintaAssetToWire,
): ProjectedTilemapDocument | null {
  const map = decodeProjectedTilemapDocument(raw)
  if (!map) return null
  const bounds = { ...map.origin, cols: map.cols, rows: map.rows }
  const grids = map.layers.filter(isProjectedTileLayer).map((layer) => layer.cells)
  const wire =
    map.projection.kind === 'hexagonal'
      ? encodePintaHexRegionLayers(
          grids.filter((grid) => grid.kind === 'hex-regions'),
          bounds,
        )
      : encodePintaRegionLayers(
          grids.filter((grid) => grid.kind === 'regions'),
          bounds,
        )
  if (!wire || wire.length !== grids.length) return null
  let index = 0
  return {
    ...map,
    ...(map.resources
      ? {
          resources: map.resources.map((version) => ({
            ...version,
            asset: serializeResource(version.asset),
          })),
        }
      : {}),
    layers: map.layers.map((layer) =>
      isProjectedTileLayer(layer) ? { ...layer, cells: wire[index++]! } : layer,
    ),
  }
}
