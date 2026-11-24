import { PintaLocalStorageError } from '../core/localStorageErrors'
import { PINTA_MAP_FORMAT_LIMITS, PINTA_MAX_SCHEMA } from '../core/projectConfig'
import { isValidCell } from '../tiles/cell'
import { LOCAL_ASSET_PREFIX } from './localAssetAuthority'

export const LOCAL_CHUNK_PREFIX = 'pinta:local:chunk:'
export const LOCAL_CHUNK_SIDE = 32
export const LOCAL_CHUNK_MIN_CELLS = 32_768
const STORAGE = 'pinta-cells-32-v1'
type RecordValue = Record<string, unknown>
const record = (value: unknown): RecordValue | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as RecordValue) : null
function invalid(): never {
  throw new PintaLocalStorageError(
    'Não consegui conferir uma parte do mapa guardado. Seus dados foram mantidos.',
  )
}
function idSegment(value: string): string | null {
  try {
    return encodeURIComponent(value)
  } catch {
    return null
  }
}
function chunkId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 512 &&
    idSegment(value) !== null
  )
}
function chunkKey(id: string, layer: string, col: number, row: number): string {
  const owner = idSegment(id),
    layerId = idSegment(layer)
  if (owner === null || layerId === null) invalid()
  return `${LOCAL_CHUNK_PREFIX}${owner}:${layerId}:${col}:${row}`
}

interface MapInfo {
  asset: RecordValue
  map: RecordValue
  id: string
  cols: number
  rows: number
  layers: RecordValue[]
  tileLayers: RecordValue[]
  cells: number
  nested: boolean
}
function mapInfo(key: string, value: unknown): MapInfo {
  const asset = record(value)
  if (!asset || !chunkId(asset.id) || key !== LOCAL_ASSET_PREFIX + asset.id) invalid()
  const nested = asset.kind === 'map-set',
    map = nested ? record(asset.map) : asset
  if (!map || (!nested && asset.kind !== 'tilemap')) invalid()
  if (typeof map.cols !== 'number' || typeof map.rows !== 'number') invalid()
  const cols = map.cols,
    rows = map.rows
  if (
    !Number.isInteger(cols) ||
    cols < 1 ||
    cols > PINTA_MAP_FORMAT_LIMITS.maxCols ||
    !Number.isInteger(rows) ||
    rows < 1 ||
    rows > PINTA_MAP_FORMAT_LIMITS.maxRows ||
    !Array.isArray(map.layers) ||
    map.layers.length > PINTA_MAP_FORMAT_LIMITS.maxLayers
  )
    invalid()
  const layers = map.layers.map((value) => {
    const layer = record(value)
    if (
      !layer ||
      !chunkId(layer.id) ||
      ![undefined, 'tiles', 'objects', 'group'].includes(layer.kind as string | undefined)
    )
      invalid()
    return layer
  })
  if (new Set(layers.map((layer) => layer.id)).size !== layers.length) invalid()
  const tileLayers = layers.filter((layer) => layer.kind === undefined || layer.kind === 'tiles')
  const cells = tileLayers.length * cols * rows
  if (cells > PINTA_MAP_FORMAT_LIMITS.maxCells) invalid()
  return { asset, map, id: asset.id, cols, rows, layers, tileLayers, cells, nested }
}
function replaceLayers(info: MapInfo, layers: RecordValue[]): RecordValue {
  return info.nested ? { ...info.asset, map: { ...info.map, layers } } : { ...info.asset, layers }
}
interface ChunkSlot {
  key: string | null
  col: number
  row: number
  width: number
  height: number
}
function slots(info: MapInfo, layer: RecordValue): ChunkSlot[] {
  const cells = record(layer.cells)
  const columns = Math.ceil(info.cols / LOCAL_CHUNK_SIDE),
    rows = Math.ceil(info.rows / LOCAL_CHUNK_SIDE)
  if (
    cells?.version !== 1 ||
    cells.side !== LOCAL_CHUNK_SIDE ||
    !Array.isArray(cells.keys) ||
    cells.keys.length !== columns * rows
  )
    invalid()
  return cells.keys.map((key, index) => {
    const col = index % columns,
      row = Math.floor(index / columns)
    if (key !== null && key !== chunkKey(info.id, String(layer.id), col, row)) invalid()
    return {
      key: key as string | null,
      col,
      row,
      width: Math.min(LOCAL_CHUNK_SIDE, info.cols - col * LOCAL_CHUNK_SIDE),
      height: Math.min(LOCAL_CHUNK_SIDE, info.rows - row * LOCAL_CHUNK_SIDE),
    }
  })
}
function physicalInfo(key: string, value: unknown): MapInfo | null {
  const doc = record(value)
  // Unknown protocols are left intact for the existing forward-version barrier.
  if (doc?.version !== 2 || doc.storage !== STORAGE) return null
  if (
    !Number.isSafeInteger(doc.capability) ||
    Number(doc.capability) < 5 ||
    typeof doc.revision !== 'string' ||
    !doc.revision
  )
    invalid()
  if (Number(doc.capability) > PINTA_MAX_SCHEMA) return null
  const info = mapInfo(key, doc.asset)
  if (!info.layers.length) invalid()
  return info
}

