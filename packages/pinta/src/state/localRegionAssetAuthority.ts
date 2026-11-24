import { pintaValuesEqual } from '../core/assetEquality'
import {
  isWorkshopProjectedMap,
  type PintaMemoryAsset,
  type PintaWorkshopAsset,
} from '../core/assetMemory'
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

/** A physical-3 region. The projected map also has `origin`, but it is not one. */
export function isLocalRegionAsset(
  asset: PintaWorkshopAsset,
): asset is RegionTilemapAsset | RegionMapSetAsset {
  return (
    (asset.kind === 'tilemap' && 'origin' in asset && !isWorkshopProjectedMap(asset)) ||
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

export function matchesLocalRegionMirror(
  raw: unknown,
  id: string,
  revision: string,
  capability = 8,
): boolean {
  return Boolean(
    raw &&
      typeof raw === 'object' &&
      Reflect.ownKeys(raw).length === 5 &&
      'kind' in raw &&
      raw.kind === 'pinta-local-mirror' &&
      'version' in raw &&
      raw.version === 1 &&
      'capability' in raw &&
      raw.capability === capability &&
      'id' in raw &&
      raw.id === id &&
      'revision' in raw &&
      raw.revision === revision,
  )
}

interface RegionAuthorityPolicy<Asset extends PintaWorkshopAsset> {
  maxSchema: number
  sanitize(raw: unknown): Asset | null
  stamp(asset: Asset): Asset
  schema(asset: Asset): number
  /** Stored behind a compact mirror, so that older tabs never read it as a legacy drawing. */
  compact(asset: Asset): boolean
  size(sizing: RegionBackupSizeCache, assets: readonly Asset[]): number
}

/** Native-9 workshop policy over the same authority; it also keeps the projected map. */
export interface WorkshopRegionPolicy {
  sanitize(raw: unknown): PintaWorkshopAsset | null
  stamp(asset: PintaWorkshopAsset): PintaWorkshopAsset
  schema(asset: PintaWorkshopAsset): number
  size(sizing: RegionBackupSizeCache, assets: readonly PintaWorkshopAsset[]): number
}

function regionAuthority<Asset extends PintaWorkshopAsset>(policy: RegionAuthorityPolicy<Asset>) {
  const { sanitize, schema, compact } = policy
  return createLocalAssetAuthority<Asset>({
    maxSchema: policy.maxSchema,
    sanitize,
    stamp: policy.stamp,
    schema,
    mirror(asset, revision) {
      return compact(asset)
        ? {
            kind: 'pinta-local-mirror',
            version: 1,
            capability: schema(asset),
            id: asset.id,
            revision,
          }
        : asset
    },
    readMirror(raw, id, doc) {
      if (raw && typeof raw === 'object' && 'kind' in raw && raw.kind === 'pinta-local-mirror') {
        if (
          !doc?.asset ||
          !compact(doc.asset) ||
          !matchesLocalRegionMirror(raw, id, doc.revision, schema(doc.asset))
        )
          throw new PintaLocalStorageError(
            'Não consegui conferir a referência do cenário guardado. Seus dados foram mantidos.',
          )
        return doc.asset
      }
      const asset = sanitize(raw)
      return asset?.id === id ? asset : null
    },
    checkBudget(before, after, bytes) {
      // Persistence accepts mutable caller revisions, unlike the editor's immutable snapshots.
      // Numerical identity summaries are shared within this transaction, never across writes.
      const sizing = new RegionBackupSizeCache()
      const size = (assets: readonly Asset[]) => policy.size(sizing, assets)
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

/** Internal only: the public persistence still selects the native-7 authority. */
export function createLocalRegionAssetAuthority(): ReturnType<
  typeof regionAuthority<PintaMemoryAsset>
>
export function createLocalRegionAssetAuthority(
  authored: WorkshopRegionPolicy,
): ReturnType<typeof regionAuthority<PintaWorkshopAsset>>
export function createLocalRegionAssetAuthority(authored?: WorkshopRegionPolicy) {
  if (authored) {
    const native = (asset: PintaWorkshopAsset) => {
      const schema = authored.schema(asset)
      return schema === 8 || schema === 9
    }
    return regionAuthority<PintaWorkshopAsset>({ maxSchema: 9, compact: native, ...authored })
  }
  return regionAuthority<PintaMemoryAsset>({
    maxSchema: 8,
    sanitize: sanitizeLocalRegionAsset,
    stamp: stampLocalRegionAsset,
    schema: (asset) => (isLocalRegionAsset(asset) ? 8 : pintaAssetSchema(asset)),
    compact: isLocalRegionAsset,
    size: (sizing, assets) =>
      assets.some(isLocalRegionAsset)
        ? sizing.byteLength(assets)
        : galleryBackupByteLength(
            assets.filter((asset): asset is PintaAsset => !isLocalRegionAsset(asset)),
          ),
  })
}
