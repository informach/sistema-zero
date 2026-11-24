import { isPintaHexCell, PINTA_HEX_EMPTY_CELL } from './pinta-hex-cell'

/** Sparse authorial cells. This contract alone does not activate a new document writer. */
export const PINTA_REGION_SIDE = 32
export const PINTA_REGION_CELL_COUNT = PINTA_REGION_SIDE * PINTA_REGION_SIDE
export const PINTA_REGION_LIMITS = Object.freeze({
  maxChunks: 2048,
  maxLayers: 32,
  maxAxis: 10000,
  minCoordinate: -10000,
  maxCoordinateExclusive: 10000,
})

export interface PintaRegionBounds {
  col: number
  row: number
  cols: number
  rows: number
}

type CellBuffer = Int16Array | Uint32Array
interface RegionCells<Cells extends CellBuffer, Kind extends string> {
  kind: Kind
  version: 1
  side: 32
  chunks: Array<{ col: number; row: number; cells: Cells }>
}

interface RegionWire<Kind extends string, Encoding extends string> {
  kind: Kind
  version: 1
  side: 32
  encoding: Encoding
  chunks: Array<{ col: number; row: number; data: string }>
}

export type PintaRegionCells = RegionCells<Int16Array, 'regions'>
export type PintaRegionWire = RegionWire<'regions', 'i16le-base64-v1'>
export type PintaHexRegionCells = RegionCells<Uint32Array, 'hex-regions'>
export type PintaHexRegionWire = RegionWire<'hex-regions', 'u32le-base64-v1'>

type RecordValue = Record<string, unknown>
interface LayerHeader {
  value: RecordValue
  wire: boolean
  chunks: RecordValue[]
}
export const PINTA_REGION_CHUNK_BYTES = PINTA_REGION_CELL_COUNT * Int16Array.BYTES_PER_ELEMENT
export const PINTA_REGION_CHUNK_BASE64_CHARS = Math.ceil(PINTA_REGION_CHUNK_BYTES / 3) * 4
export const PINTA_HEX_REGION_CHUNK_BYTES = PINTA_REGION_CELL_COUNT * Uint32Array.BYTES_PER_ELEMENT
export const PINTA_HEX_REGION_MAX_CHUNKS =
  (PINTA_REGION_LIMITS.maxChunks * PINTA_REGION_CHUNK_BYTES) / PINTA_HEX_REGION_CHUNK_BYTES
export const PINTA_HEX_REGION_CHUNK_BASE64_CHARS = Math.ceil(PINTA_HEX_REGION_CHUNK_BYTES / 3) * 4

interface RegionCodec<Cells extends CellBuffer, Kind extends string, Encoding extends string> {
  kind: Kind
  encoding: Encoding
  chunkBytes: number
  base64Chars: number
  maxChunks: number
  empty: number
  allocate(): Cells
  accepts(value: unknown): value is Cells
  valid(value: number): boolean
  read(view: DataView, index: number): number
  write(view: DataView, index: number, value: number): void
}

const squareCodec: RegionCodec<Int16Array, 'regions', 'i16le-base64-v1'> = {
  kind: 'regions',
  encoding: 'i16le-base64-v1',
  chunkBytes: PINTA_REGION_CHUNK_BYTES,
  base64Chars: PINTA_REGION_CHUNK_BASE64_CHARS,
  maxChunks: PINTA_REGION_LIMITS.maxChunks,
  empty: -1,
  allocate: () => new Int16Array(PINTA_REGION_CELL_COUNT),
  accepts: (value): value is Int16Array => value instanceof Int16Array,
  valid: (value) => value >= -1,
  read: (view, index) => view.getInt16(index * 2, true),
  write: (view, index, value) => view.setInt16(index * 2, value, true),
}

const hexCodec: RegionCodec<Uint32Array, 'hex-regions', 'u32le-base64-v1'> = {
  kind: 'hex-regions',
  encoding: 'u32le-base64-v1',
  chunkBytes: PINTA_HEX_REGION_CHUNK_BYTES,
  base64Chars: PINTA_HEX_REGION_CHUNK_BASE64_CHARS,
  maxChunks: PINTA_HEX_REGION_MAX_CHUNKS,
  empty: PINTA_HEX_EMPTY_CELL,
  allocate: () => new Uint32Array(PINTA_REGION_CELL_COUNT),
  accepts: (value): value is Uint32Array => value instanceof Uint32Array,
  valid: isPintaHexCell,
  read: (view, index) => view.getUint32(index * 4, true),
  write: (view, index, value) => view.setUint32(index * 4, value, true),
}

const BASE64 = /^[A-Za-z0-9+/]+={1,2}$/

function record(value: unknown): value is RecordValue {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

function exactKeys(value: RecordValue, fields: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value)
  return keys.length === fields.length && fields.every((field) => Object.hasOwn(value, field))
}

