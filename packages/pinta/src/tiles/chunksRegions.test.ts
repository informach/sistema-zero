import { expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import {
  alignedDenseRenderReference as alignedDenseReference,
  integerPixelRenderFixture,
  makeRegionRenderFixture,
  translatedRegionRenderMap as translated,
} from '../../scripts/homologacao/regionRendering'
import { isTileLayer, type RegionTilemapAsset, type TilemapAsset } from '../core/project'
import { paintTilemapLayers, TileChunkCache, visibleChunks, visibleLayerChunks } from './chunks'
import { editRegionMapCells } from './regionMap'

function fixture() {
  return makeRegionRenderFixture(
    (width, height) => createCanvas(width, height) as unknown as HTMLCanvasElement,
  )
}
function paint(
  data: ReturnType<typeof fixture>,
  map: TilemapAsset | RegionTilemapAsset,
  scale: number,
  time: number,
  budget: number,
  contentOrigin?: { col: number; row: number },
) {
  const canvas = createCanvas(256, 192),
    ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D,
    origin = contentOrigin ?? ('origin' in map ? map.origin : { col: 0, row: 0 }),
    cache = new TileChunkCache(budget, () => createCanvas(1, 1) as unknown as HTMLCanvasElement)
  ctx.imageSmoothingEnabled = false
  ctx.shadowColor = 'rgba(0, 0, 0, 0)'
  ctx.fillStyle = '#183442'
  ctx.fillRect(0, 0, 256, 192)
  ctx.translate(-16 - origin.col * 16 * scale, -12 - origin.row * 16 * scale)
  paintTilemapLayers(
    ctx,
    map,
    new Map([[data.tileset.id, data.tileset]]),
    () => data.sheet,
    cache,
    {
      x: origin.col * 16 + 16 / scale,
      y: origin.row * 16 + 12 / scale,
      width: 256 / scale,
      height: 192 / scale,
    },
    scale,
    time,
  )
  const pixels = canvas.getContext('2d').getImageData(0, 0, 256, 192).data,
    result = { pixels, bytes: cache.usedBytes, rebuilds: cache.rebuilds }
  cache.clear()
  return result
}

test('visible chunks clip signed partial bounds and reject invalid viewports', () => {
  expect(
    visibleChunks({ x: -1040, y: -1056, width: 64, height: 64 }, 16, 64, 64, {
      col: -65,
      row: -66,
    }),
  ).toEqual([
    { col: -3, row: -3 },
    { col: -2, row: -3 },
    { col: -3, row: -2 },
    { col: -2, row: -2 },
  ])
  expect(
    visibleChunks({ x: -2000, y: -2000, width: 64, height: 64 }, 16, 64, 64, {
      col: -65,
      row: -66,
    }),
  ).toEqual([])
  expect(visibleChunks({ x: 0, y: 0, width: Infinity, height: 64 }, 16, 64, 64)).toEqual([])
})

for (const [col, row] of [
  [-64, -64],
  [-65, -66],
] as const)
  for (const scale of [0.25, 0.5, 1, 2])
    for (const time of [0, 100, 250])
      test(`signed chunks conserve globally aligned dense pixels at (${col},${row}), scale ${scale}, t=${time}`, () => {
        const data = fixture(),
          map = translated(data.map, col, row),
          before = structuredClone(map),
          dense = alignedDenseReference(data.map, col, row),
          reference = paint(data, dense.map, scale, time, 32 * 1024 * 1024, dense.origin),
          actual = paint(data, map, scale, time, 32 * 1024 * 1024)
        const mismatch = actual.pixels.findIndex(
          (value, index) => value !== reference.pixels[index],
        )
        expect(
          mismatch,
          `pixel=(${Math.floor(mismatch / 4) % 256},${Math.floor(mismatch / 1024)}); actual=${actual.pixels.slice(Math.max(0, mismatch - 3), mismatch + 5)}; reference=${reference.pixels.slice(Math.max(0, mismatch - 3), mismatch + 5)}`,
        ).toBe(-1)
        expect(actual.bytes).toBeLessThanOrEqual(32 * 1024 * 1024)
        expect(map).toEqual(before)
      })

for (const [col, row] of [
  [-64, -64],
  [-65, -66],
] as const)
  for (const scale of [0.25, 0.5, 1, 2])
    test(`signed direct rendering conserves pixels under pressure at (${col},${row}), scale ${scale}`, () => {
      const data = integerPixelRenderFixture(fixture()),
        map = translated(data.map, col, row),
        dense = alignedDenseReference(data.map, col, row),
        reference = paint(data, dense.map, scale, 100, 32 * 1024 * 1024, dense.origin),
        actual = paint(data, map, scale, 100, 1)
      expect(actual.pixels.findIndex((value, index) => value !== reference.pixels[index])).toBe(-1)
      expect(actual.rebuilds).toBe(0)
      expect(actual.bytes).toBe(0)
    })

test('a huge sparse viewport visits occupied chunks only and honors visibility and layer offsets', () => {
  const data = fixture(),
    source = translated(data.map, -65, -66),
    empty = { kind: 'regions' as const, version: 1 as const, side: 32 as const, chunks: [] },
    map: RegionTilemapAsset = {
      ...source,
      origin: { col: -100, row: -100 },
      cols: 10000,
      rows: 10000,
      layers: source.layers.map((l) => (isTileLayer(l) ? { ...l, cells: empty } : l)),
    },
    edit = editRegionMapCells(map, 'layer-0', [
      { col: -50, row: -40, cell: 0 },
      { col: 9000, row: 9000, cell: 1 },
    ])
  if (!edit.ok) throw Error(edit.reason)
  const all = visibleLayerChunks(edit.map, new Map([[data.tileset.id, data.tileset]]), {
    x: -1600,
    y: -1600,
    width: 160000,
    height: 160000,
  })
  expect(all.flatMap((l) => l.chunks)).toHaveLength(2)
  expect(all.flatMap((l) => l.chunks)).toEqual([
    { col: -2, row: -2 },
    { col: 281, row: 281 },
  ])
  const negative = visibleLayerChunks(edit.map, new Map([[data.tileset.id, data.tileset]]), {
    x: -820,
    y: -660,
    width: 64,
    height: 64,
  })
  expect(negative.flatMap((l) => l.chunks)).toEqual([{ col: -2, row: -2 }])
  const hidden = {
    ...edit.map,
    layers: edit.map.layers.map((l) => (l.id === 'group' ? { ...l, visible: false } : l)),
  }
  expect(
    visibleLayerChunks(hidden, new Map([[data.tileset.id, data.tileset]]), {
      x: -820,
      y: -660,
      width: 64,
      height: 64,
    }),
  ).toEqual([])
})

test('a signed region chunk is reused after an edit in another chunk, without retaining changed pixels', () => {
  const data = fixture(),
    map = translated(data.map, -64, -64),
    layer = map.layers.find(isTileLayer)!,
    cache = new TileChunkCache(
      32 * 1024 * 1024,
      () => createCanvas(1, 1) as unknown as HTMLCanvasElement,
    ),
    first = cache.get(map, layer, data.tileset, data.sheet, -2, -2),
    before = cache.rebuilds,
    edit = editRegionMapCells(map, layer.id, [{ col: -1, row: -1, cell: 3 }])
  expect(first).not.toBeNull()
  if (!edit.ok) throw Error(edit.reason)
  expect(
    cache.get(edit.map, edit.map.layers.find(isTileLayer)!, data.tileset, data.sheet, -2, -2),
  ).toBe(first)
  expect(cache.rebuilds).toBe(before)
  cache.clear()
  expect(cache.usedBytes).toBe(0)
})