/** Validate references before issuing requests or allocating the dense domain buffers. */
export function localChunkKeys(key: string, value: unknown): string[] {
  const info = physicalInfo(key, value)
  return info
    ? info.tileLayers.flatMap((layer) =>
        slots(info, layer).flatMap((slot) => (slot.key ? [slot.key] : [])),
      )
    : []
}
export function decodeLocalChunkDocument(
  key: string,
  value: unknown,
  records: ReadonlyMap<string, unknown>,
): unknown {
  const info = physicalInfo(key, value)
  if (!info) return value
  // All descriptors are checked before the first allocation.
  const locations = new Map(info.tileLayers.map((layer) => [layer, slots(info, layer)]))
  const layers = info.layers.map((layer) => {
    const locationsOfLayer = locations.get(layer)
    if (!locationsOfLayer) return layer
    const cells = new Int16Array(info.cols * info.rows).fill(-1)
    for (const slot of locationsOfLayer) {
      if (!slot.key) continue
      const chunk = records.get(slot.key)
      if (
        !(chunk instanceof Int16Array) ||
        chunk.length !== slot.width * slot.height ||
        chunk.some((cell) => !isValidCell(cell))
      )
        invalid()
      for (let row = 0; row < slot.height; row++)
        cells.set(
          chunk.subarray(row * slot.width, (row + 1) * slot.width),
          (slot.row * LOCAL_CHUNK_SIDE + row) * info.cols + slot.col * LOCAL_CHUNK_SIDE,
        )
    }
    return { ...layer, cells }
  })
  const doc = value as RecordValue
  return {
    version: 1,
    capability: doc.capability,
    revision: doc.revision,
    ...(doc.isolation !== undefined ? { isolation: doc.isolation } : {}),
    asset: replaceLayers(info, layers),
  }
}

export interface EncodedLocalDocument {
  document: unknown
  chunks: Map<string, Int16Array>
}

/** IO policy is explicit; the public default remains the legacy dense reader. */
export interface LocalStorageCodec {
  keys(key: string, value: unknown): string[]
  decode(key: string, value: unknown, records: ReadonlyMap<string, unknown>): unknown
  encode(key: string, value: unknown, records: ReadonlyMap<string, unknown>): EncodedLocalDocument
}

