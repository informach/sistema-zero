import type { PintaMemoryAsset } from '../core/assetMemory'
import { createLocalRegionAssetAuthority, stampLocalRegionAsset } from './localRegionAssetAuthority'
import { localRegionStorageCodec } from './localRegionChunkStorage'
import { createLocalPintaPersistence, type PintaPersistence } from './persistence'

/** Private opt-in; no host or public barrel selects the regional writer yet. */
export function createRegionPintaPersistence(
  options: { namespace?: string } = {},
): PintaPersistence<PintaMemoryAsset> {
  return createLocalPintaPersistence(options, {
    authority: createLocalRegionAssetAuthority(),
    stamp: stampLocalRegionAsset,
    codec: localRegionStorageCodec,
  })
}
