import { encodePintaRegionLayers, type PintaRegionWire } from '@sistemazero/core/creations'
import { pintaAssetToWire } from '../assets/wire'
import {
  isTileLayer,
  type RegionTilemapAsset,
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

/** Internal codec, separate from the active 0–7 document writer during reader integration. */
export function decodeRegionMapDocument(raw: unknown): RegionTilemapAsset | null {
  return sanitizeRegionTilemapAsset(raw)
}

export function encodeRegionMapDocument(raw: RegionTilemapAsset): RegionMapDocument | null {
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
            asset: pintaAssetToWire(version.asset),
          })),
        }
      : {}),
    layers: map.layers.map((layer) =>
      isTileLayer(layer) ? { ...layer, cells: grids[index++]! } : layer,
    ),
  }
}
