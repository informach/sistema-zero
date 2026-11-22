import type { PintaMemoryAsset } from '../core/assetMemory'
import {
  decodeRegionGalleryBackup,
  encodeRegionGalleryBackup,
  REGION_BACKUP_VERSION,
} from '../export/regionBackup'
import {
  createLocalRegionAssetAuthority,
  isLocalRegionAsset,
  stampLocalRegionAsset,
} from './localRegionAssetAuthority'
import { readRegionCaptureSnapshot } from './localRegionCapture'
import { localRegionStorageCodec } from './localRegionChunkStorage'
import {
  captureLocalPintaAssetForImage,
  createLocalPintaPersistence,
  decodeLegacyLocalCandidate,
  encodeLegacyLocalCandidate,
  type LocalPersistenceFormat,
  type PintaCaptureOptions,
  type PintaCausalLocalPort,
  type PintaPersistence,
} from './persistence'

function regionPersistenceFormat(): LocalPersistenceFormat<PintaMemoryAsset> {
  return {
    authority: createLocalRegionAssetAuthority(),
    stamp: stampLocalRegionAsset,
    codec: localRegionStorageCodec,
    strictCapture: true,
    encodeCandidate(asset) {
      if (!isLocalRegionAsset(asset)) return encodeLegacyLocalCandidate(asset)
      const encoded = encodeRegionGalleryBackup([asset])
      if (!encoded) throw Error('Não consegui guardar este mapa regional.')
      return { json: encoded.text, formatVersion: REGION_BACKUP_VERSION }
    },
    decodeCandidate(json) {
      const legacy = decodeLegacyLocalCandidate(json)
      if (legacy) return legacy
      const regional = decodeRegionGalleryBackup(json)
      return !regional.warnings.length && regional.assets.length === 1 ? regional.assets[0]! : null
    },
  }
}

/** Private opt-in; no host or public barrel selects the regional writer yet. */
export function createRegionPintaPersistence(
  options: { namespace?: string } = {},
): PintaPersistence<PintaMemoryAsset> & { causal: PintaCausalLocalPort<PintaMemoryAsset> } {
  return createLocalPintaPersistence(options, regionPersistenceFormat())
}

/** Internal structured capture; connected places are included unless explicitly disabled. */
export function captureRegionPintaAssetForImage(id: string, options: PintaCaptureOptions = {}) {
  return captureLocalPintaAssetForImage(
    id,
    { ...options, includeSceneMaps: options.includeSceneMaps ?? true },
    regionPersistenceFormat(),
    readRegionCaptureSnapshot,
  )
}
