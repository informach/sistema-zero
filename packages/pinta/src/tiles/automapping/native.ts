import {
  isWorkshopProjectedMap,
  type PintaMemoryAsset,
  type PintaWorkshopAsset,
} from '../../core/assetMemory'
import { utf8ByteLength } from '../../core/jsonBytes'
import { REGION_METADATA_BUDGET } from '../../core/mapDocumentBoundary'
import {
  isTileLayerGraph,
  isTilesetKind,
  type MapGraph,
  tileLayerTilesetId,
} from '../../core/project'
import type { WorkshopProjectedMap } from '../../core/projectedDocument'
import { collectAssetBundle } from '../../export/assetJson'
import {
  encodePintaBackupAsset,
  MAX_BACKUP_FILE_BYTES,
  pintaBackupFromEncoded,
  pintaEncodedBackupByteLength,
} from '../../export/projectJson'
import {
  admitsRegionBackupBuffers,
  decodeRegionGalleryBackup,
  encodeRegionGalleryBackup,
} from '../../export/regionBackup'
import { type AutomapBook, automapSheetIdentity, readAutomapBook, type SheetIdentity } from './book'
import { checkAutomapLayers } from './engine'

/** Native 9 is private until every durable writer/reader can preserve an authored rulebook.
 * `books` holds the rulebooks of non-projected maps; a projected map carries its own. */
export interface AutomapGallery<Asset extends PintaWorkshopAsset = PintaMemoryAsset> {
  assets: Asset[]
  books: ReadonlyMap<string, AutomapBook>
}
/** The projected envelope belongs to the workshop document; the gallery only places it. */
export interface ProjectedEntryCodec {
  encode(asset: WorkshopProjectedMap): { map: unknown } | null
  decode(raw: unknown): WorkshopProjectedMap | null
}
export function automapDocumentEnvelope<T extends { id?: unknown }>(
  assets: readonly T[],
  books: ReadonlyMap<string, AutomapBook>,
) {
  return {
    format: 'pinta-gallery',
    version: 9,
    assets: assets.map((map) => {
      const book = books.get(String(map.id))
      return book ? { kind: 'tilemap', schema: 9, id: map.id, map, book } : map
    }),
  }
}
export async function automapSheetIndex(map: MapGraph, assets: readonly PintaWorkshopAsset[]) {
  const gallery = new Map<string, PintaWorkshopAsset>(assets.map((item) => [item.id, item]))
  for (const version of map.resources ?? []) gallery.set(version.asset.id, version.asset)
  const sheets = new Map<string, SheetIdentity>()
  for (const layer of map.layers) {
    if (!isTileLayerGraph(layer)) continue
    const id = tileLayerTilesetId(map, layer),
      asset = gallery.get(id)
    if (!sheets.has(id) && asset && isTilesetKind(asset))
      sheets.set(id, await automapSheetIdentity(asset))
  }
  return sheets
}
/** Structure and IDs, as storage checks them. A repainted sheet leaves a book out of date
 * without making it invalid: one such map must not refuse the whole gallery backup. */
