import { expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import { createTilemapAsset, createTilesetAsset, isTileLayer } from '../core/project'
import { tileLayerAt } from '../testing/fixtures'
import { chunkBytes, chunkFingerprint, TileChunkCache } from './chunks'
import { addLayer, setCell } from './tilemapOps'

const canvas = () => createCanvas(1, 1) as unknown as HTMLCanvasElement
function fixture() {
  const seed = createTilesetAsset({ name: 'cores', tileSize: 16 }),
    ts = { ...seed, tiles: Array.from({ length: 4 }, () => seed.tiles[0]!) },
    sheet = createCanvas(64, 16),
    ctx = sheet.getContext('2d')
  for (const [i, color] of ['red', 'green', 'blue', 'white'].entries()) {
    ctx.fillStyle = color
    ctx.fillRect(i * 16, 0, 16, 16)
  }
  let map = addLayer(
    createTilemapAsset({ name: 'mapa', tilesetId: ts.id, cols: 64, rows: 32 }),
    'frente',
  )
  for (const layer of map.layers) for (const col of [0, 32]) map = setCell(map, layer.id, col, 0, 0)
  return { map, ts, sheet: sheet as unknown as HTMLCanvasElement }
}

test('conteúdo idêntico de outra posição/camada compartilha um canvas canônico sem aliases', () => {
  const { map, ts, sheet } = fixture(),
    cache = new TileChunkCache(2 * chunkBytes(16), canvas),
    first = cache.get(map, tileLayerAt(map), ts, sheet, 0, 0)
  expect(first).not.toBeNull()
  for (const layer of map.layers) {
    if (!isTileLayer(layer)) throw Error('Camada de peças esperada na fixture')
    for (const col of [0, 1]) expect(cache.get(map, layer, ts, sheet, col, 0)).toBe(first)
  }
  expect(cache.rebuilds).toBe(1)
  expect(cache.size).toBe(1)
  expect(cache.usedBytes).toBe(chunkBytes(16))
  cache.clear()
  expect(cache.usedBytes).toBe(0)
  const rebuilt = cache.get(map, tileLayerAt(map), ts, sheet, 1, 0)
  expect(rebuilt).not.toBe(first)
  expect(Array.from(rebuilt!.getContext('2d')!.getImageData(0, 0, 1, 1).data)).toEqual([
    255, 0, 0, 255,
  ])
  cache.clear()
})

test('mudar o dono original não altera a imagem emprestada por outro conteúdo', () => {
  const { map, ts, sheet } = fixture(),
    cache = new TileChunkCache(2 * chunkBytes(16), canvas),
    layer = tileLayerAt(map)
  cache.get(map, layer, ts, sheet, 0, 0)
  cache.get(map, layer, ts, sheet, 1, 0)
  const next = setCell(map, layer.id, 0, 0, 2)
  const blue = cache.get(next, tileLayerAt(next), ts, sheet, 0, 0)
  expect(Array.from(blue!.getContext('2d')!.getImageData(0, 0, 1, 1).data)).toEqual([
    0, 0, 255, 255,
  ])
  const red = cache.get(next, tileLayerAt(next), ts, sheet, 1, 0)
  expect(Array.from(red!.getContext('2d')!.getImageData(0, 0, 1, 1).data)).toEqual([255, 0, 0, 255])
  expect(red).not.toBe(blue)
  expect(cache.usedBytes).toBeLessThanOrEqual(2 * chunkBytes(16))
  cache.clear()
})

test('o contrato de identidade inclui a contagem de peças mesmo quando a folha é compartilhada', () => {
  const { map, ts, sheet } = fixture(),
    cache = new TileChunkCache(2 * chunkBytes(16), canvas),
    layer = tileLayerAt(map),
    next = setCell(map, layer.id, 1, 0, 3)
  const complete = cache.get(next, tileLayerAt(next), ts, sheet, 0, 0)
  expect(Array.from(complete!.getContext('2d')!.getImageData(16, 0, 1, 1).data)).toEqual([
    255, 255, 255, 255,
  ])
  const shorter = { ...ts, tiles: ts.tiles.slice(0, 1) },
    trimmed = cache.get(next, tileLayerAt(next), shorter, sheet, 0, 0)
  expect(Array.from(trimmed!.getContext('2d')!.getImageData(16, 0, 1, 1).data)).toEqual([
    0, 0, 0, 0,
  ])
  cache.clear()
})

test('colisões reais do fingerprint não autorizam compartilhar células diferentes', () => {
  const values = (seed: number) => {
      const out = new Int16Array(1024).fill(-1)
      let state = seed
      for (let i = 0; i < 32; i++) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0
        out[i] = (state >>> 24) & 3
      }
      return out
    },
    a = values(109921),
    b = values(154913)
  expect(chunkFingerprint(a)).toBe(chunkFingerprint(b))
  expect(a).not.toEqual(b)
  const { map, ts, sheet } = fixture(),
    cells = new Int16Array(64 * 32).fill(-1)
  for (let row = 0; row < 32; row++) {
    cells.set(a.subarray(row * 32, (row + 1) * 32), row * 64)
    cells.set(b.subarray(row * 32, (row + 1) * 32), row * 64 + 32)
  }
  const source = { ...map, layers: [{ ...tileLayerAt(map), cells }] },
    layer = tileLayerAt(source),
    cache = new TileChunkCache(2 * chunkBytes(16), canvas),
    first = cache.get(source, layer, ts, sheet, 0, 0)!,
    pixelsA = first.getContext('2d')!.getImageData(0, 0, 512, 16).data,
    second = cache.get(source, layer, ts, sheet, 1, 0)!,
    pixelsB = second.getContext('2d')!.getImageData(0, 0, 512, 16).data,
    colors = [
      [255, 0, 0, 255],
      [0, 128, 0, 255],
      [0, 0, 255, 255],
      [255, 255, 255, 255],
    ]
  expect(second).not.toBe(first)
  for (let i = 0; i < 32; i++) {
    const colorA = colors[a[i]!],
      colorB = colors[b[i]!]
    if (!colorA || !colorB) throw Error('Índice de cor inválido na fixture')
    expect(Array.from(pixelsA.subarray(i * 16 * 4, i * 16 * 4 + 4))).toEqual(colorA)
    expect(Array.from(pixelsB.subarray(i * 16 * 4, i * 16 * 4 + 4))).toEqual(colorB)
  }
  expect(cache.rebuilds).toBe(2)
  expect(cache.usedBytes).toBe(2 * chunkBytes(16))
  cache.clear()
})

