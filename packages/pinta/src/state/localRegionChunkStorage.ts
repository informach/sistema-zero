import {
  PINTA_REGION_LIMITS,
  type PintaRegionCells,
  parsePintaRegionLayerLocations,
} from '@sistemazero/core/creations'
import { PintaLocalStorageError } from '../core/localStorageErrors'
import {
  isTileLayer,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  sanitizeRegionMapSetAsset,
  sanitizeRegionTilemapAsset,
} from '../core/project'
import { LOCAL_ASSET_PREFIX } from './localAssetAuthority'
import {
  LOCAL_CHUNK_PREFIX,
  type LocalStorageCodec,
  localDenseStorageCodec,
} from './localChunkStorage'

const STORAGE = 'pinta-regions-32-v1'
type Value = Record<string, unknown>
type RegionAsset = RegionTilemapAsset | RegionMapSetAsset
type ChunkLocation = { col: number; row: number; key: string }
const object = (raw: unknown): Value | null =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Value) : null
const mapOf = (asset: RegionAsset) => (asset.kind === 'map-set' ? asset.map : asset)
const replaceMap = (asset: RegionAsset, map: RegionTilemapAsset): RegionAsset =>
  asset.kind === 'map-set' ? { ...asset, map } : map
const grid = (chunks: PintaRegionCells['chunks']): PintaRegionCells => ({
  kind: 'regions',
  version: 1,
  side: 32,
  chunks,
})
function invalid(): never {
  throw new PintaLocalStorageError(
    'Não consegui conferir uma região guardada. Seus dados foram mantidos.',
  )
}
function segment(raw: string): string | null {
  try {
    return raw.length > 0 && raw.length <= 512 ? encodeURIComponent(raw) : null
  } catch {
    return null
  }
}
function keyOf(owner: string, layer: string, col: number, row: number): string | null {
  const a = segment(owner),
    b = segment(layer)
  return a !== null && b !== null ? `${LOCAL_CHUNK_PREFIX}${a}:${b}:${col}:${row}` : null
}
function sanitize(raw: unknown): RegionAsset | null {
  return object(raw)?.kind === 'map-set'
    ? sanitizeRegionMapSetAsset(raw)
    : sanitizeRegionTilemapAsset(raw)
}
function exact(raw: Value, fields: string[]): boolean {
  return (
    Reflect.ownKeys(raw).length === fields.length &&
    fields.every((field) => Object.hasOwn(raw, field))
  )
}
function envelope(key: string, raw: unknown): Value | null {
  const doc = object(raw)
  if (!key.startsWith(LOCAL_ASSET_PREFIX) || doc?.version !== 3 || doc.storage !== STORAGE)
    return null
  if (typeof doc.capability === 'number' && doc.capability > 8) return null
  if (
    doc.capability !== 8 ||
    typeof doc.revision !== 'string' ||
    !doc.revision ||
    !exact(doc, [
      'version',
      'storage',
      'capability',
      'revision',
      'asset',
      ...(Object.hasOwn(doc, 'isolation') ? ['isolation'] : []),
    ])
  )
    invalid()
  return doc
}

/** Validate metadata, the complete location budget and ownership before requesting buffers. */
export function prepareLocalRegionDocument(key: string, raw: unknown) {
  const doc = envelope(key, raw)
  if (!doc) return null
  const asset = object(doc.asset),
    map = asset?.kind === 'map-set' ? object(asset.map) : asset
  if (
    !asset ||
    !map ||
    key !== LOCAL_ASSET_PREFIX + asset.id ||
    !Array.isArray(map.layers) ||
    map.layers.length > PINTA_REGION_LIMITS.maxLayers
  )
    invalid()
  let count = 0
  const physical = map.layers.map((raw) => {
    const layer = object(raw)
    if (!layer) invalid()
    if (layer.kind === 'objects' || layer.kind === 'group') return null
    const cells = object(layer.cells)
    if (
      !cells ||
      !exact(cells, ['kind', 'version', 'side', 'chunks']) ||
      cells.kind !== 'regions' ||
      cells.version !== 1 ||
      cells.side !== 32 ||
      !Array.isArray(cells.chunks)
    )
      invalid()
    count += cells.chunks.length
    if (count > PINTA_REGION_LIMITS.maxChunks) invalid()
    return { layer, chunks: cells.chunks }
  })
  const emptyMap = {
    ...map,
    layers: map.layers.map((layer, index) =>
      physical[index] ? { ...layer, cells: grid([]) } : layer,
    ),
  }
  const empty = sanitize(asset.kind === 'map-set' ? { ...asset, map: emptyMap } : emptyMap)
  if (!empty) invalid()
  const canonicalMap = mapOf(empty)
  const descriptors = physical.flatMap((entry) =>
    entry
      ? [
          {
            kind: 'regions',
            version: 1,
            side: 32,
            chunks: entry.chunks.map((raw) => {
              const chunk = object(raw)
              if (!chunk || !exact(chunk, ['col', 'row', 'key'])) invalid()
              // Payload is an opaque key at this stage; the Core header reader never inspects cells.
              return { col: chunk.col, row: chunk.row, cells: chunk.key }
            }),
          },
        ]
      : [],
  )
  const locations = parsePintaRegionLayerLocations(descriptors, {
    ...canonicalMap.origin,
    cols: canonicalMap.cols,
    rows: canonicalMap.rows,
  })
  if (!locations) invalid()
  const entries = physical.filter((entry) => entry !== null)
  const keys: string[] = []
  for (const [index, entry] of entries.entries())
    for (const [position, location] of locations[index]!.entries()) {
      const stored = object(entry.chunks[position])!
      const expected = keyOf(empty.id, String(entry.layer.id), location.col, location.row)
      if (!expected || stored.key !== expected) invalid()
      keys.push(expected)
    }
  return { doc, empty, locations, keys, revision: doc.revision as string }
}

