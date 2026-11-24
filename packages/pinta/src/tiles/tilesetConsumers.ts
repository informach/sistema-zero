import {
  type PintaAsset,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  tilemapOfAsset,
  tilemapUsesTileset,
} from '../core/project'
import { type TileIndexChange, type TilemapRemapFailure, tryRemapTilemapCells } from './tilesetOps'

type ConsumerAsset = PintaAsset | RegionTilemapAsset | RegionMapSetAsset
export type TilesetConsumersResult<Asset extends ConsumerAsset> =
  | { ok: true; before: Asset[]; after: Asset[] }
  | { ok: false; assetId: string; assetName: string; reason: TilemapRemapFailure }

/** Confirmed catalog plus the editor's pending linked revisions, in one undo entry. */
export function remapTilesetConsumers<Asset extends ConsumerAsset>(
  catalog: readonly Asset[],
  linked: readonly Asset[],
  tilesetId: string,
  change: TileIndexChange,
  now = Date.now(),
): TilesetConsumersResult<Asset> {
  const current = new Map<string, Asset>()
  for (const assets of [catalog, linked]) for (const asset of assets) current.set(asset.id, asset)
  const before: Asset[] = [],
    after: Asset[] = []
  for (const asset of current.values()) {
    const source = tilemapOfAsset(asset)
    if (!source || !tilemapUsesTileset(source, tilesetId)) continue
    const result = tryRemapTilemapCells(source, change, tilesetId)
    if (!result.ok) return { ...result, assetId: asset.id, assetName: asset.name }
    const map = result.map
    if (map === source) continue
    before.push(asset)
    after.push({ ...asset, ...(asset.kind === 'map-set' ? { map } : map), updatedAt: now })
  }
  return { ok: true, before, after }
}
