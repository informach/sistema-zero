import { assetBytes } from './bytes'
import { MOLDA_LIMITS } from './limits'
import { isMoldaAssetKind, type MoldaAsset, type MoldaAssetKind } from './model'

/** Gallery metadata only. Never retain geometry, bitmap buffers or recovery data here. */
export interface MoldaAssetSummary {
  id: string
  name: string
  kind: MoldaAssetKind
  createdAt: number
  updatedAt: number
  bytes: number
  thumbDataUrl: string | null
}

export function summarizeAsset(asset: MoldaAsset): MoldaAssetSummary {
  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    bytes: assetBytes(asset),
    thumbDataUrl: asset.thumb ?? null,
  }
}

/** Payload estimate, not a browser heap measurement. The duplicated thumbnail counts too. */
export function summaryBytes(summary: MoldaAssetSummary): number {
  return 192 + 2 * (summary.id.length + summary.name.length + (summary.thumbDataUrl?.length ?? 0))
}

export function indexedAssetBytes(asset: MoldaAsset): number {
  const summary = summarizeAsset(asset)
  return summary.bytes + summaryBytes(summary)
}

export function readAssetSummary(raw: unknown, id: string): MoldaAssetSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Record<string, unknown>
  if (
    value.id !== id ||
    typeof value.name !== 'string' ||
    !value.name.length ||
    value.name.length > MOLDA_LIMITS.maxNameChars ||
    !isMoldaAssetKind(value.kind) ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt) ||
    typeof value.updatedAt !== 'number' ||
    !Number.isFinite(value.updatedAt) ||
    typeof value.bytes !== 'number' ||
    !Number.isSafeInteger(value.bytes) ||
    value.bytes < 0 ||
    (value.thumbDataUrl !== null &&
      (typeof value.thumbDataUrl !== 'string' ||
        value.thumbDataUrl.length > MOLDA_LIMITS.maxThumbChars ||
        !/^data:image\/(png|jpeg|webp);base64,/.test(value.thumbDataUrl)))
  )
    return null
  return {
    id,
    name: value.name,
    kind: value.kind,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    bytes: value.bytes,
    thumbDataUrl: value.thumbDataUrl,
  }
}
