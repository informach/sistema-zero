import { expect, it } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from './cell'
import { cellMatrix, drawCellImage, visibleChunks } from './chunks'

it('recorta por blocos de 32 sem visitar o resto do mapa', () => {
  expect(visibleChunks({ x: 520, y: 0, width: 100, height: 100 }, 16, 256, 256)).toEqual([
    { col: 1, row: 0 },
  ])
  expect(visibleChunks({ x: 4080, y: 4080, width: 100, height: 100 }, 16, 256, 256)).toEqual([
    { col: 7, row: 7 },
  ])
  expect(visibleChunks({ x: -100, y: -100, width: 50, height: 50 }, 16, 256, 256)).toEqual([])
})
it('os oito giros Tiled dão oito imagens distintas sem mudar a peça', () => {
  const sheet = createCanvas(2, 2),
    s = sheet.getContext('2d')
  for (const [i, color] of ['red', 'green', 'blue', 'white'].entries()) {
    s.fillStyle = color
    s.fillRect(i % 2, Math.floor(i / 2), 1, 1)
  }
  const variants = new Set<string>()
  for (const flags of [
    0,
    CELL_FLIP_H,
    CELL_FLIP_V,
    CELL_FLIP_H | CELL_FLIP_V,
    CELL_FLIP_D,
    CELL_FLIP_D | CELL_FLIP_H,
    CELL_FLIP_D | CELL_FLIP_V,
    CELL_FLIP_D | CELL_FLIP_H | CELL_FLIP_V,
  ]) {
    const canvas = createCanvas(2, 2),
      ctx = canvas.getContext('2d')
    drawCellImage(
      ctx as unknown as CanvasRenderingContext2D,
      sheet as unknown as CanvasImageSource,
      2,
      2,
      makeCell(0, flags),
      0,
      0,
      2,
    )
    variants.add(Array.from(ctx.getImageData(0, 0, 2, 2).data).join(','))
  }
  expect(variants.size).toBe(8)
  expect(cellMatrix(CELL_FLIP_D | CELL_FLIP_H)).toEqual([0, 1, -1, 0])
})

// ---- TileChunkCache -------------------------------------------------------
import { describe } from 'bun:test'
import {
  type AnyTilesetAsset,
  createTilemapAsset,
  createTilesetAsset,
  type TilemapAsset,
} from '../core/project'
import { tileLayerAt } from '../testing/fixtures'
import {
  animatedTile,
  chunkBytes,
  MAP_CHUNK_SIDE,
  paintTilemapLayers,
  TileChunkCache,
  visibleLayerChunks,
} from './chunks'
import { addLayer, setCell } from './tilemapOps'

const novoCanvas = (): HTMLCanvasElement => createCanvas(1, 1) as unknown as HTMLCanvasElement
const folha = (): HTMLCanvasElement => createCanvas(64, 16) as unknown as HTMLCanvasElement
function pecas(count = 4): AnyTilesetAsset {
  const ts = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  return {
    ...ts,
    tiles: Array.from({ length: count }, () => ts.tiles[0]!),
    solid: [],
    platform: [],
  }
}
const mapaGrande = (cols = 64, rows = 64): TilemapAsset =>
  createTilemapAsset({ name: 'fase', tilesetId: 'ts', cols, rows })
const MB = chunkBytes(16)

