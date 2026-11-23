import { z } from 'zod'
import { PINTA_HEX_EMPTY_CELL, PINTA_HEX_TILE_MASK } from '../creations/pinta-hex-cell'
import { PintaMapProjectionSchema } from '../creations/pinta-map-projection'
import {
  PINTA_HEX_REGION_CHUNK_BYTES,
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_CHUNK_BYTES,
  PINTA_REGION_LIMITS,
  type PintaHexRegionCells,
  type PintaHexRegionWire,
  type PintaRegionCells,
  type PintaRegionWire,
  parsePintaHexRegionLayerLocations,
  parsePintaHexRegionLayers,
  parsePintaRegionLayerLocations,
  parsePintaRegionLayers,
} from '../creations/pinta-regions'
import {
  PINTA_REGION_SCENE_MAX_INDEX_BYTES,
  PINTA_REGION_SCENE_MAX_JSON_BYTES,
} from './pinta-region-scene'
import {
  PintaSceneBaseSchema,
  type PintaSceneCellsLayer,
  PintaSceneLayerSchema,
  validatePintaSceneCells,
} from './pinta-scene'

export const PINTA_PROJECTED_SCENE_VERSION = 5
export const PINTA_PROJECTED_SCENE_MAX_JSON_BYTES = PINTA_REGION_SCENE_MAX_JSON_BYTES
/** The scene 4 budget, derived from the JSON budget: each map keeps its own 4 MiB (the region
 * parsers cap chunks per map), and root + sets together are bounded by what the JSON can carry.
 * A 32-bit hexagonal chunk spends twice the bytes and twice the base64, so the bound is the same. */
export const PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES = PINTA_REGION_SCENE_MAX_INDEX_BYTES

const layer = z.discriminatedUnion('kind', [
  PintaSceneLayerSchema.options[0].extend({ cells: z.unknown() }),
  PintaSceneLayerSchema.options[1],
  PintaSceneLayerSchema.options[2],
])
const mapFields = {
  id: PintaSceneBaseSchema.shape.id,
  cols: z.number().int().min(1).max(PINTA_REGION_LIMITS.maxAxis),
  rows: z.number().int().min(1).max(PINTA_REGION_LIMITS.maxAxis),
  origin: z.strictObject({ col: z.number().int(), row: z.number().int() }),
  projection: PintaMapProjectionSchema,
  layers: z.array(layer).max(PINTA_REGION_LIMITS.maxLayers),
}
const mapHeader = z.strictObject(mapFields)

/** Structural schema for internal admission and generated readers. */
export const PintaProjectedSceneHeaderSchema = z.strictObject({
  version: z.literal(PINTA_PROJECTED_SCENE_VERSION),
  name: PintaSceneBaseSchema.shape.name,
  tileSize: PintaSceneBaseSchema.shape.tileSize,
  ...mapFields,
  physics: z.enum(['legacy', 'precise']),
  tilesets: PintaSceneBaseSchema.shape.tilesets,
  sets: z.array(mapHeader).max(64).optional(),
  art: PintaSceneBaseSchema.shape.art,
  resources: PintaSceneBaseSchema.shape.resources,
})

type Header = z.infer<typeof PintaProjectedSceneHeaderSchema>
type GridHeader = z.infer<typeof mapHeader>
type Cells = PintaRegionCells | PintaHexRegionCells
type Wire = PintaRegionWire | PintaHexRegionWire
type ProjectedMap<CellData> = Omit<GridHeader, 'layers'> & {
  layers: PintaSceneCellsLayer<CellData>[]
}
type ProjectedScene<CellData> = Omit<Header, 'layers' | 'sets'> &
  ProjectedMap<CellData> & { sets?: ProjectedMap<CellData>[] }

export type PintaProjectedSceneMap = ProjectedMap<Cells>
export type PintaProjectedScene = ProjectedScene<Cells>
export type PintaProjectedSceneWire = ProjectedScene<Wire>

export interface PintaProjectedScenePlan {
  readonly id: string
  readonly name: string
  readonly indexBytes: number
  decode(): PintaProjectedScene | null
}

/** Structural/semantic validation precedes cell allocation across the entire scene.
 * Retains only its own JSON snapshot and has one decoding attempt.
 */
