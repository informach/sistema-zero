import { encodePintaRegionLayers, type PintaRegionWire } from '@sistemazero/core/creations'
import { pintaAssetToWire } from '../assets/wire'
import {
  isTileLayer,
  type PintaAsset,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  sanitizeRegionMapSetAsset,
  sanitizeRegionTilemapAsset,
  type TilemapGroupLayer,
  type TilemapObjectLayer,
  type TilemapResourceVersion,
  type TilemapTileLayer,
} from './project'

type WireLayer = Omit<TilemapTileLayer, 'cells'> & { cells: PintaRegionWire }
export type RegionMapDocument = Omit<RegionTilemapAsset, 'layers' | 'resources'> & {
  layers: Array<WireLayer | TilemapObjectLayer | TilemapGroupLayer>
  resources?: Array<Omit<TilemapResourceVersion, 'asset'> & { asset: unknown }>
}

export type RegionSetDocument = Omit<RegionMapSetAsset, 'map'> & { map: RegionMapDocument }

/** Internal only: no public writer or version advertisement changes here. */
export function decodeRegionSetDocument(raw: unknown): RegionMapSetAsset | null {
  return sanitizeRegionMapSetAsset(raw)
}

export function encodeRegionSetDocument(
  raw: RegionMapSetAsset,
  serializeResource: (asset: PintaAsset) => unknown = pintaAssetToWire,
): RegionSetDocument | null {
  const set = sanitizeRegionMapSetAsset(raw)
  if (!set) return null
  const map = encodeRegionMapDocument(set.map, serializeResource)
  return map ? { ...set, map } : null
}

/** Internal codec, separate from the active 0–7 document writer during reader integration. */
export function decodeRegionMapDocument(raw: unknown): RegionTilemapAsset | null {
  return sanitizeRegionTilemapAsset(raw)
}

export function encodeRegionMapDocument(
  raw: RegionTilemapAsset,
  serializeResource: (asset: PintaAsset) => unknown = pintaAssetToWire,
): RegionMapDocument | null {
  const map = sanitizeRegionTilemapAsset(raw)
  if (!map) return null
  const grids = encodePintaRegionLayers(
    map.layers.filter(isTileLayer).map((l) => l.cells),
    { ...map.origin, cols: map.cols, rows: map.rows },
  )
  if (!grids) return null
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
      isTileLayer(layer) ? { ...layer, cells: grids[index++]! } : layer,
    ),
  }
}