describe('TileChunkCache', () => {
  it('bloco vazio não gasta canvas nem conta no teto', () => {
    const cache = new TileChunkCache(8 * MB, novoCanvas),
      m = mapaGrande()
    expect(cache.get(m, tileLayerAt(m), pecas(), folha(), 0, 0)).toBeNull()
    expect(cache.size).toBe(0)
    expect(cache.usedBytes).toBe(0)
    expect(cache.rebuilds).toBe(0)
  })
  it('reaproveita o bloco e só refaz quando uma casa DELE muda', () => {
    const cache = new TileChunkCache(8 * MB, novoCanvas),
      ts = pecas(),
      sheet = folha()
    let m = mapaGrande()
    const id = tileLayerAt(m).id
    m = setCell(m, id, 1, 1, 0)
    m = setCell(m, id, 40, 1, 0)
    const a = cache.get(m, tileLayerAt(m), ts, sheet, 0, 0),
      b = cache.get(m, tileLayerAt(m), ts, sheet, 1, 0)
    expect(a).not.toBeNull()
    expect(cache.rebuilds).toBe(2)
    expect(cache.get(m, tileLayerAt(m), ts, sheet, 0, 0)).toBe(a)
    expect(cache.rebuilds).toBe(2)
    // Mudou uma casa do bloco da direita: só ele é pintado de novo.
    const m2 = setCell(m, id, 41, 2, 1)
    expect(cache.get(m2, tileLayerAt(m2), ts, sheet, 0, 0)).toBe(a)
    expect(cache.get(m2, tileLayerAt(m2), ts, sheet, 1, 0)).not.toBe(b)
    expect(cache.rebuilds).toBe(3)
    // Apagar a última peça do bloco solta o canvas dele.
    const m3 = setCell(setCell(m2, id, 40, 1, -1), id, 41, 2, -1)
    expect(cache.get(m3, tileLayerAt(m3), ts, sheet, 1, 0)).toBeNull()
    expect(cache.size).toBe(1)
    expect(cache.usedBytes).toBe(MB)
  })
  it('folha de peças nova refaz o bloco', () => {
    const cache = new TileChunkCache(8 * MB, novoCanvas),
      ts = pecas()
    let m = mapaGrande()
    m = setCell(m, tileLayerAt(m).id, 0, 0, 0)
    const a = cache.get(m, tileLayerAt(m), ts, folha(), 0, 0)
    expect(cache.get(m, tileLayerAt(m), ts, folha(), 0, 0)).not.toBe(a)
    expect(cache.rebuilds).toBe(2)
    expect(cache.size).toBe(1)
  })
  it('o menos usado sai primeiro quando o teto enche', () => {
    const cache = new TileChunkCache(2 * MB, novoCanvas),
      ts = pecas(),
      sheet = folha()
    let m = mapaGrande(96, 32)
    const id = tileLayerAt(m).id
    // Different canonical content is required to fill/evict the LRU.
    for (const col of [0, 32, 64]) m = setCell(m, id, col, 0, col / 32)
    const layer = tileLayerAt(m)
    cache.beginFrame()
    const a = cache.get(m, layer, ts, sheet, 0, 0)
    cache.beginFrame()
    cache.get(m, layer, ts, sheet, 1, 0)
    cache.beginFrame()
    // Usar o primeiro de novo faz o segundo virar o mais antigo.
    expect(cache.get(m, layer, ts, sheet, 0, 0)).toBe(a)
    cache.beginFrame()
    cache.get(m, layer, ts, sheet, 2, 0)
    expect(cache.size).toBe(2)
    expect(cache.usedBytes).toBe(2 * MB)
    cache.beginFrame()
    expect(cache.get(m, layer, ts, sheet, 0, 0)).toBe(a)
    expect(cache.rebuilds).toBe(3)
    cache.get(m, layer, ts, sheet, 1, 0)
    expect(cache.rebuilds).toBe(4)
  })
  it('uma tela maior que o cache respeita o teto e recicla os canvases', () => {
    let allocations = 0
    const cache = new TileChunkCache(2 * MB, () => {
        allocations += 1
        return novoCanvas()
      }),
      ts = pecas(),
      sheet = folha()
    sheet.getContext('2d')!.fillStyle = 'red'
    sheet.getContext('2d')!.fillRect(0, 0, 16, 16)
    sheet.getContext('2d')!.fillStyle = 'green'
    sheet.getContext('2d')!.fillRect(16, 0, 16, 16)
    let m = mapaGrande(128, 96)
    for (let i = 0; i < 3; i++) m = addLayer(m, `c${i}`)
    for (const [index, layer] of m.layers.entries())
      for (let r = 0; r < 96; r += 32)
        for (let c = 0; c < 128; c += 32) {
          m = setCell(m, layer.id, c, r, 0)
          const serial = index * 12 + (r / 32) * 4 + c / 32
          m = setCell(m, layer.id, c + 1 + (serial % 31), r + 1 + Math.floor(serial / 31), 1)
        }
    const tilesets = new Map([['ts', ts]]),
      ctx = createCanvas(128, 96).getContext('2d') as unknown as CanvasRenderingContext2D
    const view = { x: 0, y: 0, width: 128 * 16, height: 96 * 16 }
    paintTilemapLayers(ctx, m, tilesets, () => sheet, cache, view, 1 / 16)
    expect(cache.rebuilds).toBe(48)
    expect(cache.workingSetBytes).toBe(48 * MB)
    expect(cache.usedBytes).toBeLessThanOrEqual(2 * MB)
    for (let r = 0; r < 96; r += 32)
      for (let c = 0; c < 128; c += 32)
        expect(Array.from(ctx.getImageData(c, r, 1, 1).data)).toEqual([255, 0, 0, 255])
    paintTilemapLayers(ctx, m, tilesets, () => sheet, cache, view, 1 / 16)
    expect(cache.usedBytes).toBeLessThanOrEqual(2 * MB)
    expect(allocations).toBe(2)
    cache.clear()
    expect(cache.usedBytes).toBe(0)
    expect(cache.size).toBe(0)
  })
  it('um bloco maior que o teto usa um único canvas de trabalho e clear o libera', () => {
    let allocations = 0
    const cache = new TileChunkCache(1, () => {
      allocations++
      return novoCanvas()
    })
    const ts = pecas(),
      sheet = folha()
    let map = mapaGrande()
    map = setCell(map, tileLayerAt(map).id, 0, 0, 0)
    map = setCell(map, tileLayerAt(map).id, 32, 0, 0)
    const borrowed = cache.get(map, tileLayerAt(map), ts, sheet, 0, 0)
    expect(cache.get(map, tileLayerAt(map), ts, sheet, 1, 0)).toBe(borrowed)
    expect(allocations).toBe(1)
    expect(cache.size).toBe(0)
    expect(cache.usedBytes).toBe(MB)
    cache.clear()
    expect(borrowed?.width).toBe(1)
    expect(borrowed?.height).toBe(1)
    expect(cache.usedBytes).toBe(0)
  })
  it('camadas vazias não custam nada na pintura', () => {
    const cache = new TileChunkCache(32 * MB, novoCanvas),
      ts = pecas()
    let m = mapaGrande(128, 96)
    for (let i = 0; i < 3; i++) m = addLayer(m, `c${i}`)
    m = setCell(m, m.layers[0]!.id, 0, 0, 0)
    const ctx = createCanvas(8, 8).getContext('2d') as unknown as CanvasRenderingContext2D
    const sheet = folha()
    paintTilemapLayers(ctx, m, new Map([['ts', ts]]), () => sheet, cache, {
      x: 0,
      y: 0,
      width: 2048,
      height: 1536,
    })
    expect(cache.size).toBe(1)
    expect(cache.rebuilds).toBe(1)
  })
  it('peça animada só refaz os blocos em que ela aparece', () => {
    const ts: AnyTilesetAsset = {
      ...pecas(),
      animations: {
        '2': [
          { tile: 2, duration: 100 },
          { tile: 3, duration: 100 },
        ],
      },
    }
    const cache = new TileChunkCache(8 * MB, novoCanvas),
      sheet = folha()
    let m = mapaGrande()
    const id = tileLayerAt(m).id
    m = setCell(m, id, 0, 0, 0)
    m = setCell(m, id, 40, 0, 2)
    const layer = tileLayerAt(m)
    const parado = cache.get(m, layer, ts, sheet, 0, 0, 0),
      vivo = cache.get(m, layer, ts, sheet, 1, 0, 0)
    // Mesmo quadro da animação: nada refeito.
    expect(cache.get(m, layer, ts, sheet, 1, 0, 50)).toBe(vivo)
    // Quadro seguinte: só o bloco com a peça animada.
    expect(cache.get(m, layer, ts, sheet, 0, 0, 150)).toBe(parado)
    expect(cache.get(m, layer, ts, sheet, 1, 0, 150)).not.toBe(vivo)
    expect(cache.rebuilds).toBe(3)
  })
})

