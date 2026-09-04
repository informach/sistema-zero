/**
 * Backup da galeria inteira: o envelope `molda-gallery` v1 do "Baixar tudo" e
 * a leitura do "Trazer de volta". `importMoldaJson` NUNCA lança: devolve
 * `null` para arquivo ilegível e conta os registros que não passaram no
 * sanitize. Também aceita uma criação solta (JSON de um asset só).
 */
import type { MoldaAsset } from '../core/model'
import { isMoldaAssetLike } from '../core/model'
import { assetFromJson, assetToJson, type MoldaAssetJson } from './assetJson'
import { MOLDA_GALLERY_ZIP_ENTRY } from './backupFormat'

export { MAX_BACKUP_FILE_BYTES } from './backupFormat'

export const GALLERY_FORMAT = 'molda-gallery'
export const GALLERY_VERSION = 1
/** O mesmo nome dentro do ZIP do "Baixar tudo" (`backupFormat.ts`). */
export const GALLERY_FILE_NAME = MOLDA_GALLERY_ZIP_ENTRY

export interface MoldaGalleryJson {
  format: typeof GALLERY_FORMAT
  version: typeof GALLERY_VERSION
  exportedAt: number
  assets: MoldaAssetJson[]
}

export function galleryToJson(assets: readonly MoldaAsset[], now = Date.now()): MoldaGalleryJson {
  return {
    format: GALLERY_FORMAT,
    version: GALLERY_VERSION,
    exportedAt: now,
    assets: assets.map(assetToJson),
  }
}

export function galleryToJsonText(assets: readonly MoldaAsset[], now = Date.now()): string {
  return JSON.stringify(galleryToJson(assets, now))
}

export interface MoldaImportResult {
  assets: MoldaAsset[]
  /** Registros que não passaram no sanitize. */
  skipped: number
}

export function importMoldaJson(text: string): MoldaImportResult | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const record = parsed as Record<string, unknown>
  let rawAssets: unknown[]
  if (record.format === GALLERY_FORMAT) {
    if (record.version !== GALLERY_VERSION || !Array.isArray(record.assets)) return null
    rawAssets = record.assets
  } else if (isMoldaAssetLike(parsed)) {
    rawAssets = [parsed]
  } else {
    return null
  }
  const assets: MoldaAsset[] = []
  let skipped = 0
  for (const raw of rawAssets) {
    const asset = assetFromJson(raw)
    if (asset) assets.push(asset)
    else skipped += 1
  }
  return { assets, skipped }
}
