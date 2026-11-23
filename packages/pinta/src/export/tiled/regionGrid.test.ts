import { expect, test } from 'bun:test'
import {
  createRegionCellReader,
  PINTA_REGION_LIMITS,
  parsePintaRegionLayers,
} from '@sistemazero/core/creations'
import { readRegionalTiledGrid } from './regionGrid'

const bounds = { col: -64, row: -64, cols: 512, rows: 512 }
const chunk = (x: number, y: number, width: number, height: number, gid = 0) => ({
  x,
  y,
  width,
  height,
  data: new Array<number>(width * height).fill(gid),
})
function read(chunks: unknown[]) {
  let regions = 0
  const grid = readRegionalTiledGrid(
    chunks,
    bounds,
    (body) => body.data as number[],
    (gid) => gid - 1,
    () => {},
    () => regions++,
  )
  return { grid, regions }
}

test('Tiled 16×16 chunks fill the same 32×32 regions they cover', () => {
  const { grid, regions } = read([
    chunk(0, 0, 16, 16, 3),
    chunk(16, 0, 16, 16, 3),
    chunk(-16, -16, 16, 16, 2),
  ])
  expect(regions).toBe(2)
  const [decoded] = parsePintaRegionLayers([grid], bounds) ?? []
  if (!decoded) throw new Error('As regiões lidas do Tiled não conferem.')
  const cells = createRegionCellReader(decoded)
  expect([cells.at(0, 0), cells.at(31, 15), cells.at(-1, -1), cells.at(0, 16)]).toEqual([
    2, 2, 1, -1,
  ])
})

test('an aligned grid accepts more chunks than regions, but not the same chunk twice', () => {
  const many = Array.from({ length: PINTA_REGION_LIMITS.maxChunks + 1 }, (_, i) =>
    chunk((i % 64) * 4, Math.floor(i / 64) * 4, 4, 4),
  )
  expect(read(many).regions).toBe(0)
  expect(() => read([chunk(0, 0, 16, 16), chunk(0, 0, 16, 16)])).toThrow('se sobrepõem')
})

test('loose rectangles are compared pairwise and capped', () => {
  expect(() => read([chunk(0, 0, 16, 16), chunk(8, 8, 16, 16)])).toThrow('se sobrepõem')
  expect(() => read([chunk(0, 0, 16, 16), chunk(8, 16, 16, 16), chunk(0, 8, 8, 8)])).toThrow(
    'se sobrepõem',
  )
  const loose = [
    chunk(-64, -64, 2, 1),
    ...Array.from({ length: PINTA_REGION_LIMITS.maxChunks }, (_, i) =>
      chunk(i % 256, Math.floor(i / 256), 1, 1),
    ),
  ]
  expect(() => read(loose)).toThrow('inválidas')
})