type PreparedRegionDocument = NonNullable<ReturnType<typeof prepareLocalRegionDocument>>

/** Only the viewport needs to look up a physical key by layer and coordinates. */
export function localRegionChunkDirectory(prepared: PreparedRegionDocument) {
  const result = new Map<string, ChunkLocation[]>()
  let layerIndex = 0
  let keyIndex = 0
  for (const layer of mapOf(prepared.empty).layers) {
    if (!isTileLayer(layer)) continue
    const locations = prepared.locations[layerIndex++]!
    result.set(
      layer.id,
      locations.map((location) => ({ ...location, key: prepared.keys[keyIndex++]! })),
    )
  }
  return result
}

/** A selection is private to a viewport. Ordinary document decoding always reads every chunk. */
export function decodeLocalRegionChunks(
  prepared: PreparedRegionDocument,
  records: ReadonlyMap<string, unknown>,
  selection?: ReadonlySet<string>,
): RegionAsset {
  const map = mapOf(prepared.empty)
  let layerIndex = 0
  let keyIndex = 0
  const layers = map.layers.map((layer) => {
    if (!isTileLayer(layer)) return layer
    const chunks: PintaRegionCells['chunks'] = []
    for (const location of prepared.locations[layerIndex++]!) {
      const key = prepared.keys[keyIndex++]!
      if (selection && !selection.has(key)) continue
      const cells = records.get(key)
      if (!(cells instanceof Int16Array) || cells.length !== 1024) invalid()
      chunks.push({ ...location, cells })
    }
    return { ...layer, cells: grid(chunks) }
  })
  const asset = sanitize(replaceMap(prepared.empty, { ...map, layers }))
  if (!asset) invalid()
  return asset
}

/** Internal opt-in policy; no public persistence or format advertisement selects it yet. */
export const localRegionStorageCodec: LocalStorageCodec = {
  keys(key, raw) {
    return prepareLocalRegionDocument(key, raw)?.keys ?? localDenseStorageCodec.keys(key, raw)
  },
  decode(key, raw, records) {
    const prepared = prepareLocalRegionDocument(key, raw)
    if (!prepared) return localDenseStorageCodec.decode(key, raw, records)
    const { storage: _storage, ...doc } = prepared.doc
    return { ...doc, version: 1, asset: decodeLocalRegionChunks(prepared, records) }
  },
  encode(key, raw, records) {
    const doc = object(raw),
      source = object(doc?.asset)
    if (!key.startsWith(LOCAL_ASSET_PREFIX) || doc?.version !== 1 || source?.schema !== 8)
      return localDenseStorageCodec.encode(key, raw, records)
    const asset = sanitize(source)
    if (
      !asset ||
      key !== LOCAL_ASSET_PREFIX + asset.id ||
      doc.capability !== 8 ||
      typeof doc.revision !== 'string' ||
      !doc.revision ||
      !exact(doc, [
        'version',
        'capability',
        'revision',
        'asset',
        ...(Object.hasOwn(doc, 'isolation') ? ['isolation'] : []),
      ])
    )
      invalid()
    const map = mapOf(asset)
    // Unrepresentable legacy identifiers stay inline and retain their full native-8 barrier.
    if (segment(asset.id) === null || map.layers.some((layer) => segment(layer.id) === null))
      return { document: raw, chunks: new Map() }
    const chunks = new Map<string, Int16Array>()
    const layers = map.layers.map((layer) => {
      if (!isTileLayer(layer)) return layer
      const locations = [...layer.cells.chunks]
        .sort((a, b) => a.row - b.row || a.col - b.col)
        .map((chunk) => {
          const key = keyOf(asset.id, layer.id, chunk.col, chunk.row)!
          const before = records.get(key)
          const same =
            before instanceof Int16Array &&
            before.length === chunk.cells.length &&
            before.every((cell, index) => cell === chunk.cells[index])
          chunks.set(key, same ? before : chunk.cells)
          return { col: chunk.col, row: chunk.row, key }
        })
      return { ...layer, cells: { ...grid([]), chunks: locations } }
    })
    const header =
      asset.kind === 'map-set' ? { ...asset, map: { ...map, layers } } : { ...map, layers }
    return { document: { ...doc, version: 3, storage: STORAGE, asset: header }, chunks }
  },
}