function readBounds(raw: unknown): PintaRegionBounds | null {
  if (!record(raw) || !exactKeys(raw, ['col', 'row', 'cols', 'rows'])) return null
  const { col, row, cols, rows } = raw
  if (
    typeof col !== 'number' ||
    typeof row !== 'number' ||
    typeof cols !== 'number' ||
    typeof rows !== 'number' ||
    !Number.isInteger(col) ||
    !Number.isInteger(row) ||
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < 1 ||
    rows < 1 ||
    cols > PINTA_REGION_LIMITS.maxAxis ||
    rows > PINTA_REGION_LIMITS.maxAxis ||
    col < PINTA_REGION_LIMITS.minCoordinate ||
    row < PINTA_REGION_LIMITS.minCoordinate ||
    col + cols > PINTA_REGION_LIMITS.maxCoordinateExclusive ||
    row + rows > PINTA_REGION_LIMITS.maxCoordinateExclusive
  )
    return null
  return { col, row, cols, rows }
}

export function parsePintaRegionBounds(raw: unknown): PintaRegionBounds | null {
  try {
    return readBounds(raw)
  } catch {
    return null
  }
}

/** Check every layer's budget before inspecting any cell buffer/base64 payload. */
function readHeaders(
  raw: unknown,
  bounds: PintaRegionBounds,
  allowWire: boolean,
  codec: { kind: string; encoding: string; maxChunks: number },
): LayerHeader[] | null {
  if (!Array.isArray(raw) || raw.length > PINTA_REGION_LIMITS.maxLayers) return null
  const headers: LayerHeader[] = []
  let count = 0
  for (const layer of raw) {
    if (!record(layer)) return null
    const wire = Object.hasOwn(layer, 'encoding')
    if (
      !exactKeys(
        layer,
        wire
          ? ['kind', 'version', 'side', 'encoding', 'chunks']
          : ['kind', 'version', 'side', 'chunks'],
      ) ||
      layer.kind !== codec.kind ||
      layer.version !== 1 ||
      layer.side !== PINTA_REGION_SIDE ||
      (wire && (!allowWire || layer.encoding !== codec.encoding)) ||
      !Array.isArray(layer.chunks)
    )
      return null
    count += layer.chunks.length
    if (count > codec.maxChunks) return null
    headers.push({ value: layer, wire, chunks: layer.chunks })
  }
  for (const header of headers) {
    const seen = new Set<string>()
    for (const chunk of header.chunks) {
      if (
        !record(chunk) ||
        !exactKeys(chunk, header.wire ? ['col', 'row', 'data'] : ['col', 'row', 'cells'])
      )
        return null
      const { col, row } = chunk
      if (
        typeof col !== 'number' ||
        typeof row !== 'number' ||
        !Number.isInteger(col) ||
        !Number.isInteger(row)
      )
        return null
      const left = col * PINTA_REGION_SIDE,
        top = row * PINTA_REGION_SIDE
      if (
        left >= bounds.col + bounds.cols ||
        top >= bounds.row + bounds.rows ||
        left + PINTA_REGION_SIDE <= bounds.col ||
        top + PINTA_REGION_SIDE <= bounds.row
      )
        return null
      const key = `${col},${row}`
      if (seen.has(key)) return null
      seen.add(key)
    }
  }
  return headers
}

function validCells<Cells extends CellBuffer>(
  cells: unknown,
  chunk: RecordValue,
  bounds: PintaRegionBounds,
  codec: RegionCodec<Cells, string, string>,
): cells is Cells {
  if (!codec.accepts(cells) || cells.length !== PINTA_REGION_CELL_COUNT) return false
  const left = (chunk.col as number) * PINTA_REGION_SIDE
  const top = (chunk.row as number) * PINTA_REGION_SIDE
  let occupied = false
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]!
    if (!codec.valid(cell)) return false
    if (cell === codec.empty) continue
    const col = left + (index % PINTA_REGION_SIDE)
    const row = top + Math.floor(index / PINTA_REGION_SIDE)
    if (
      col < bounds.col ||
      row < bounds.row ||
      col >= bounds.col + bounds.cols ||
      row >= bounds.row + bounds.rows
    )
      return false
    occupied = true
  }
  return occupied
}

function decode<Cells extends CellBuffer>(
  data: unknown,
  codec: RegionCodec<Cells, string, string>,
): Cells | null {
  if (typeof data !== 'string' || data.length !== codec.base64Chars || !BASE64.test(data))
    return null
  const binary = atob(data)
  // Reject ignored padding bits as well as whitespace/alternative spellings.
  if (binary.length !== codec.chunkBytes || btoa(binary) !== data) return null
  const bytes = new Uint8Array(codec.chunkBytes)
  for (let index = 0; index < codec.chunkBytes; index += 1) bytes[index] = binary.charCodeAt(index)
  const view = new DataView(bytes.buffer)
  const cells = codec.allocate()
  for (let index = 0; index < cells.length; index += 1) cells[index] = codec.read(view, index)
  return cells
}

