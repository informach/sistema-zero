import type { PintaMemoryAsset } from '../../core/assetMemory'
import { utf8ByteLength } from '../../core/jsonBytes'
import { REGION_METADATA_BUDGET } from '../../core/mapDocumentBoundary'
import { isTileLayer, isTilesetKind, tileLayerTilesetId } from '../../core/project'
import { collectAssetBundle } from '../../export/assetJson'
import {
  encodePintaBackupAsset,
  MAX_BACKUP_FILE_BYTES,
  pintaBackupFromEncoded,
  pintaEncodedBackupByteLength,
} from '../../export/projectJson'
import { decodeRegionGalleryBackup, encodeRegionGalleryBackup } from '../../export/regionBackup'
import { planImport } from '../../state/importPlan'
import type { AuthorMap } from '../mapCellEdits'
import { type AutomapBook, automapSheetIdentity, readAutomapBook, type SheetIdentity } from './book'
import { checkAutomapBindings } from './engine'

/** Native 9 is private until every durable writer/reader can preserve an authored rulebook. */
export interface AutomapGallery {
  assets: PintaMemoryAsset[]
  books: ReadonlyMap<string, AutomapBook>
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
export async function automapSheetIndex(map: AuthorMap, assets: readonly PintaMemoryAsset[]) {
  const gallery = new Map(assets.map((item) => [item.id, item]))
  for (const version of map.resources ?? []) gallery.set(version.asset.id, version.asset)
  const sheets = new Map<string, SheetIdentity>()
  for (const layer of map.layers) {
    if (!isTileLayer(layer)) continue
    const id = tileLayerTilesetId(map, layer),
      asset = gallery.get(id)
    if (!sheets.has(id) && asset && isTilesetKind(asset))
      sheets.set(id, await automapSheetIdentity(asset))
  }
  return sheets
}
async function validGallery({ assets, books }: AutomapGallery) {
  const byId = new Map(assets.map((item) => [item.id, item]))
  if (!books.size || byId.size !== assets.length) return false
  const dependencies = new Map<string, readonly string[] | null>()
  for (const [id, book] of books) {
    const map = byId.get(id)
    if (
      map?.kind !== 'tilemap' ||
      !collectAssetBundle(map, byId, dependencies) ||
      !readAutomapBook(JSON.stringify(book)) ||
      checkAutomapBindings(map, book, await automapSheetIndex(map, assets))
    )
      return false
  }
  return true
}
function encodeBase(assets: readonly PintaMemoryAsset[]) {
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
function sameEncodedValue(a: unknown, b: unknown, depth = 0): boolean {
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
function readExactBase(raw: readonly unknown[]) {
  const base = decodeRegionGalleryBackup(
    JSON.stringify({ format: 'pinta-gallery', version: 8, assets: raw }),
  )
  if (base.warnings.length) return null
  const checked = encodeBase(base.assets)
  if (
    !checked ||
    checked.length !== raw.length ||
    checked.some((item, i) => !sameEncodedValue(item, raw[i]))
  )
    return null
  return base.assets
}
export async function encodeAutomapGallery(gallery: AutomapGallery): Promise<string | null> {
  try {
    if (!(await validGallery(gallery))) return null
    const encoded = encodeBase(gallery.assets)
    if (!encoded || !readExactBase(encoded)) return null
    const doc = automapDocumentEnvelope(encoded, gallery.books)
    return pintaEncodedBackupByteLength(doc.assets, 9) <= MAX_BACKUP_FILE_BYTES
      ? pintaBackupFromEncoded(doc.assets, 9)
      : null
  } catch {
    return null
  }
}
export async function decodeAutomapGallery(text: string): Promise<AutomapGallery | null> {
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
    for (const asset of doc.assets) {
      if (asset?.schema !== 9) {
        raw.push(asset)
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
    const assets = readExactBase(raw)
    if (!assets) return null
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

/** Import into the existing gallery as new objects. Use the same graph, ID and name mapping as
 * gallery backup restoration, including doors, nested resources and object/animation references.
 * A failed check never publishes a partial collection or guesses which tile a slot refers to. */
export async function importAutomapCopy(text: string, destination: AutomapGallery) {
  const source = await decodeAutomapGallery(text)
  if (!source) return null
  const sheets = source.assets.filter(isTilesetKind)
  const sorted = [...sheets, ...source.assets.filter((asset) => !isTilesetKind(asset))]
  const plan = planImport(
    sorted,
    new Set(sheets.map((sheet) => sheet.id)),
    new Set(destination.assets.map((asset) => asset.name)),
  )
  if (plan.skipped || plan.error || plan.idMap.size !== source.assets.length) return null
  const restored = plan.pairs.map((pair) => pair.restored)
  const assets = [...destination.assets, ...restored]
  const restoredById = new Map(restored.map((asset) => [asset.id, asset]))
  const books = new Map(destination.books)
  for (const map of source.assets) {
    const book = source.books.get(map.id)
    if (!book) continue
    const id = plan.idMap.get(map.id),
      copy = id && restoredById.get(id)
    if (
      map.kind !== 'tilemap' ||
      !copy ||
      copy.kind !== 'tilemap' ||
      copy.layers.length !== map.layers.length
    )
      return null
    const index = await automapSheetIndex(copy, assets)
    const layers = new Map(map.layers.map((layer, i) => [layer.id, copy.layers[i]!]))
    const next = structuredClone(book)
    for (const rule of next.rules)
      for (const planes of [rule.input, ...rule.outputs])
        for (const plane of planes) {
          const layer = layers.get(plane.layer)
          if (!layer || !isTileLayer(layer)) return null
          const sheet = tileLayerTilesetId(copy, layer),
            identity = index.get(sheet)
          if (!identity) return null
          // Source bindings were checked by decode. The trusted import plan cloned the ordered
          // slots exactly, including legitimate changes to typed references inside tile metadata.
          plane.layer = layer.id
          plane.sheet = sheet
          plane.sha256 = identity.sha256
        }
    books.set(copy.id, next)
  }
  const gallery = { assets, books }
  return (await validGallery(gallery)) ? { gallery, idMap: plan.idMap } : null
}
