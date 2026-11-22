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

export interface PintaRegionCells {
  kind: 'regions'
  version: 1
  side: 32
  chunks: Array<{ col: number; row: number; cells: Int16Array }>
}

export interface PintaRegionWire {
  kind: 'regions'
  version: 1
  side: 32
  encoding: 'i16le-base64-v1'
  chunks: Array<{ col: number; row: number; data: string }>
}

type RecordValue = Record<string, unknown>
interface LayerHeader {
  value: RecordValue
  wire: boolean
  chunks: RecordValue[]
}
const ENCODING = 'i16le-base64-v1'
const BYTE_COUNT = PINTA_REGION_CELL_COUNT * 2
const BASE64_LENGTH = Math.ceil(BYTE_COUNT / 3) * 4
export const PINTA_REGION_CHUNK_BYTES = BYTE_COUNT
export const PINTA_REGION_CHUNK_BASE64_CHARS = BASE64_LENGTH
const BASE64 = /^[A-Za-z0-9+/]+=$/

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
      layer.kind !== 'regions' ||
      layer.version !== 1 ||
      layer.side !== PINTA_REGION_SIDE ||
      (wire && (!allowWire || layer.encoding !== ENCODING)) ||
      !Array.isArray(layer.chunks)
    )
      return null
    count += layer.chunks.length
    if (count > PINTA_REGION_LIMITS.maxChunks) return null
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

function validCells(
  cells: unknown,
  chunk: RecordValue,
  bounds: PintaRegionBounds,
): cells is Int16Array {
  if (!(cells instanceof Int16Array) || cells.length !== PINTA_REGION_CELL_COUNT) return false
  const left = (chunk.col as number) * PINTA_REGION_SIDE
  const top = (chunk.row as number) * PINTA_REGION_SIDE
  let occupied = false
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]!
    if (cell < -1) return false
    if (cell === -1) continue
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

function decode(data: unknown): Int16Array | null {
  if (typeof data !== 'string' || data.length !== BASE64_LENGTH || !BASE64.test(data)) return null
  const binary = atob(data)
  // Reject ignored padding bits as well as whitespace/alternative spellings.
  if (binary.length !== BYTE_COUNT || btoa(binary) !== data) return null
  const bytes = new Uint8Array(BYTE_COUNT)
  for (let index = 0; index < BYTE_COUNT; index += 1) bytes[index] = binary.charCodeAt(index)
  const view = new DataView(bytes.buffer)
  const cells = new Int16Array(PINTA_REGION_CELL_COUNT)
  for (let index = 0; index < cells.length; index += 1)
    cells[index] = view.getInt16(index * 2, true)
  return cells
}

function encode(cells: Int16Array): string {
  const bytes = new Uint8Array(BYTE_COUNT)
  const view = new DataView(bytes.buffer)
  for (let index = 0; index < cells.length; index += 1)
    view.setInt16(index * 2, cells[index]!, true)
  return btoa(Reflect.apply(String.fromCharCode, null, bytes))
}

/** Header-only admission for storage readers, before requesting any cell payloads. */
export function parsePintaRegionLayerLocations(
  raw: unknown,
  rawBounds: unknown,
  allowWire = false,
): Array<Array<{ col: number; row: number }>> | null {
  try {
    const bounds = readBounds(rawBounds)
    const headers = bounds && readHeaders(raw, bounds, allowWire)
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
  try {
    const bounds = readBounds(rawBounds)
    if (!bounds) return null
    const headers = readHeaders(raw, bounds, true)
    if (!headers) return null
    const result: PintaRegionCells[] = []
    for (const header of headers) {
      const chunks: PintaRegionCells['chunks'] = []
      for (const chunk of header.chunks) {
        const cells = header.wire ? decode(chunk.data) : chunk.cells
        if (!validCells(cells, chunk, bounds)) return null
        if (header.wire) chunks.push({ col: chunk.col as number, row: chunk.row as number, cells })
      }
      result.push(
        header.wire
          ? { kind: 'regions', version: 1, side: 32, chunks }
          : (header.value as unknown as PintaRegionCells),
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
  try {
    const bounds = readBounds(rawBounds)
    if (!bounds || !readHeaders(grids, bounds, false)) return null
    for (const grid of grids)
      for (const chunk of grid.chunks) if (!validCells(chunk.cells, chunk, bounds)) return null
    return grids.map((grid) => ({
      kind: 'regions',
      version: 1,
      side: 32,
      encoding: ENCODING,
      chunks: [...grid.chunks]
        .sort((a, b) => a.row - b.row || a.col - b.col)
        .map((chunk) => ({ col: chunk.col, row: chunk.row, data: encode(chunk.cells) })),
    }))
  } catch {
    return null
  }
}