function encode<Cells extends CellBuffer>(
  cells: Cells,
  codec: RegionCodec<Cells, string, string>,
): string {
  const bytes = new Uint8Array(codec.chunkBytes)
  const view = new DataView(bytes.buffer)
  for (let index = 0; index < cells.length; index += 1) codec.write(view, index, cells[index]!)
  return btoa(Reflect.apply(String.fromCharCode, null, bytes))
}

/** Header-only admission for storage readers, before requesting any cell payloads. */
export function parsePintaRegionLayerLocations(
  raw: unknown,
  rawBounds: unknown,
  allowWire = false,
): Array<Array<{ col: number; row: number }>> | null {
  return parseLayerLocations(raw, rawBounds, allowWire, squareCodec)
}

export function parsePintaHexRegionLayerLocations(
  raw: unknown,
  rawBounds: unknown,
  allowWire = false,
): Array<Array<{ col: number; row: number }>> | null {
  return parseLayerLocations(raw, rawBounds, allowWire, hexCodec)
}

function parseLayerLocations(
  raw: unknown,
  rawBounds: unknown,
  allowWire: boolean,
  codec: Parameters<typeof readHeaders>[3],
): Array<Array<{ col: number; row: number }>> | null {
  try {
    const bounds = readBounds(rawBounds)
    const headers = bounds && readHeaders(raw, bounds, allowWire, codec)
    return headers
      ? headers.map((header) =>
          header.chunks.map((chunk) => ({ col: chunk.col as number, row: chunk.row as number })),
        )
      : null
  } catch {
    return null
  }
}

/** Strict and bounded; rejects unsupported data rather than sanitizing away information. */
export function parsePintaRegionLayers(
  raw: unknown,
  rawBounds: unknown,
): PintaRegionCells[] | null {
  return parseLayers(raw, rawBounds, squareCodec)
}

export function parsePintaHexRegionLayers(
  raw: unknown,
  rawBounds: unknown,
): PintaHexRegionCells[] | null {
  return parseLayers(raw, rawBounds, hexCodec)
}

function parseLayers<Cells extends CellBuffer, Kind extends string>(
  raw: unknown,
  rawBounds: unknown,
  codec: RegionCodec<Cells, Kind, string>,
): RegionCells<Cells, Kind>[] | null {
  try {
    const bounds = readBounds(rawBounds)
    if (!bounds) return null
    const headers = readHeaders(raw, bounds, true, codec)
    if (!headers) return null
    const result: RegionCells<Cells, Kind>[] = []
    for (const header of headers) {
      const chunks: RegionCells<Cells, Kind>['chunks'] = []
      for (const chunk of header.chunks) {
        const cells = header.wire ? decode(chunk.data, codec) : chunk.cells
        if (!validCells(cells, chunk, bounds, codec)) return null
        if (header.wire) chunks.push({ col: chunk.col as number, row: chunk.row as number, cells })
      }
      result.push(
        header.wire
          ? { kind: codec.kind, version: 1, side: 32, chunks }
          : (header.value as unknown as RegionCells<Cells, Kind>),
      )
    }
    return result
  } catch {
    // Unknown input can include throwing accessors or detached buffers.
    return null
  }
}

/** Canonical order and little-endian encoding, independent of the host's byte order. */
export function encodePintaRegionLayers(
  grids: readonly PintaRegionCells[],
  rawBounds: unknown,
): PintaRegionWire[] | null {
  return encodeLayers(grids, rawBounds, squareCodec)
}

export function encodePintaHexRegionLayers(
  grids: readonly PintaHexRegionCells[],
  rawBounds: unknown,
): PintaHexRegionWire[] | null {
  return encodeLayers(grids, rawBounds, hexCodec)
}

function encodeLayers<Cells extends CellBuffer, Kind extends string, Encoding extends string>(
  grids: readonly RegionCells<Cells, Kind>[],
  rawBounds: unknown,
  codec: RegionCodec<Cells, Kind, Encoding>,
): RegionWire<Kind, Encoding>[] | null {
  try {
    const bounds = readBounds(rawBounds)
    if (!bounds || !readHeaders(grids, bounds, false, codec)) return null
    for (const grid of grids)
      for (const chunk of grid.chunks)
        if (!validCells(chunk.cells, chunk, bounds, codec)) return null
    return grids.map((grid) => ({
      kind: codec.kind,
      version: 1,
      side: 32,
      encoding: codec.encoding,
      chunks: [...grid.chunks]
        .sort((a, b) => a.row - b.row || a.col - b.col)
        .map((chunk) => ({ col: chunk.col, row: chunk.row, data: encode(chunk.cells, codec) })),
    }))
  } catch {
    return null
  }
}
