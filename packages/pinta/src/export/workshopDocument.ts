/** Reader A transport. The active legacy writer and its declared cloud version remain independent. */
import type { PintaMemoryAsset, PintaWorkshopAsset } from '../core/assetMemory'
import { utf8ByteLength } from '../core/jsonBytes'
import type { WorkshopProjectedMap } from '../core/projectedDocument'
import { type AutomapBook, readAutomapBook } from '../tiles/automapping/book'
import { checkAutomapLayers } from '../tiles/automapping/engine'
import { isPintaAuthoredMap, type PintaAuthoredMap } from '../tiles/automapping/model'
import {
  automapDocumentEnvelope,
  decodeAutomapGallery,
  encodeAutomapBodies,
  encodeAutomapGallery,
  type ProjectedEntryCodec,
  readExactAutomapBodies,
} from '../tiles/automapping/native'
import type { AuthorMap } from '../tiles/mapCellEdits'
import { assetToJson } from './assetJson'
import {
  galleryToPintaJson,
  importPintaJson,
  MAX_BACKUP_FILE_BYTES,
  pintaBackupFromEncoded,
  pintaEncodedBackupByteLength,
} from './projectJson'
import { decodeRegionGalleryBackup, encodeRegionGalleryBackup } from './regionBackup'
import { decodeWorkshopProjectedMap, encodeWorkshopProjectedMap } from './workshopProjection'

export {
  isLegacyWorkshopAsset,
  isWorkshopProjectedMap,
  isWorkshopRegion,
  pintaWorkshopBody,
} from '../core/workshopAsset'

import {
  isLegacyWorkshopAsset,
  isWorkshopProjectedMap,
  pintaWorkshopBody,
} from '../core/workshopAsset'
export function attachWorkshopBook(asset: AuthorMap, book: AutomapBook): PintaAuthoredMap | null {
  if (checkAutomapLayers(asset, book)) return null
  return 'origin' in asset
    ? { ...asset, schema: 9, automapping: book }
    : { ...asset, schema: 9, automapping: book }
}

/** Both native-9 variants: a map with a rulebook, or a projected map with or without one. */
export type WorkshopNativeMap = PintaAuthoredMap | WorkshopProjectedMap
export function isWorkshopNativeMap(asset: PintaWorkshopAsset): asset is WorkshopNativeMap {
  return isWorkshopProjectedMap(asset) || isPintaAuthoredMap(asset)
}

const projectedEntries: ProjectedEntryCodec = {
  encode: encodeWorkshopProjectedMap,
  decode: decodeWorkshopProjectedMap,
}

/**
 * The single native-9 item policy. The projected envelope is the only one with `capability`
 * (five fields, or six with its book); the rulebook envelope has exactly five fields and a book.
 * Every reader of one native-9 item (one-item document and causal manifest) goes here; the
 * gallery reader places the same projected codec.
 */
export function readWorkshopNativeItem(raw: unknown): WorkshopNativeMap | null {
  return raw && typeof raw === 'object' && Object.hasOwn(raw, 'capability')
    ? decodeWorkshopProjectedMap(raw)
    : readWorkshopBookEnvelope(raw)
}
/** The exact envelope `readWorkshopNativeItem` reads back, or `null` when it cannot be written. */
export function encodeWorkshopNativeItem(asset: WorkshopNativeMap): object | null {
  if (isWorkshopProjectedMap(asset)) return encodeWorkshopProjectedMap(asset)
  const book = readAutomapBook(JSON.stringify(asset.automapping)),
    body = pintaWorkshopBody(asset)
  if (!book || !attachWorkshopBook(body, book)) return null
  const encoded = encodeAutomapBodies([body])
  if (!encoded || !readExactAutomapBodies(encoded)) return null
  return automapDocumentEnvelope(encoded, new Map([[asset.id, book]])).assets[0] ?? null
}

export async function pintaWorkshopBackup(
  assets: readonly PintaWorkshopAsset[],
): Promise<string | null> {
  const books = new Map<string, AutomapBook>()
  const bodies: PintaWorkshopAsset[] = []
  for (const asset of assets) {
    if (isWorkshopProjectedMap(asset)) {
      bodies.push(asset)
      continue
    }
    if (isPintaAuthoredMap(asset)) books.set(asset.id, asset.automapping)
    bodies.push(pintaWorkshopBody(asset))
  }
  if (books.size || bodies.some(isWorkshopProjectedMap))
    return encodeAutomapGallery({ assets: bodies, books }, projectedEntries)
  const plain = assets.filter((asset): asset is PintaMemoryAsset => !isWorkshopProjectedMap(asset))
  if (plain.every(isLegacyWorkshopAsset)) return galleryToPintaJson(plain)
  return encodeRegionGalleryBackup(plain)?.text ?? null
}