export const localDenseStorageCodec: LocalStorageCodec = {
  keys: localChunkKeys,
  decode: decodeLocalChunkDocument,
  encode: encodeLocalChunkDocument,
}
/** Unchanged chunk arrays are borrowed from the captured physical snapshot. */
export function encodeLocalChunkDocument(
  key: string,
  value: unknown,
  records: ReadonlyMap<string, unknown>,
): EncodedLocalDocument {
  const chunks = new Map<string, Int16Array>(),
    doc = record(value),
    asset = record(doc?.asset)
  if (doc?.version !== 1 || !asset || !['tilemap', 'map-set'].includes(String(asset.kind)))
    return { document: value, chunks }
  // Arbitrary legacy IDs retain dense storage; never shorten an author's identifiers.
  if (!chunkId(asset.id)) return { document: value, chunks }
  const rawMap = asset.kind === 'map-set' ? record(asset.map) : asset
  if (Array.isArray(rawMap?.layers) && rawMap.layers.some((layer) => !chunkId(record(layer)?.id)))
    return { document: value, chunks }
  const info = mapInfo(key, asset)
  if (info.cells < LOCAL_CHUNK_MIN_CELLS) return { document: value, chunks }
  const layers = info.layers.map((layer) => {
    if (layer.kind === 'objects' || layer.kind === 'group') return layer
    const cells = layer.cells
    if (!(cells instanceof Int16Array) || cells.length !== info.cols * info.rows) invalid()
    const keys: Array<string | null> = []
    for (let row = 0; row < Math.ceil(info.rows / LOCAL_CHUNK_SIDE); row++)
      for (let col = 0; col < Math.ceil(info.cols / LOCAL_CHUNK_SIDE); col++) {
        const width = Math.min(LOCAL_CHUNK_SIDE, info.cols - col * LOCAL_CHUNK_SIDE),
          height = Math.min(LOCAL_CHUNK_SIDE, info.rows - row * LOCAL_CHUNK_SIDE),
          key = chunkKey(info.id, String(layer.id), col, row),
          previous = records.get(key)
        let same = previous instanceof Int16Array && previous.length === width * height,
          filled = false
        for (let r = 0; r < height; r++)
          for (let c = 0; c < width; c++) {
            const cell =
              cells[(row * LOCAL_CHUNK_SIDE + r) * info.cols + col * LOCAL_CHUNK_SIDE + c]!
            if (!isValidCell(cell)) invalid()
            if (cell !== -1) filled = true
            if (!(previous instanceof Int16Array) || previous[r * width + c] !== cell) same = false
          }
        keys.push(filled ? key : null)
        if (!filled) continue
        const chunk = same ? (previous as Int16Array) : new Int16Array(width * height)
        if (!same)
          for (let r = 0; r < height; r++)
            chunk.set(
              cells.subarray(
                (row * LOCAL_CHUNK_SIDE + r) * info.cols + col * LOCAL_CHUNK_SIDE,
                (row * LOCAL_CHUNK_SIDE + r) * info.cols + col * LOCAL_CHUNK_SIDE + width,
              ),
              r * width,
            )
        chunks.set(key, chunk)
      }
    return { ...layer, cells: { version: 1, side: LOCAL_CHUNK_SIDE, keys } }
  })
  return {
    document: {
      version: 2,
      storage: STORAGE,
      capability: doc.capability,
      revision: doc.revision,
      ...(doc.isolation !== undefined ? { isolation: doc.isolation } : {}),
      asset: replaceLayers(info, layers),
    },
    chunks,
  }
}

/** Exact physical diff; metadata, mirror, chunks and garbage collection share one commit. */
export function planLocalStorageWrites(
  before: ReadonlyMap<string, unknown>,
  after: ReadonlyMap<string, unknown>,
  physical: ReadonlyMap<string, unknown>,
  codec: LocalStorageCodec | null = localDenseStorageCodec,
): { puts: Map<string, unknown>; deletes: Set<string> } {
  const puts = new Map<string, unknown>(),
    deletes = new Set<string>()
  for (const [key, value] of after) {
    if (before.has(key) && value === before.get(key)) continue
    if (codec && key.startsWith(LOCAL_ASSET_PREFIX)) {
      const encoded = codec.encode(key, value, physical)
      puts.set(key, encoded.document)
      for (const [chunk, cells] of encoded.chunks)
        if (cells !== physical.get(chunk)) puts.set(chunk, cells)
      for (const chunk of codec.keys(key, physical.get(key)))
        if (!encoded.chunks.has(chunk)) deletes.add(chunk)
    } else puts.set(key, value)
  }
  for (const key of before.keys())
    if (!after.has(key)) {
      deletes.add(key)
      if (codec && key.startsWith(LOCAL_ASSET_PREFIX))
        for (const chunk of codec.keys(key, physical.get(key))) deletes.add(chunk)
    }
  for (const key of puts.keys()) deletes.delete(key)
  return { puts, deletes }
}
