import type { PintaMemoryAsset } from '../core/assetMemory'
import { collectAssetBundle } from './assetJson'
import { encodeRegionGalleryBackup } from './regionBackup'

/** Private native-8 transport; the same dependency graph as legacy portable exports. */
export function regionAssetBundleToJson(
  asset: PintaMemoryAsset,
  galleryAssets: readonly PintaMemoryAsset[],
): string | null {
  const byId = new Map(galleryAssets.map((item) => [item.id, item]))
  byId.set(asset.id, asset)
  const bundle = collectAssetBundle(asset, byId, new Map())
  return bundle ? (encodeRegionGalleryBackup(bundle)?.text ?? null) : null
}