export async function validGallery({ assets, books }: AutomapGallery<PintaWorkshopAsset>) {
  const byId = new Map<string, PintaWorkshopAsset>(assets.map((item) => [item.id, item]))
  const projected = assets.filter(isWorkshopProjectedMap)
  if ((!books.size && !projected.length) || byId.size !== assets.length) return false
  const dependencies = new Map<string, readonly string[] | null>()
  for (const [id, book] of books) {
    const map = byId.get(id)
    if (
      map?.kind !== 'tilemap' ||
      isWorkshopProjectedMap(map) ||
      !collectAssetBundle(map, byId, dependencies) ||
      !readAutomapBook(JSON.stringify(book)) ||
      checkAutomapLayers(map, book)
    )
      return false
  }
  // A projected book was bound to its layers by its own codec; its sheets travel along, too.
  for (const map of projected)
    if (map.automapping && !collectAssetBundle(map, byId, dependencies)) return false
  return true
}
export function encodeAutomapBodies(assets: readonly PintaMemoryAsset[]) {
  const regional = assets.some(
    (a) => (a.kind === 'tilemap' || a.kind === 'map-set') && a.schema === 8,
  )
  let encoded: Record<string, unknown>[]
  if (regional) {
    const base = encodeRegionGalleryBackup(assets)
    if (!base) return null
    encoded = JSON.parse(base.text).assets
  } else {
    encoded = assets.map(
      (asset) =>
        encodePintaBackupAsset(asset as Parameters<typeof encodePintaBackupAsset>[0]) as Record<
          string,
          unknown
        >,
    )
  }
  return encoded
}
export function sameEncodedValue(a: unknown, b: unknown, depth = 0): boolean {
  if (a === b) return true
  if (
    !a ||
    !b ||
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    depth > REGION_METADATA_BUDGET.maxDepth
  )
    return false
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, i) => sameEncodedValue(item, b[i], depth + 1))
    )
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>
  const keys = Object.keys(left).filter((key) => left[key] !== undefined)
  return (
    keys.length === Object.keys(right).filter((key) => right[key] !== undefined).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && sameEncodedValue(left[key], right[key], depth + 1),
    )
  )
}
/** Some legacy readers normalize names and omit unknown fields. A native-9 snapshot must
 * survive that boundary intact, including the meaning of name-bound doors in older maps. */
export function readExactAutomapBodies(raw: readonly unknown[]) {
  const base = decodeRegionGalleryBackup(
    JSON.stringify({ format: 'pinta-gallery', version: 8, assets: raw }),
  )
  if (base.warnings.length) return null
  const checked = encodeAutomapBodies(base.assets)
  if (
    !checked ||
    checked.length !== raw.length ||
    checked.some((item, i) => !sameEncodedValue(item, raw[i]))
  )
    return null
  return base.assets
}
export async function encodeAutomapGallery(gallery: AutomapGallery): Promise<string | null>
export async function encodeAutomapGallery(
  gallery: AutomapGallery<PintaWorkshopAsset>,
  projection: ProjectedEntryCodec,
): Promise<string | null>
export async function encodeAutomapGallery(
  gallery: AutomapGallery<PintaWorkshopAsset>,
  projection?: ProjectedEntryCodec,
): Promise<string | null> {
  try {
    if (!(await validGallery(gallery))) return null
    const plain = gallery.assets.filter(
      (asset): asset is PintaMemoryAsset => !isWorkshopProjectedMap(asset),
    )
    const encoded = encodeAutomapBodies(plain)
    if (!encoded || !readExactAutomapBodies(encoded)) return null
    const wrapped = automapDocumentEnvelope(encoded, gallery.books).assets
    const entries: unknown[] = []
    const bodies: unknown[] = [...encoded]
    let next = 0
    for (const asset of gallery.assets) {
      if (!isWorkshopProjectedMap(asset)) {
        entries.push(wrapped[next++])
        continue
      }
      const entry = projection?.encode(asset)
      if (!entry) return null
      entries.push(entry)
      bodies.push(entry.map)
    }
    // One decoded-buffer budget for the whole file, plain and projected bodies together.
    if (!admitsRegionBackupBuffers(bodies)) return null
    return pintaEncodedBackupByteLength(entries, 9) <= MAX_BACKUP_FILE_BYTES
      ? pintaBackupFromEncoded(entries, 9)
      : null
  } catch {
    return null
  }
}
export async function decodeAutomapGallery(text: string): Promise<AutomapGallery | null>
export async function decodeAutomapGallery(
  text: string,
  projection: ProjectedEntryCodec,
): Promise<AutomapGallery<PintaWorkshopAsset> | null>
export async function decodeAutomapGallery(
  text: string,
  projection?: ProjectedEntryCodec,
): Promise<AutomapGallery<PintaWorkshopAsset> | null> {
  if (text.length > MAX_BACKUP_FILE_BYTES || utf8ByteLength(text) > MAX_BACKUP_FILE_BYTES)
    return null
  try {
    const doc = JSON.parse(text)
    if (
      doc?.format !== 'pinta-gallery' ||
      doc.version !== 9 ||
      Object.keys(doc).length !== 3 ||
      !Array.isArray(doc.assets)
    )
      return null
    const books = new Map<string, AutomapBook>()
    const raw: unknown[] = []
    const projected: { index: number; entry: { map?: unknown } }[] = []
    for (const [index, asset] of doc.assets.entries()) {
      if (asset?.schema !== 9) {
        raw.push(asset)
        continue
      }
      // The projected envelope is the only native-9 item with `capability`; its codec decides.
      if (Object.hasOwn(asset, 'capability')) {
        if (!projection) return null
        projected.push({ index, entry: asset })
        continue
      }
      if (
        asset.kind !== 'tilemap' ||
        Object.keys(asset).length !== 5 ||
        !Object.hasOwn(asset, 'book') ||
        asset.map?.kind !== 'tilemap' ||
        asset.id !== asset.map.id ||
        books.has(asset.id) ||
        asset.map.schema === 9
      )
        return null
      const book = readAutomapBook(JSON.stringify(asset.book))
      if (!book) return null
      books.set(asset.id, book)
      raw.push(asset.map)
    }
    // Every body, plain or projected, is admitted against one budget before any decoding.
    if (!admitsRegionBackupBuffers([...raw, ...projected.map(({ entry }) => entry.map)]))
      return null
    const plain = readExactAutomapBodies(raw)
    if (!plain) return null
    const assets: PintaWorkshopAsset[] = [...plain]
    for (const { index, entry } of projected) {
      const map = projection?.decode(entry)
      if (!map) return null
      assets.splice(index, 0, map)
    }
    const result = { assets, books }
    return (await validGallery(result)) ? result : null
  } catch {
    return null
  }
}

