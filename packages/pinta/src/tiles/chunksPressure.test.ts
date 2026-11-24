import { expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import { createTilemapAsset, createTilesetAsset, type TilemapAsset } from '../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from './cell'
import { chunkBytes, paintTilemapLayers, TileChunkCache } from './chunks'

function fixture(transformed = true, layerOpacity = true) {
  const flags = [
    0,
    CELL_FLIP_H,
    CELL_FLIP_V,
    CELL_FLIP_H | CELL_FLIP_V,
    CELL_FLIP_D,
    CELL_FLIP_D | CELL_FLIP_H,
    CELL_FLIP_D | CELL_FLIP_V,
    CELL_FLIP_D | CELL_FLIP_H | CELL_FLIP_V,
  ]
  const tileset = createTilesetAsset({ name: 'cores e transparência', tileSize: 16 })
  tileset.tiles = Array.from({ length: 8 }, () => tileset.tiles[0]!)
  tileset.animations = {
    '1': [
      { tile: 2, duration: 80 },
      { tile: 3, duration: 120 },
    ],
  }
  const sheet = createCanvas(128, 16)
  const ctx = sheet.getContext('2d')
  for (let tile = 0; tile < 8; tile++)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        ctx.fillStyle = `rgba(${tile * 31},${x * 16},${y * 16},${((x + y + tile) % 5) / 4})`
        ctx.fillRect(tile * 16 + x, y, 1, 1)
      }
  const base = createTilemapAsset({ name: 'referência', tilesetId: tileset.id, cols: 64, rows: 64 })
  const map: TilemapAsset = {
    ...base,
    layers: Array.from({ length: 5 }, (_, layer) => ({
      id: `layer-${layer}`,
      name: `Camada ${layer}`,
      visible: true,
      opacity: layerOpacity && layer % 2 ? 0.45 : 1,
      offsetX: layer * 4,
      offsetY: -layer * 4,
      cells: Int16Array.from({ length: 4096 }, (_, i) =>
        i % 11 === 0 ? -1 : makeCell((i + layer) % 8, transformed ? flags[(i + layer) % 8] : 0),
      ),
    })),
  }
  return { map, tileset, sheet: sheet as unknown as HTMLCanvasElement }
}

type Context = CanvasRenderingContext2D
function paint(
  data: ReturnType<typeof fixture>,
  budget: number,
  scale: number,
  time: number,
  configure: (ctx: Context) => void = () => {},
) {
  const canvas = createCanvas(256, 192)
  const ctx = canvas.getContext('2d') as unknown as Context
  ctx.imageSmoothingEnabled = false
  // Napi defaults to opaque black; browsers default to transparent black.
  ctx.shadowColor = 'rgba(0, 0, 0, 0)'
  ctx.fillStyle = '#183442'
  ctx.fillRect(0, 0, 256, 192)
  ctx.translate(-16, -12)
  configure(ctx)
  const before = { alpha: ctx.globalAlpha, transform: ctx.getTransform() }
  let allocations = 0
  const cache = new TileChunkCache(budget, () => {
    allocations++
    return createCanvas(1, 1) as unknown as HTMLCanvasElement
  })
  paintTilemapLayers(
    ctx,
    data.map,
    new Map([[data.tileset.id, data.tileset]]),
    () => data.sheet,
    cache,
    { x: 16 / scale, y: 12 / scale, width: 256 / scale, height: 192 / scale },
    scale,
    time,
  )
  expect(ctx.globalAlpha).toBe(before.alpha)
  expect(ctx.getTransform()).toEqual(before.transform)
  const pixels = Array.from(ctx.getImageData(0, 0, 256, 192).data)
  const result = { pixels, allocations, rebuilds: cache.rebuilds, bytes: cache.usedBytes }
  cache.clear()
  return result
}

for (const scale of [0.25, 0.5, 1, 2])
  for (const time of [0, 100, 250])
    test(`pressão: pixels e animação iguais sem canvas intermediário, escala ${scale}, t=${time}`, () => {
      const data = fixture(Number.isInteger(scale), false)
      const reference = paint(data, 128 * 1024 * 1024, scale, time)
      const direct = paint(data, 1, scale, time)
      const mismatch = direct.pixels.findIndex((value, index) => value !== reference.pixels[index])
      expect(
        mismatch,
        `first values: ${direct.pixels.slice(Math.max(0, mismatch - 3), mismatch + 5)} / ${reference.pixels.slice(Math.max(0, mismatch - 3), mismatch + 5)}`,
      ).toBe(-1)
      expect(direct.allocations).toBe(0)
      expect(direct.bytes).toBe(0)
      expect(direct.rebuilds).toBe(0)
    })

for (const scale of [0.25, 0.5, 1, 2])
  test(`opacidade de camada conserva a composição canônica sob pressão no zoom ${scale}`, () => {
    const data = fixture(false),
      reference = paint(data, 128 * 1024 * 1024, scale, 100),
      actual = paint(data, 1, scale, 100)
    expect(actual.pixels.every((value, index) => value === reference.pixels[index])).toBe(true)
    expect(actual.rebuilds).toBeGreaterThan(0)
    expect(actual.allocations).toBeLessThanOrEqual(1)
    expect(actual.bytes).toBe(chunkBytes(16))
  })

for (const scale of [0.25, 0.5, 1.5, 2.5])
  test(`peças transformadas conservam a amostragem anterior no zoom ${scale}`, () => {
    const data = fixture()
    const reference = paint(data, 128 * 1024 * 1024, scale, 100)
    const pressure = paint(data, 1, scale, 100)
    expect(pressure.pixels.every((value, index) => value === reference.pixels[index])).toBe(true)
    expect(pressure.rebuilds).toBeGreaterThan(0)
  })

for (const [name, configure] of [
  [
    'suavização',
    (ctx: Context) => {
      ctx.imageSmoothingEnabled = true
    },
  ],
  [
    'translação fracionária',
    (ctx: Context) => {
      ctx.translate(0.5, 0)
    },
  ],
  [
    'rotação',
    (ctx: Context) => {
      ctx.rotate(0.1)
    },
  ],
  [
    'composição',
    (ctx: Context) => {
      ctx.globalCompositeOperation = 'multiply'
    },
  ],
  [
    'sombra',
    (ctx: Context) => {
      ctx.shadowColor = 'red'
      ctx.shadowBlur = 2
    },
  ],
  [
    'filtro',
    (ctx: Context) => {
      ctx.filter = 'blur(1px)'
    },
  ],
] as const)
  test(`preserva o renderer geral com ${name}`, () => {
    const data = fixture()
    const reference = paint(data, 128 * 1024 * 1024, 0.5, 100, configure)
    const pressure = paint(data, 1, 0.5, 100, configure)
    expect(pressure.pixels.every((value, index) => value === reference.pixels[index])).toBe(true)
    expect(pressure.rebuilds).toBeGreaterThan(0)
  })
