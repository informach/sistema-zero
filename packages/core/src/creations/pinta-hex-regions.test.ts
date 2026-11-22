import { expect, test } from 'bun:test'
import {
  isPintaHexCell,
  makePintaHexCell,
  PINTA_HEX_EMPTY_CELL,
  unpackPintaHexCell,
} from './pinta-hex-cell'
import { createHexRegionCellReader, hexRegionCellAt } from './pinta-region-reader'
import {
  encodePintaHexRegionLayers,
  PINTA_HEX_REGION_CHUNK_BYTES,
  PINTA_HEX_REGION_MAX_CHUNKS,
  PINTA_REGION_CELL_COUNT,
  type PintaHexRegionCells,
  parsePintaHexRegionLayerLocations,
  parsePintaHexRegionLayers,
  parsePintaRegionLayers,
} from './pinta-regions'

const bounds = { col: -33, row: -33, cols: 66, rows: 66 }
const tile = makePintaHexCell(63, { rotation: 120, flipX: true })!

function region(): PintaHexRegionCells {
  const cells = new Uint32Array(PINTA_REGION_CELL_COUNT).fill(PINTA_HEX_EMPTY_CELL)
  cells[0] = tile
  const second = new Uint32Array(PINTA_REGION_CELL_COUNT).fill(PINTA_HEX_EMPTY_CELL)
  second[1023] = 0
  return {
    kind: 'hex-regions',
    version: 1,
    side: 32,
    chunks: [
      { col: -1, row: 0, cells },
      { col: -1, row: -1, cells: second },
    ],
  }
}

test('hex cells carry unsigned, independent flags and cover every sixty-degree turn', () => {
  expect(tile).toBe(0x9000003f)
  expect(unpackPintaHexCell(tile)).toEqual({ tile: 63, flipX: true, flipY: false, rotation: 120 })
  expect(unpackPintaHexCell(PINTA_HEX_EMPTY_CELL)).toBeNull()
  expect(isPintaHexCell(0x1000)).toBe(false)
  expect(isPintaHexCell(-1)).toBe(false)
  expect(makePintaHexCell(4096)).toBeNull()
  for (const rotation of [0, 60, 120, 180, 240, 300] as const) {
    const result = unpackPintaHexCell(makePintaHexCell(1, { rotation })!)!
    expect(result.flipX).toBe(result.flipY)
    expect(result.rotation + (result.flipX ? 180 : 0)).toBe(rotation)
  }
})

test('independent little-endian hex wire round trips signed chunks and is refused by square readers', () => {
  const grid = region()
  const wire = encodePintaHexRegionLayers([grid], bounds)!
  expect(wire[0]?.encoding).toBe('u32le-base64-v1')
  expect(wire[0]?.chunks.map((chunk) => chunk.row)).toEqual([-1, 0])
  const bytes = Buffer.from(wire[0]!.chunks[1]!.data, 'base64')
  expect(bytes.length).toBe(PINTA_HEX_REGION_CHUNK_BYTES)
  expect(bytes.readUInt32LE(0)).toBe(tile)
  expect(bytes.readUInt32LE(4)).toBe(PINTA_HEX_EMPTY_CELL)
  expect(parsePintaRegionLayers(wire, bounds)).toBeNull()
  const [decoded] = parsePintaHexRegionLayers(JSON.parse(JSON.stringify(wire)), bounds)!
  const reader = createHexRegionCellReader(decoded!)
  expect(reader.at(-32, 0)).toBe(tile)
  expect(reader.at(-31, 0)).toBe(PINTA_HEX_EMPTY_CELL)
  expect(hexRegionCellAt(decoded!, -1, -1)).toBe(0)
  const found: number[][] = []
  reader.visitOccupied(bounds, (cell, col, row) => found.push([cell, col, row]), 'row-major')
  expect(found).toEqual([
    [0, -1, -1],
    [tile, -32, 0],
  ])
})

test('rejects bad padding, reserved bits, type changes and nonempty cells outside signed bounds', () => {
  const grid = region()
  const wire = encodePintaHexRegionLayers([grid], bounds)!
  const entry = wire[0]!.chunks[0]!
  entry.data = entry.data.replace(/A(?===$)/, 'B')
  expect(parsePintaHexRegionLayers(wire, bounds)).toBeNull()
  const first = grid.chunks[0]!
  first.cells[0] = 0x1000
  expect(encodePintaHexRegionLayers([grid], bounds)).toBeNull()
  first.cells[0] = tile
  expect(encodePintaHexRegionLayers([grid], { ...bounds, col: -31 })).toBeNull()
  expect(
    parsePintaHexRegionLayers(
      [{ ...grid, chunks: [{ ...first, cells: new Int16Array(1024) }] }],
      bounds,
    ),
  ).toBeNull()
})

test('admits exactly 4 MiB across hex layers and refuses the next chunk before payload access', () => {
  const { chunks, ...layer } = encodePintaHexRegionLayers([region()], bounds)![0]!
  const data = chunks[1]!.data
  const header = (index: number) => ({
    col: (index % 32) - 16,
    row: Math.floor(index / 32) - 16,
    data,
  })
  const extent = { col: -512, row: -512, cols: 1024, rows: 1056 }
  const first = { ...layer, chunks: Array.from({ length: 512 }, (_, i) => header(i)) }
  const second = { ...layer, chunks: Array.from({ length: 512 }, (_, i) => header(i + 512)) }
  const wire = [first, second]
  expect(PINTA_HEX_REGION_MAX_CHUNKS * PINTA_HEX_REGION_CHUNK_BYTES).toBe(4 * 1024 * 1024)
  expect(
    parsePintaHexRegionLayerLocations(wire, extent, true)?.map((entry) => entry.length),
  ).toEqual([512, 512])
  expect(parsePintaHexRegionLayers(wire, extent)?.map((entry) => entry.chunks.length)).toEqual([
    512, 512,
  ])
  let inspected = false
  Object.defineProperty(first.chunks[0], 'data', {
    get() {
      inspected = true
      return data
    },
  })
  second.chunks.push(header(1024))
  expect(parsePintaHexRegionLayers(wire, extent)).toBeNull()
  expect(inspected).toBe(false)
})