export function preparePintaProjectedScene(
  text: string,
  maxIndexBytes = PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES,
): PintaProjectedScenePlan | null {
  try {
    if (
      typeof text !== 'string' ||
      text.length > PINTA_PROJECTED_SCENE_MAX_JSON_BYTES ||
      new TextEncoder().encode(text).byteLength > PINTA_PROJECTED_SCENE_MAX_JSON_BYTES ||
      !Number.isSafeInteger(maxIndexBytes) ||
      maxIndexBytes < 0 ||
      maxIndexBytes > PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES
    )
      return null
    const header = PintaProjectedSceneHeaderSchema.safeParse(JSON.parse(text))
    if (!header.success) return null
    const source = header.data
    const maps = [source, ...(source.sets ?? [])]
    let indexBytes = 0
    const counts = new Map<unknown, number>()
    for (const map of maps) {
      const hex = map.projection.kind === 'hexagonal'
      if (
        source.physics === 'legacy' &&
        (map.projection.kind !== 'orthogonal' ||
          map.projection.tileWidth !== source.tileSize ||
          map.projection.tileHeight !== source.tileSize ||
          map.layers.some(
            (layer) => layer.kind === 'objects' && layer.objects.some((object) => object.collision),
          ))
      )
        return null
      const grids = map.layers.flatMap((layer) => (layer.kind === 'tiles' ? [layer.cells] : []))
      if (grids.some((grid) => !grid || typeof grid !== 'object' || !('encoding' in grid)))
        return null
      const bounds = { ...map.origin, cols: map.cols, rows: map.rows }
      const locations = (hex ? parsePintaHexRegionLayerLocations : parsePintaRegionLayerLocations)(
        grids,
        bounds,
        true,
      )
      if (!locations) return null
      for (let i = 0; i < grids.length; i++) {
        const chunks = locations[i]!.length
        counts.set(grids[i], chunks * PINTA_REGION_CELL_COUNT)
        indexBytes += chunks * (hex ? PINTA_HEX_REGION_CHUNK_BYTES : PINTA_REGION_CHUNK_BYTES)
      }
      if (indexBytes > maxIndexBytes) return null
    }
    let metadataValid = true
    validatePintaSceneCells(
      source,
      {
        addIssue: () => {
          metadataValid = false
        },
      },
      {
        count: (cells) => counts.get(cells) ?? 0,
        valid: () => true,
      },
    )
    if (!metadataValid) return null

    const tileCounts = new Map(source.tilesets.map((tileset) => [tileset.id, tileset.count]))
    function decodeMap(map: GridHeader): PintaProjectedSceneMap | null {
      const hex = map.projection.kind === 'hexagonal'
      const bounds = { ...map.origin, cols: map.cols, rows: map.rows }
      const grids = (hex ? parsePintaHexRegionLayers : parsePintaRegionLayers)(
        map.layers.flatMap((layer) => (layer.kind === 'tiles' ? [layer.cells] : [])),
        bounds,
      )
      if (!grids) return null
      const layers: PintaSceneCellsLayer<Cells>[] = []
      let index = 0
      const empty = hex ? PINTA_HEX_EMPTY_CELL : -1
      for (const layer of map.layers) {
        if (layer.kind !== 'tiles') {
          layers.push(layer)
          continue
        }
        const cells = grids[index++]!
        const limit = tileCounts.get(layer.tilesetId)!
        for (const chunk of cells.chunks)
          if (chunk.cells.some((cell) => cell !== empty && (cell & PINTA_HEX_TILE_MASK) >= limit))
            return null
        layers.push({ ...layer, cells })
      }
      return { ...map, layers }
    }

    let consumed = false
    return Object.freeze({
      id: source.id,
      name: source.name,
      indexBytes,
      decode(): PintaProjectedScene | null {
        if (consumed) return null
        consumed = true
        try {
          const root = decodeMap(source)
          if (!root) return null
          const sets: PintaProjectedSceneMap[] = []
          for (const definition of source.sets ?? []) {
            const decoded = decodeMap(definition)
            if (!decoded) return null
            sets.push(decoded)
          }
          const { sets: sourceSets, ...body } = source
          return { ...body, ...root, ...(sourceSets ? { sets } : {}) }
        } catch {
          return null
        }
      },
    })
  } catch {
    return null
  }
}

export function readPintaProjectedScene(
  text: string,
  maxIndexBytes = PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES,
): PintaProjectedScene | null {
  return preparePintaProjectedScene(text, maxIndexBytes)?.decode() ?? null
}