export async function copyAutomapDocument(
  gallery: AutomapGallery,
  id: string,
): Promise<string | null> {
  const byId = new Map(gallery.assets.map((asset) => [asset.id, asset]))
  const map = byId.get(id)
  if (!map || !gallery.books.has(id)) return null
  const assets = collectAssetBundle(map, byId, new Map())
  if (!assets) return null
  const books = new Map<string, AutomapBook>()
  for (const item of assets) {
    const book = gallery.books.get(item.id)
    if (book) books.set(item.id, book)
  }
  return encodeAutomapGallery({ assets, books })
}

/** Any map with a book, rulebook or projected: plane layers and sheets follow the copied IDs. */
export async function rebindCopiedAutomapBook(
  map: MapGraph,
  copy: MapGraph,
  book: AutomapBook,
  before: readonly PintaWorkshopAsset[],
  assets: readonly PintaWorkshopAsset[],
): Promise<AutomapBook | null> {
  if (map.layers.length !== copy.layers.length || checkAutomapLayers(map, book)) return null
  const original = await automapSheetIndex(map, before)
  const index = await automapSheetIndex(copy, assets)
  const layers = new Map(map.layers.map((layer, i) => [layer.id, copy.layers[i]!]))
  const next = structuredClone(book)
  for (const rule of next.rules)
    for (const planes of [rule.input, ...rule.outputs])
      for (const plane of planes) {
        const layer = layers.get(plane.layer)
        if (!layer || !isTileLayerGraph(layer)) return null
        const sheet = tileLayerTilesetId(copy, layer),
          identity = index.get(sheet)
        if (!identity) return null
        // The trusted import plan cloned the ordered slots exactly, including legitimate changes
        // to typed references inside tile metadata, so an up-to-date plane follows the copied
        // sheet. An out-of-date plane keeps its hash: the editor still warns about the copy.
        const current = original.get(plane.sheet)?.sha256 === plane.sha256
        plane.layer = layer.id
        plane.sheet = sheet
        if (current) plane.sha256 = identity.sha256
      }
  return checkAutomapLayers(copy, next) ? null : next
}