describe('animatedTile', () => {
  const ts: AnyTilesetAsset = {
    ...pecas(),
    animations: {
      '1': [
        { tile: 1, duration: 100 },
        { tile: 3, duration: 50 },
      ],
    },
  }
  it('peça sem animação é ela mesma', () => {
    expect(animatedTile(ts, 0, 999)).toBe(0)
  })
  it('anda pelos quadros pela duração, dá a volta e aceita tempo negativo', () => {
    expect(animatedTile(ts, 1, 0)).toBe(1)
    expect(animatedTile(ts, 1, 99)).toBe(1)
    expect(animatedTile(ts, 1, 100)).toBe(3)
    expect(animatedTile(ts, 1, 150)).toBe(1)
    expect(animatedTile(ts, 1, -10)).toBe(3)
  })
})

describe('recorte das camadas na pintura', () => {
  it('pula camada escondida, transparente, de colisão e sem peças; desloca o recorte', () => {
    let m = mapaGrande(64, 64)
    m = addLayer(m, 'escondida')
    m = addLayer(m, 'colisao')
    m = addLayer(m, 'deslocada')
    const [base, hidden, collision, shifted] = m.layers.map((l) => l.id) as [
      string,
      string,
      string,
      string,
    ]
    m = {
      ...m,
      layers: m.layers.map((l) =>
        l.id === hidden
          ? { ...l, visible: false }
          : l.id === collision
            ? { ...l, collision: true }
            : l.id === shifted
              ? { ...l, offsetX: 16 * MAP_CHUNK_SIDE, opacity: 0.5 }
              : l,
      ),
    } as TilemapAsset
    const tilesets = new Map([['ts', pecas()]])
    const view = { x: 0, y: 0, width: 100, height: 100 }
    const seen = visibleLayerChunks(m, tilesets, view)
    expect(seen.map((l) => l.layer.id)).toEqual([base, shifted])
    expect(seen[0]?.chunks).toEqual([{ col: 0, row: 0 }])
    // A camada deslocada um bloco para a direita não tem nada nos primeiros 100 px.
    expect(seen[1]?.chunks).toEqual([])
    expect(seen[1]?.opacity).toBe(0.5)
    expect(visibleLayerChunks(m, tilesets, view, true).map((l) => l.layer.id)).toContain(collision)
    expect(visibleLayerChunks(m, new Map(), view)).toEqual([])
  })
})