function envelopeVersion(text: string): unknown {
  if (text.length > MAX_BACKUP_FILE_BYTES || utf8ByteLength(text) > MAX_BACKUP_FILE_BYTES)
    return null
  try {
    return JSON.parse(text)?.version
  } catch {
    return null
  }
}
export async function readPintaWorkshopBackup(
  text: string,
): Promise<{ assets: PintaWorkshopAsset[]; warnings: string[] }> {
  const version = envelopeVersion(text)
  if (version === 8) return decodeRegionGalleryBackup(text)
  if (version !== 9) return importPintaJson(text)
  const document = await decodeAutomapGallery(text, projectedEntries)
  const refused = {
    assets: [],
    warnings: ['O mapa e suas regras não puderam ser validados por inteiro.'],
  }
  if (!document) return refused
  const assets: PintaWorkshopAsset[] = []
  for (const source of document.assets) {
    const book = document.books.get(source.id)
    if (!book) {
      assets.push(source)
      continue
    }
    if (source.kind !== 'tilemap' || isWorkshopProjectedMap(source)) return refused
    const asset = attachWorkshopBook(source, book)
    if (!asset) return refused
    assets.push(asset)
  }
  return { assets, warnings: [] }
}

/** One exact ID in a causal shadow. A remote sheet may be a separate revision in the same group;
 * validating its content hash belongs to the closure, not this individual envelope. */
export function pintaWorkshopAssetToJson(asset: PintaWorkshopAsset): string | null {
  if (isWorkshopNativeMap(asset)) {
    const item = encodeWorkshopNativeItem(asset)
    return item && pintaEncodedBackupByteLength([item], 9) <= MAX_BACKUP_FILE_BYTES
      ? pintaBackupFromEncoded([item], 9)
      : null
  }
  if (isLegacyWorkshopAsset(asset)) return assetToJson(asset)
  return encodeRegionGalleryBackup([asset])?.text ?? null
}
export function pintaWorkshopAssetFromJson(text: string): PintaWorkshopAsset | null {
  const version = envelopeVersion(text)
  if (version === 8) {
    const doc = decodeRegionGalleryBackup(text)
    return !doc.warnings.length && doc.assets.length === 1 ? doc.assets[0]! : null
  }
  if (version !== 9) {
    const doc = importPintaJson(text)
    return doc.warnings.length === 0 && doc.assets.length === 1 ? doc.assets[0]! : null
  }
  try {
    const doc = JSON.parse(text),
      record = doc.assets?.[0]
    return doc.format === 'pinta-gallery' &&
      Object.keys(doc).length === 3 &&
      Array.isArray(doc.assets) &&
      doc.assets.length === 1
      ? readWorkshopNativeItem(record)
      : null
  } catch {
    return null
  }
}

/** Decode a single native rulebook and its original, exactly encoded map body. */
export function readWorkshopBookEnvelope(raw: unknown): PintaAuthoredMap | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('kind' in raw) ||
    raw.kind !== 'tilemap' ||
    !('schema' in raw) ||
    raw.schema !== 9 ||
    !('map' in raw) ||
    !raw.map ||
    typeof raw.map !== 'object' ||
    !('id' in raw) ||
    !('id' in raw.map) ||
    raw.id !== raw.map.id ||
    Object.keys(raw).length !== 5 ||
    !('book' in raw)
  )
    return null
  const book = readAutomapBook(JSON.stringify(raw.book))
  if (!book) return null
  const body = readExactAutomapBodies([raw.map])?.[0]
  return body?.kind === 'tilemap' ? attachWorkshopBook(body, book) : null
}

/** `missing-dependency`: a sheet, drawing or door target is not in the gallery. `unwritable`:
 * everything is there, but the editable file could not be assembled (size or invalid data). */
export type WorkshopBundleResult =
  | { ok: true; json: string }
  | { ok: false; reason: 'missing-dependency' | 'unwritable' }

export async function workshopAssetBundleToJson(
  asset: PintaWorkshopAsset,
  catalog: readonly PintaWorkshopAsset[],
): Promise<WorkshopBundleResult> {
  const { collectAssetBundle } = await import('./assetJson')
  const byId = new Map(catalog.map((item) => [item.id, item]))
  byId.set(asset.id, asset)
  const graph = collectAssetBundle(asset, byId, new Map())
  if (!graph) return { ok: false, reason: 'missing-dependency' }
  const json = await pintaWorkshopBackup(graph)
  return json ? { ok: true, json } : { ok: false, reason: 'unwritable' }
}
