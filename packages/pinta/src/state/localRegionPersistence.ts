import type { PintaMemoryAsset } from '../core/assetMemory'
import { createLocalRegionAssetAuthority, stampLocalRegionAsset } from './localRegionAssetAuthority'
import { localRegionStorageCodec } from './localRegionChunkStorage'
import {
  captureLocalPintaAssetForImage,
  createLocalPintaPersistence,
  type PintaCaptureOptions,
  type PintaPersistence,
} from './persistence'

function regionPersistenceFormat() {
  return {
    authority: createLocalRegionAssetAuthority(),
    stamp: stampLocalRegionAsset,
    codec: localRegionStorageCodec,
    strictCapture: true as const,
  }
}

/** Private opt-in; no host or public barrel selects the regional writer yet. */
export function createRegionPintaPersistence(
  options: { namespace?: string } = {},
): PintaPersistence<PintaMemoryAsset> {
  return createLocalPintaPersistence(options, regionPersistenceFormat())
}

/** Internal structured capture; connected places are included unless explicitly disabled. */
export function captureRegionPintaAssetForImage(id: string, options: PintaCaptureOptions = {}) {
  return captureLocalPintaAssetForImage(
    id,
    { ...options, includeSceneMaps: options.includeSceneMaps ?? true },
    regionPersistenceFormat(),
  )
}
