import {
  encodePintaHexRegionLayers,
  encodePintaRegionLayers,
  PINTA_HEX_REGION_CHUNK_BYTES,
  PINTA_REGION_CHUNK_BYTES,
  type PintaRegionCells,
} from '@sistemazero/core/creations'
import {
  PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES,
  PINTA_PROJECTED_SCENE_MAX_JSON_BYTES,
  type PintaProjectedSceneWire,
  readPintaProjectedScene,
} from '@sistemazero/core/studio/pinta-projected-scene'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { JsonByteSizeCache, utf8ByteLength } from '../core/jsonBytes'
import {
  isTileLayer,
  type RegionTilemapAsset,
  type TilemapCells,
  tilemapNeedsV7,
  type VersionablePintaAsset,
} from '../core/project'
import {
  decodeProjectedTilemapDocument,
  isProjectedTileLayer,
  type ProjectedMapSetAsset,
  type ProjectedTileCells,
  type ProjectedTilemapAsset,
} from '../core/projectedDocument'
import { prepareMapRegions } from '../tiles/regionMap'
import { preparePintaSceneResources, type SceneMapSource, sceneLayersWithCells } from './scene'

export type ProjectedSceneAsset = PintaMemoryAsset | ProjectedTilemapAsset | ProjectedMapSetAsset
const empty: PintaRegionCells = { kind: 'regions', version: 1, side: 32, chunks: [] }
const isProjectedSet = (asset: ProjectedSceneAsset): asset is ProjectedMapSetAsset =>
  asset.kind === 'map-set' && 'projection' in asset.map

function invalid(): never {
  throw new Error('Não foi possível reunir as regiões e as projeções deste cenário.')
}

/** Prepare the full authored world, with shared resource/atlas preparation.
 * Projected cells are never passed through a regional or square-cell decoder.
 */
export async function exportPintaProjectedScene(
  source: ProjectedTilemapAsset,
  findExternal: (id: string) => ProjectedSceneAsset | null,
  imageOf?: (asset: VersionablePintaAsset) => Promise<string | null>,
) {
  const projected = new Map<SceneMapSource, ProjectedTilemapAsset>()
  const captured = new Map<string, PintaMemoryAsset | null>()
  function metadataOnly(raw: ProjectedTilemapAsset): RegionTilemapAsset {
    const map = decodeProjectedTilemapDocument(raw)
    if (!map) invalid()
    const { projection: _projection, growth: _growth, ...body } = map
    const header: RegionTilemapAsset = {
      ...body,
      schema: 8,
      layers: map.layers.map((layer) =>
        isProjectedTileLayer(layer) ? { ...layer, cells: empty } : layer,
      ),
    }
    projected.set(header, map)
    return header
  }
  const root = metadataOnly(source)
  captured.set(source.id, root)
  const find = (id: string): PintaMemoryAsset | null => {
    if (captured.has(id)) return captured.get(id) ?? null
    const asset = findExternal(id)
    const value: PintaMemoryAsset | null =
      asset?.kind === 'tilemap' && 'projection' in asset
        ? metadataOnly(asset)
        : asset && isProjectedSet(asset)
          ? { ...asset, schema: 8, map: metadataOnly(asset.map) }
          : asset
    captured.set(id, value)
    return value
  }
  const regionMaps = new Map<SceneMapSource, RegionTilemapAsset>()
  let indexBytes = 0
  const prepared = await preparePintaSceneResources(root, find, imageOf, {
    strictReferences: true,
    admitMaps(documents) {
      const size = new JsonByteSizeCache(64)
      const metadata = documents.map((map) => ({
        origin: 'origin' in map ? map.origin : { col: 0, row: 0 },
        cols: map.cols,
        rows: map.rows,
        layers: sceneLayersWithCells<TilemapCells, undefined>(map, () => undefined, false),
        projection: projected.get(map)?.projection,
      }))
      if (
        size.byteLength(metadata, PINTA_PROJECTED_SCENE_MAX_JSON_BYTES) >
        PINTA_PROJECTED_SCENE_MAX_JSON_BYTES
      )
        invalid()
      for (const map of documents) {
        const authored = projected.get(map)
        if (authored) {
          for (const layer of authored.layers) {
            if (!isProjectedTileLayer(layer)) continue
            indexBytes +=
              layer.cells.chunks.length *
              (layer.cells.kind === 'hex-regions'
                ? PINTA_HEX_REGION_CHUNK_BYTES
                : PINTA_REGION_CHUNK_BYTES)
          }
        } else {
          const prepared = 'origin' in map ? { ok: true as const, map } : prepareMapRegions(map)
          if (!prepared.ok) invalid()
          regionMaps.set(map, prepared.map)
          indexBytes += prepared.map.layers
            .filter(isTileLayer)
            .reduce((sum, layer) => sum + layer.cells.chunks.length * PINTA_REGION_CHUNK_BYTES, 0)
        }
        if (indexBytes > PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES) invalid()
      }
    },
  })
  const size = prepared.base.tileSize
  function mapWire(
    map: SceneMapSource,
    id: string,
  ): NonNullable<PintaProjectedSceneWire['sets']>[number] {
    const authored = projected.get(map)
    const fallback = regionMaps.get(map)
    const selected = authored ?? fallback
    if (!selected) invalid()
    const projection = authored?.projection ?? {
      kind: 'orthogonal' as const,
      tileWidth: size,
      tileHeight: size,
    }
    const cells = selected.layers.flatMap((layer) =>
      isProjectedTileLayer<ProjectedTileCells>(layer) ? [layer.cells] : [],
    )
    const bounds = { ...selected.origin, cols: selected.cols, rows: selected.rows }
    const grids =
      projection.kind === 'hexagonal'
        ? encodePintaHexRegionLayers(
            cells.filter((grid) => grid.kind === 'hex-regions'),
            bounds,
          )
        : encodePintaRegionLayers(
            cells.filter((grid) => grid.kind === 'regions'),
            bounds,
          )
    if (!grids || grids.length !== cells.length) invalid()
    let index = 0
    return {
      id,
      origin: selected.origin,
      cols: selected.cols,
      rows: selected.rows,
      projection,
      layers: sceneLayersWithCells<TilemapCells, (typeof grids)[number]>(
        fallback ?? map,
        () => grids[index++]!,
      ),
    }
  }
  const main = mapWire(root, source.id)
  const sets = prepared.definitions.map((set) => mapWire(set.map, set.id))
  const precise =
    prepared.documents.some(tilemapNeedsV7) ||
    [main, ...sets].some(
      ({ projection }) =>
        projection.kind !== 'orthogonal' ||
        projection.tileWidth !== size ||
        projection.tileHeight !== size,
    )
  const wire: PintaProjectedSceneWire = {
    ...main,
    version: 5,
    name: source.name,
    tileSize: size,
    physics: precise ? 'precise' : 'legacy',
    tilesets: prepared.tilesets,
    ...(sets.length ? { sets } : {}),
    ...(prepared.art.length ? { art: prepared.art } : {}),
    ...(prepared.versions.length ? { resources: prepared.versions } : {}),
  }
  if (
    new JsonByteSizeCache(64).byteLength(wire, PINTA_PROJECTED_SCENE_MAX_JSON_BYTES) >
    PINTA_PROJECTED_SCENE_MAX_JSON_BYTES
  )
    invalid()
  const json = JSON.stringify(wire)
  const bytes = utf8ByteLength(json)
  const scene = readPintaProjectedScene(json)
  if (!scene) invalid()
  return { json, bytes, scene, wire }
}
