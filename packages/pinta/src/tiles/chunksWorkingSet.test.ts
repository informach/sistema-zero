import { expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type TilemapAsset,
} from '../core/project'
import { chunkBytes, paintTilemapLayers, TileChunkCache } from './chunks'
import { addLayer } from './tilemapOps'

const canvas = () => createCanvas(1, 1) as unknown as HTMLCanvasElement
function fixture(unique = false, empty = false) {
  const seed = createTilesetAsset({ name: 'atlas', tileSize: 16 }),
    ts = { ...seed, tiles: Array.from({ length: 4 }, () => seed.tiles[0]!) },
    sheet = createCanvas(64, 16),
    context = sheet.getContext('2d')
  for (let tile = 0; tile < 4; tile++)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        context.fillStyle = `rgba(${tile * 63},${x * 16},${y * 16},${((x + y) % 5) / 4})`
        context.fillRect(tile * 16 + x, y, 1, 1)
      }
  let map = createTilemapAsset({ name: 'mapa', tilesetId: ts.id, cols: 64, rows: 32 })
  for (let i = 1; i < 4; i++) map = addLayer(map, `camada-${i}`)
  map = {
    ...map,
    layers: map.layers.map((layer, index) =>
      isTileLayer(layer)
        ? { ...layer, cells: new Int16Array(64 * 32).fill(empty ? -1 : unique ? index : 0) }
        : layer,
    ),
  }
  return { map, ts, sheet: sheet as unknown as HTMLCanvasElement }
}
function paint(data: ReturnType<typeof fixture>, budget: number) {
  const cache = new TileChunkCache(budget, canvas),
    output = createCanvas(128, 96),
    ctx = output.getContext('2d') as unknown as CanvasRenderingContext2D,
    calls: string[] = []
  ctx.imageSmoothingEnabled = false
  ctx.shadowColor = 'rgba(0, 0, 0, 0)'
  paintTilemapLayers(
    ctx,
    data.map,
    new Map([[data.ts.id, data.ts]]),
    (id) => {
      calls.push(id)
      return data.sheet
    },
    cache,
    { x: 0, y: 0, width: 128, height: 96 },
    1,
    0,
  )
  const pixels = Array.from(ctx.getImageData(0, 0, 128, 96).data),
    state = {
      bytes: cache.usedBytes,
      needed: cache.workingSetBytes,
      pressure: cache.underPressure,
      rebuilds: cache.rebuilds,
      calls,
    }
  cache.clear()
  return { pixels, ...state }
}

test('a pressão conta composições distintas e conserva os pixels canônicos', () => {
  const data = fixture(),
    reference = paint(data, 32 * chunkBytes(16)),
    actual = paint(data, 2 * chunkBytes(16))
  expect(actual.pixels).toEqual(reference.pixels)
  expect(actual.needed).toBe(chunkBytes(16))
  expect(actual.pressure).toBe(false)
  expect(actual.rebuilds).toBe(1)
  expect(actual.bytes).toBe(chunkBytes(16))
  expect(actual.calls).toHaveLength(4)
})

test('composições únicas que não cabem mantêm a estimativa conservadora e o atlas é consultado uma vez por camada', () => {
  const data = fixture(true),
    reference = paint(data, 32 * chunkBytes(16)),
    actual = paint(data, 2 * chunkBytes(16))
  expect(actual.pixels).toEqual(reference.pixels)
  expect(actual.needed).toBe(4 * chunkBytes(16))
  expect(actual.pressure).toBe(true)
  expect(actual.bytes).toBeLessThanOrEqual(2 * chunkBytes(16))
  expect(actual.calls).toHaveLength(4)
})

test('regiões visíveis vazias não criam pressão artificial', () => {
  const actual = paint(fixture(false, true), 2 * chunkBytes(16))
  expect(actual.needed).toBe(0)
  expect(actual.pressure).toBe(false)
  expect(actual.rebuilds).toBe(0)
  expect(actual.bytes).toBe(0)
  expect(actual.calls).toHaveLength(4)
})

test('a estimativa compara células completas quando os fingerprints colidem', () => {
  const data = fixture(),
    values = (seed: number) => {
      const out = new Int16Array(1024).fill(-1)
      let state = seed
      for (let i = 0; i < 32; i++) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0
        out[i] = (state >>> 24) & 3
      }
      return out
    },
    a = values(109921),
    b = values(154913),
    cells = new Int16Array(96 * 32).fill(-1)
  for (let row = 0; row < 32; row++) {
    cells.set(a.subarray(row * 32, (row + 1) * 32), row * 96)
    cells.set(a.subarray(row * 32, (row + 1) * 32), row * 96 + 32)
    cells.set(b.subarray(row * 32, (row + 1) * 32), row * 96 + 64)
  }
  const base = data.map.layers.find(isTileLayer)
  if (!base) throw Error('Camada esperada')
  const map: TilemapAsset = { ...data.map, cols: 96, layers: [{ ...base, cells }] },
    cache = new TileChunkCache(2 * chunkBytes(16), canvas),
    output = createCanvas(96, 32),
    ctx = output.getContext('2d') as unknown as CanvasRenderingContext2D
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = 0.75
  ctx.shadowColor = 'rgba(0, 0, 0, 0)'
  paintTilemapLayers(
    ctx,
    map,
    new Map([[data.ts.id, data.ts]]),
    () => data.sheet,
    cache,
    { x: 0, y: 0, width: 1536, height: 512 },
    1 / 16,
  )
  expect(cache.workingSetBytes).toBe(2 * chunkBytes(16))
  expect(cache.underPressure).toBe(false)
  expect(cache.rebuilds).toBe(2)
  expect(cache.usedBytes).toBe(2 * chunkBytes(16))
  cache.clear()
})

for (const mode of ['tile-count', 'animation'] as const)
  test(`a estimativa mantém identidades distintas de ${mode} no mesmo atlas`, () => {
    const data = fixture(),
      other = {
        ...data.ts,
        id: 'outro-atlas',
        ...(mode === 'tile-count'
          ? { tiles: data.ts.tiles.slice(0, 1) }
          : { animations: { '0': [{ tile: 1, duration: 100 }] } }),
      },
      map = {
        ...data.map,
        layers: data.map.layers.map((layer, index) =>
          isTileLayer(layer) && index % 2 ? { ...layer, tilesetId: other.id } : layer,
        ),
      },
      cache = new TileChunkCache(2 * chunkBytes(16), canvas),
      output = createCanvas(128, 96),
      ctx = output.getContext('2d') as unknown as CanvasRenderingContext2D
    ctx.imageSmoothingEnabled = false
    ctx.shadowColor = 'rgba(0, 0, 0, 0)'
    paintTilemapLayers(
      ctx,
      map,
      new Map([
        [data.ts.id, data.ts],
        [other.id, other],
      ]),
      () => data.sheet,
      cache,
      { x: 0, y: 0, width: 128, height: 96 },
    )
    expect(cache.workingSetBytes).toBe(2 * chunkBytes(16))
    expect(cache.underPressure).toBe(false)
    expect(cache.rebuilds).toBe(2)
    expect(cache.usedBytes).toBe(2 * chunkBytes(16))
    cache.clear()
  })