test('o compartilhamento conserva a fase da animação e troca a versão da folha', () => {
  const { map, ts: plain, sheet } = fixture(),
    ts = {
      ...plain,
      animations: {
        '0': [
          { tile: 0, duration: 80 },
          { tile: 1, duration: 120 },
        ],
      },
    },
    cache = new TileChunkCache(3 * chunkBytes(16), canvas),
    layer = tileLayerAt(map)
  const red = cache.get(map, layer, ts, sheet, 0, 0, 0)
  expect(cache.get(map, layer, ts, sheet, 1, 0, 50)).toBe(red)
  const green = cache.get(map, layer, ts, sheet, 1, 0, 100)
  expect(cache.get(map, layer, ts, sheet, 0, 0, 100)).toBe(green)
  expect(Array.from(green!.getContext('2d')!.getImageData(0, 0, 1, 1).data)).toEqual([
    0, 128, 0, 255,
  ])
  expect(cache.rebuilds).toBe(2)
  const other = createCanvas(64, 16),
    ctx = other.getContext('2d')
  ctx.fillStyle = 'blue'
  ctx.fillRect(16, 0, 16, 16)
  const blue = cache.get(map, layer, ts, other as unknown as HTMLCanvasElement, 0, 0, 100)
  expect(Array.from(blue!.getContext('2d')!.getImageData(0, 0, 1, 1).data)).toEqual([
    0, 0, 255, 255,
  ])
  expect(cache.rebuilds).toBe(3)
  cache.clear()
})
