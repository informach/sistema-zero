/** Private scene-4 producer. No public host, PNG or runtime selects it yet. */
import {
  encodePintaRegionLayers,
  PINTA_REGION_CHUNK_BYTES,
  parsePintaRegionLayerLocations,
} from '@sistemazero/core/creations'
import {
  PINTA_REGION_SCENE_MAX_INDEX_BYTES,
  PINTA_REGION_SCENE_MAX_JSON_BYTES,
  type PintaRegionScene,
  type PintaRegionSceneWire,
  readPintaRegionScene,
} from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { JsonByteSizeCache } from '../core/jsonBytes'
import {
  isTileLayer,
  type RegionTilemapAsset,
  sanitizeRegionTilemapAsset,
  type TilemapCells,
  tilemapNeedsV7,
  type VersionablePintaAsset,
} from '../core/project'
import { prepareMapRegions } from '../tiles/regionMap'
import { preparePintaSceneResources, type SceneMapSource, sceneLayersWithCells } from './scene'

export interface PintaRegionSceneExport {
  /** Decoded memory for consumers; transport uses json, never JSON.stringify(scene). */
  scene: PintaRegionScene
  wire: PintaRegionSceneWire
  json: string
  bytes: number
  indexBytes: number
}

function invalid(): never {
  throw new Error('Não consegui conferir o cenário completo. Seus desenhos foram mantidos.')
}
function overBudget(): never {
  throw new Error(
    'O cenário passou do limite para jogar. Use menos desenhos ou divida em outros lugares.',
  )
}

function mapHeader(map: SceneMapSource) {
  return {
    cols: map.cols,
    rows: map.rows,
    origin: 'origin' in map ? map.origin : { col: 0, row: 0 },
  }
}
function chunkCount(map: RegionTilemapAsset): number {
  const locations = parsePintaRegionLayerLocations(
    map.layers.filter(isTileLayer).map((layer) => layer.cells),
    { ...map.origin, cols: map.cols, rows: map.rows },
  )
  if (!locations) invalid()
  return locations.reduce((count, layer) => count + layer.length, 0)
}

export async function exportPintaRegionScene(
  map: RegionTilemapAsset,
  findExternal: (id: string) => PintaMemoryAsset | null,
  imageOf?: (asset: VersionablePintaAsset) => Promise<string | null>,
  budget?: { metadataBytes: number; indexBytes: number },
): Promise<PintaRegionSceneExport> {
  const sizing = new JsonByteSizeCache(64)
  const maxMetadataBytes = Math.min(
    budget?.metadataBytes ?? PINTA_REGION_SCENE_MAX_JSON_BYTES,
    PINTA_REGION_SCENE_MAX_JSON_BYTES,
  )
  const maxIndexBytes = Math.min(
    budget?.indexBytes ?? PINTA_REGION_SCENE_MAX_INDEX_BYTES,
    PINTA_REGION_SCENE_MAX_INDEX_BYTES,
  )
  let chunks = 0
  const maps = new Map<
    SceneMapSource,
    {
      cols: number
      rows: number
      origin: { col: number; row: number }
      layers: PintaRegionSceneWire['layers']
    }
  >()
  const memo = new Map<string, PintaMemoryAsset | null>()
  const find = (id: string): PintaMemoryAsset | null => {
    if (memo.has(id)) return memo.get(id) ?? null
    const asset = findExternal(id)
    memo.set(id, asset)
    return asset
  }
  let rootId = map.id,
    rootName = map.name
  let physics: 'legacy' | 'precise' = 'legacy'
  let definitions: Array<{ id: string; source: SceneMapSource }> = []
  const prepared = await preparePintaSceneResources(map, find, imageOf, {
    strictReferences: true,
    admitMaps: (documents, sets) => {
      if (documents.length > 65 || documents.some((source) => source.layers.length > 32)) invalid()
      // A projection only, never persisted/passed to a scene reader. Count metadata before
      // cloning objects or encoding cells; undefined cell fields are omitted by JSON.
      const metadataOf = (source: SceneMapSource) => ({
        ...mapHeader(source),
        layers: sceneLayersWithCells<TilemapCells, undefined>(source, () => undefined, false),
      })
      const metadata = {
        version: 4,
        id: map.id,
        name: map.name,
        ...metadataOf(map),
        ...(sets.length
          ? {
              sets: sets.map((set) => ({ id: set.id, ...metadataOf(set.map) })),
            }
          : {}),
      }
      if (sizing.byteLength(metadata, maxMetadataBytes) > maxMetadataBytes) overBudget()
      // All already-regional headers precede any payload validation or dense conversion.
      for (const source of documents) if ('origin' in source) chunks += chunkCount(source)
      if (chunks * PINTA_REGION_CHUNK_BYTES > maxIndexBytes) overBudget()
      const regions = new Map<SceneMapSource, RegionTilemapAsset>()
      for (const source of documents) {
        let candidate: RegionTilemapAsset
        if ('origin' in source) candidate = source
        else {
          const converted = prepareMapRegions(source)
          if (!converted.ok) invalid()
          candidate = converted.map
          chunks += chunkCount(candidate)
          if (chunks * PINTA_REGION_CHUNK_BYTES > maxIndexBytes) overBudget()
        }
        regions.set(source, candidate)
      }
      // Encode only after the complete header/index budget was admitted. Strict native
      // validation rejects future metadata instead of dropping it during conversion.
      for (const source of documents) {
        const region = sanitizeRegionTilemapAsset(regions.get(source))
        if (!region) invalid()
        if (tilemapNeedsV7(region)) physics = 'precise'
        if (source === map) {
          rootId = region.id
          rootName = region.name
        }
        const wire = encodePintaRegionLayers(
          region.layers.filter(isTileLayer).map((layer) => layer.cells),
          { ...region.origin, cols: region.cols, rows: region.rows },
        )
        if (!wire) invalid()
        let index = 0
        maps.set(source, {
          ...mapHeader(region),
          layers: sceneLayersWithCells(region, () => wire[index++]!),
        })
      }
      definitions = sets.map((set) => ({ id: set.id, source: set.map }))
    },
  })
  const root = maps.get(map)
  if (!root) invalid()
  const raw: PintaRegionSceneWire = {
    version: 4,
    id: rootId,
    name: rootName,
    tileSize: prepared.base.tileSize,
    cols: root.cols,
    rows: root.rows,
    origin: root.origin,
    physics,
    tilesets: prepared.tilesets,
    layers: root.layers,
    ...(definitions.length
      ? {
          sets: definitions.map((definition) => {
            const data = maps.get(definition.source)
            if (!data) invalid()
            return { id: definition.id, ...data }
          }),
        }
      : {}),
    ...(prepared.art.length ? { art: prepared.art } : {}),
    ...(prepared.versions.length ? { resources: prepared.versions } : {}),
  }
  const bytes = sizing.byteLength(raw, maxMetadataBytes)
  if (bytes > maxMetadataBytes) overBudget()
  const json = JSON.stringify(raw, null, 2)
  const scene = readPintaRegionScene(json, maxIndexBytes)
  if (!scene) invalid()
  return {
    scene,
    wire: raw,
    json,
    bytes,
    indexBytes: chunks * PINTA_REGION_CHUNK_BYTES,
  }
}
