/** Reader-first scene-4 contract. Existing public scene/PNG readers still admit only 1–3/1–4. */
import { z } from 'zod'
import {
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_CHUNK_BASE64_CHARS,
  PINTA_REGION_CHUNK_BYTES,
  PINTA_REGION_LIMITS,
  type PintaRegionCells,
  parsePintaRegionLayerLocations,
  parsePintaRegionLayers,
} from '../creations/pinta-regions'
import {
  PintaSceneBaseSchema,
  type PintaSceneCellsLayer,
  PintaSceneLayerSchema,
  validatePintaSceneCells,
} from './pinta-scene'

export const PINTA_REGION_SCENE_VERSION = 4
export const PINTA_REGION_SCENE_MAX_JSON_BYTES = 8 * 1024 * 1024
/** Derived from the JSON budget, even ignoring headers/art; per-map 4 MiB limits stay intact. */
export const PINTA_REGION_SCENE_MAX_INDEX_BYTES =
  Math.floor(PINTA_REGION_SCENE_MAX_JSON_BYTES / PINTA_REGION_CHUNK_BASE64_CHARS) *
  PINTA_REGION_CHUNK_BYTES

const origin = z.strictObject({ col: z.number().int(), row: z.number().int() })
const layer = z.discriminatedUnion('kind', [
  PintaSceneLayerSchema.options[0].extend({ cells: z.unknown() }),
  PintaSceneLayerSchema.options[1],
  PintaSceneLayerSchema.options[2],
])
const mapFields = {
  id: PintaSceneBaseSchema.shape.id,
  cols: z.number().int().min(1).max(PINTA_REGION_LIMITS.maxAxis),
  rows: z.number().int().min(1).max(PINTA_REGION_LIMITS.maxAxis),
  origin,
  layers: z.array(layer).max(PINTA_REGION_LIMITS.maxLayers),
}
const mapHeader = z.strictObject(mapFields)
const header = z.strictObject({
  version: z.literal(PINTA_REGION_SCENE_VERSION),
  id: mapFields.id,
  name: PintaSceneBaseSchema.shape.name,
  tileSize: PintaSceneBaseSchema.shape.tileSize,
  cols: mapFields.cols,
  rows: mapFields.rows,
  origin,
  tilesets: PintaSceneBaseSchema.shape.tilesets,
  layers: mapFields.layers,
  sets: z.array(mapHeader).max(64).optional(),
  art: PintaSceneBaseSchema.shape.art,
  resources: PintaSceneBaseSchema.shape.resources,
})

type MapHeader = z.infer<typeof mapHeader>
export type PintaRegionSceneMap = Omit<MapHeader, 'layers'> & {
  layers: PintaSceneCellsLayer<PintaRegionCells>[]
}
export type PintaRegionScene = Omit<z.infer<typeof header>, 'layers' | 'sets'> & {
  layers: PintaSceneCellsLayer<PintaRegionCells>[]
  sets?: PintaRegionSceneMap[]
}

/** Only JSON crosses this boundary: cap input before parsing objects, art or base64. */
export function readPintaRegionScene(text: string): PintaRegionScene | null {
  try {
    if (
      typeof text !== 'string' ||
      text.length > PINTA_REGION_SCENE_MAX_JSON_BYTES ||
      new TextEncoder().encode(text).byteLength > PINTA_REGION_SCENE_MAX_JSON_BYTES
    )
      return null
    const raw: unknown = JSON.parse(text)
    const parsed = header.safeParse(raw)
    if (!parsed.success) return null
    const source = parsed.data
    const maps = [source, ...(source.sets ?? [])]
    let indexBytes = 0
    // Admit every map/definition before decoding the first chunk of the first map.
    for (const map of maps) {
      const grids = map.layers.flatMap((layer) => (layer.kind === 'tiles' ? [layer.cells] : []))
      if (grids.some((grid) => !grid || typeof grid !== 'object' || !('encoding' in grid)))
        return null
      const locations = parsePintaRegionLayerLocations(
        grids,
        { ...map.origin, cols: map.cols, rows: map.rows },
        true,
      )
      if (!locations) return null
      for (const chunks of locations)
        indexBytes += chunks.length * PINTA_REGION_CELL_COUNT * Int16Array.BYTES_PER_ELEMENT
      if (indexBytes > PINTA_REGION_SCENE_MAX_INDEX_BYTES) return null
    }
    const decodeMap = (map: MapHeader): PintaRegionSceneMap | null => {
      const grids = parsePintaRegionLayers(
        map.layers.flatMap((layer) => (layer.kind === 'tiles' ? [layer.cells] : [])),
        { ...map.origin, cols: map.cols, rows: map.rows },
      )
      if (!grids) return null
      let index = 0
      return {
        ...map,
        layers: map.layers.map((layer) =>
          layer.kind === 'tiles' ? { ...layer, cells: grids[index++]! } : layer,
        ),
      }
    }
    const root = decodeMap(source)
    if (!root) return null
    const sets: PintaRegionSceneMap[] = []
    for (const set of source.sets ?? []) {
      const decoded = decodeMap(set)
      if (!decoded) return null
      sets.push(decoded)
    }
    const { sets: sourceSets, ...body } = source
    const scene: PintaRegionScene = {
      ...body,
      layers: root.layers,
      ...(sourceSets ? { sets } : {}),
    }
    let valid = true
    validatePintaSceneCells(
      scene,
      {
        addIssue: () => {
          valid = false
        },
      },
      {
        count: (cells) => cells.chunks.length * PINTA_REGION_CELL_COUNT,
        valid: (cells, _cols, _rows, tileCount) =>
          cells.chunks.every((chunk) =>
            chunk.cells.every((cell) => cell < 0 || (cell & 4095) < tileCount),
          ),
      },
    )
    return valid ? scene : null
  } catch {
    return null
  }
}
