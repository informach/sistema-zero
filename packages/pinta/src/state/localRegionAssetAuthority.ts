import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { PintaLocalStorageError, PintaStorageBudgetError } from '../core/localStorageErrors'
import {
  type PintaAsset,
  pintaAssetSchema,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  sanitizePintaAsset,
  sanitizeRegionMapSetAsset,
  sanitizeRegionTilemapAsset,
  withPintaSchemaStamp,
} from '../core/project'
import { galleryBackupByteLength, MAX_BACKUP_FILE_BYTES } from '../export/projectJson'
import { RegionBackupSizeCache } from '../export/regionBackupSize'
import { createLocalAssetAuthority } from './localAssetAuthority'

export function isLocalRegionAsset(
  asset: PintaMemoryAsset,
): asset is RegionTilemapAsset | RegionMapSetAsset {
  return (
    (asset.kind === 'tilemap' && 'origin' in asset) ||
    (asset.kind === 'map-set' && 'origin' in asset.map)
  )
}

export function sanitizeLocalRegionAsset(raw: unknown): PintaMemoryAsset | null {
  if (!raw || typeof raw !== 'object') return null
  if (
    'kind' in raw &&
    raw.kind === 'tilemap' &&
    (('schema' in raw && raw.schema === 8) || 'origin' in raw)
  )
    return sanitizeRegionTilemapAsset(raw)
  if (
    'kind' in raw &&
    raw.kind === 'map-set' &&
    (('schema' in raw && raw.schema === 8) ||
      ('map' in raw && raw.map && typeof raw.map === 'object' && 'origin' in raw.map))
  )
    return sanitizeRegionMapSetAsset(raw)
  return sanitizePintaAsset(raw)
}

export function stampLocalRegionAsset(asset: PintaMemoryAsset): PintaMemoryAsset {
  if (!isLocalRegionAsset(asset)) return withPintaSchemaStamp(asset)
  if (!sanitizeLocalRegionAsset(asset))
    throw new PintaLocalStorageError(
      'Não consegui conferir o cenário completo. Seus dados foram mantidos.',
    )
  // Validation never replaces the causal RAM origin with a newly sanitized object.
  return asset
}

/** Internal only: the public persistence still selects the native-7 authority. */
export function createLocalRegionAssetAuthority() {
  return createLocalAssetAuthority<PintaMemoryAsset>({
    maxSchema: 8,
    sanitize: sanitizeLocalRegionAsset,
    stamp: stampLocalRegionAsset,
    schema: (asset) => (isLocalRegionAsset(asset) ? 8 : pintaAssetSchema(asset)),
    mirror(asset, revision) {
      return isLocalRegionAsset(asset)
        ? { kind: 'pinta-local-mirror', version: 1, capability: 8, id: asset.id, revision }
        : asset
    },
    readMirror(raw, id, doc) {
      if (raw && typeof raw === 'object' && 'kind' in raw && raw.kind === 'pinta-local-mirror') {
        if (
          Reflect.ownKeys(raw).length !== 5 ||
          !('version' in raw) ||
          raw.version !== 1 ||
          !('capability' in raw) ||
          raw.capability !== 8 ||
          !('id' in raw) ||
          raw.id !== id ||
          !('revision' in raw) ||
          raw.revision !== doc?.revision ||
          !doc?.asset ||
          !isLocalRegionAsset(doc.asset)
        )
          throw new PintaLocalStorageError(
            'Não consegui conferir a referência do cenário guardado. Seus dados foram mantidos.',
          )
        return doc.asset
      }
      const asset = sanitizeLocalRegionAsset(raw)
      return asset?.id === id ? asset : null
    },
    checkBudget(before, after, bytes) {
      // Persistence accepts mutable caller revisions, unlike the editor's immutable snapshots.
      // Numerical identity summaries are shared within this transaction, never across writes.
      const sizing = new RegionBackupSizeCache()
      const size = (assets: readonly PintaMemoryAsset[]) =>
        assets.some(isLocalRegionAsset)
          ? sizing.byteLength(assets)
          : galleryBackupByteLength(
              assets.filter((asset): asset is PintaAsset => !isLocalRegionAsset(asset)),
            )
      const projected = size(after) + (bytes?.after ?? 0)
      if (projected <= MAX_BACKUP_FILE_BYTES) return
      if (projected < size(before) + (bytes?.before ?? 0)) return
      // Capped sizing returns Infinity beyond a budget. Still permit freeing space,
      // provided every remaining document is exactly the unchanged prior revision.
      const originals = new Map(before.map((asset) => [asset.id, asset]))
      if (
        after.length < before.length &&
        (bytes?.after ?? 0) <= (bytes?.before ?? 0) &&
        new Set(after.map((asset) => asset.id)).size === after.length &&
        after.every((asset) => pintaValuesEqual(asset, originals.get(asset.id)))
      )
        return
      throw new PintaStorageBudgetError(projected)
    },
  })
}
