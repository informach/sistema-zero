/** Reader A transport. The active legacy writer and its declared cloud version remain independent. */
import type { PintaMemoryAsset } from '../core/assetMemory'
import { utf8ByteLength } from '../core/jsonBytes'
import {
  isTileLayer,
  PINTA_MAX_SCHEMA,
  type PintaAsset,
  tileLayerTilesetId,
  withPintaSchemaStamp,
} from '../core/project'
import { type AutomapBook, readAutomapBook } from '../tiles/automapping/book'
import { isPintaAuthoredMap, type PintaAuthoredMap } from '../tiles/automapping/model'
import {
  automapDocumentEnvelope,
  decodeAutomapGallery,
  encodeAutomapBodies,
  encodeAutomapGallery,
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

export function isWorkshopRegion(asset: PintaMemoryAsset): boolean {
  return (
    (asset.kind === 'tilemap' && 'origin' in asset) ||
    (asset.kind === 'map-set' && 'origin' in asset.map)
  )
}
export function isLegacyWorkshopAsset(asset: PintaMemoryAsset): asset is PintaAsset {
  return (
    !isWorkshopRegion(asset) && (!('schema' in asset) || (asset.schema ?? 0) <= PINTA_MAX_SCHEMA)
  )
}
export function pintaWorkshopBody(asset: PintaAuthoredMap): AuthorMap
export function pintaWorkshopBody(asset: PintaMemoryAsset): PintaMemoryAsset
export function pintaWorkshopBody(asset: PintaMemoryAsset): PintaMemoryAsset {
  if (!isPintaAuthoredMap(asset)) return asset
  if ('origin' in asset) {
    const { automapping: _book, schema: _schema, ...body } = asset
    return { ...body, schema: 8 }
  }
  const { automapping: _book, schema: _schema, ...body } = asset
  return withPintaSchemaStamp(body)
}
function attachBook(asset: AuthorMap, book: AutomapBook): PintaAuthoredMap | null {
  if (
    !book.rules.every((rule) =>
      [rule.input, ...rule.outputs].every((group) =>
        group.every((plane) => {
          const layer = asset.layers.find((layer) => layer.id === plane.layer)
          return !!layer && isTileLayer(layer) && tileLayerTilesetId(asset, layer) === plane.sheet
        }),
      ),
    )
  )
    return null
  return 'origin' in asset
    ? { ...asset, schema: 9, automapping: book }
    : { ...asset, schema: 9, automapping: book }
}

export async function pintaWorkshopBackup(
  assets: readonly PintaMemoryAsset[],
): Promise<string | null> {
  const books = new Map<string, AutomapBook>()
  for (const asset of assets) if (isPintaAuthoredMap(asset)) books.set(asset.id, asset.automapping)
  if (books.size) return encodeAutomapGallery({ assets: assets.map(pintaWorkshopBody), books })
  if (assets.every(isLegacyWorkshopAsset)) return galleryToPintaJson(assets)
  return encodeRegionGalleryBackup(assets)?.text ?? null
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
): Promise<{ assets: PintaMemoryAsset[]; warnings: string[] }> {
  const version = envelopeVersion(text)
  if (version === 8) return decodeRegionGalleryBackup(text)
  if (version !== 9) return importPintaJson(text)
  const document = await decodeAutomapGallery(text)
  const refused = {
    assets: [],
    warnings: ['O mapa e suas regras não puderam ser validados por inteiro.'],
  }
  if (!document) return refused
  const assets: PintaMemoryAsset[] = []
  for (const source of document.assets) {
    const book = document.books.get(source.id)
    if (!book) {
      assets.push(source)
      continue
    }
    if (source.kind !== 'tilemap') return refused
    const asset = attachBook(source, book)
    if (!asset) return refused
    assets.push(asset)
  }
  return { assets, warnings: [] }
}

/** One exact ID in a causal shadow. A remote sheet may be a separate revision in the same group;
 * validating its content hash belongs to the closure, not this individual envelope. */
export function pintaWorkshopAssetToJson(asset: PintaMemoryAsset): string | null {
  if (isLegacyWorkshopAsset(asset)) return assetToJson(asset)
  if (!isPintaAuthoredMap(asset)) return encodeRegionGalleryBackup([asset])?.text ?? null
  const book = readAutomapBook(JSON.stringify(asset.automapping)),
    body = pintaWorkshopBody(asset)
  if (!book || !attachBook(body, book)) return null
  const encoded = encodeAutomapBodies([body])
  if (!encoded || !readExactAutomapBodies(encoded)) return null
  const wrapper = automapDocumentEnvelope(encoded, new Map([[asset.id, book]]))
  return pintaEncodedBackupByteLength(wrapper.assets, 9) <= MAX_BACKUP_FILE_BYTES
    ? pintaBackupFromEncoded(wrapper.assets, 9)
    : null
}
export function pintaWorkshopAssetFromJson(text: string): PintaMemoryAsset | null {
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
    if (
      doc.format !== 'pinta-gallery' ||
      Object.keys(doc).length !== 3 ||
      !Array.isArray(doc.assets) ||
      doc.assets.length !== 1 ||
      record?.kind !== 'tilemap' ||
      record.schema !== 9 ||
      record.map?.kind !== 'tilemap' ||
      record.id !== record.map.id ||
      Object.keys(record).length !== 5 ||
      !Object.hasOwn(record, 'book')
    )
      return null
    const book = readAutomapBook(JSON.stringify(record.book))
    if (!book) return null
    const body = readExactAutomapBodies([record.map])?.[0]
    return body?.kind === 'tilemap' ? attachBook(body, book) : null
  } catch {
    return null
  }
}
