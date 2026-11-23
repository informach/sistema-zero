import { heapStats } from 'bun:jsc'
import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { createCanvas } from '@napi-rs/canvas'
import {
  encodePintaRegionLayers,
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_CHUNK_BYTES,
  PINTA_REGION_LIMITS,
  type PintaRegionBounds,
} from '@sistemazero/core/creations'
import type { PintaProjectedSceneWire } from '@sistemazero/core/studio/pinta-projected-scene'
import type { PintaRegionSceneWire } from '@sistemazero/core/studio/pinta-region-scene'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { regionVila } from '../../testing/regionVila'
import { buildScenePackage } from '../scenePackage'
import { createRegionPhaserPlayer, readRegionPhaserWorld } from './regionPlayer'

test('the runnable package keeps local Phaser, canonical sparse maps, resources and links', async () => {
  const { map, cabana, assets } = regionVila()
  const files = await buildScenePackage(map, assets, 'phaser', { imageOf: nativeImageOf })
  expect(createHash('sha256').update(String(files['phaser.min.js'])).digest('hex')).toBe(
    'e92ddef111ba42e92d316979c732311757093688ea1810591cb7aa2858eba7a7',
  )
  expect(files['PHASER-LICENSE.txt']).toContain('MIT')
  expect(files['index.html']).toContain('<script src="main.js">')
  // The player composes the chunks of maps.json; Phaser never parses a Tiled map here.
  for (const call of ['tilemapTiledJSON', 'make.tilemap', 'mapa.json'])
    expect(String(files['main.js'])).not.toContain(call)
  const source = JSON.parse(String(files['maps.json']))
  const world = readRegionPhaserWorld(source, JSON.parse(String(files['start.json'])))
  const player = createRegionPhaserPlayer(world)
  expect([...world.maps.keys()]).toEqual([map.id, cabana.id])
  expect(player.scene.origin).toEqual(map.origin)
  expect(player.scene.layers).toHaveLength(18)
  expect(player.position).toEqual({ x: 32, y: 32 })
  expect(player.platformer).toBe(false)
  const badPath = structuredClone(source)
  badPath[cabana.id].tilesets[0].image = '../../fora.png'
  expect(() => readRegionPhaserWorld(badPath, map.id)).toThrow('referência de imagem')
})

function platformMap(physics: 'legacy' | 'precise'): PintaRegionSceneWire {
  const bounds = { col: 0, row: 0, cols: 16, rows: 16 }
  const cells = new Int16Array(32 * 32).fill(-1)
  for (let col = 0; col < 16; col++) {
    cells[6 * 32 + col] = 1
    cells[8 * 32 + col] = 0
  }
  const wire = encodePintaRegionLayers(
    [{ kind: 'regions', version: 1, side: 32, chunks: [{ col: 0, row: 0, cells }] }],
    bounds,
  )![0]!
  return {
    version: 4,
    id: 'plataforma',
    name: 'Plataforma',
    tileSize: 16,
    cols: bounds.cols,
    rows: bounds.rows,
    origin: { col: 0, row: 0 },
    physics,
    tilesets: [
      {
        id: 'folha',
        name: 'Peças',
        image: 'mapas/mapa-0/images/tiles-0.png',
        columns: 2,
        count: 2,
        solid: [0],
        platform: [1],
      },
    ],
    layers: [
      { id: 'chao', kind: 'tiles', name: 'Chão', visible: true, tilesetId: 'folha', cells: wire },
      {
        id: 'objetos',
        kind: 'objects',
        name: 'Objetos',
        visible: true,
        objects: [
          {
            id: 'inicio',
            type: '',
            name: 'Início',
            shape: 'point',
            role: 'start',
            x: 16,
            y: 112,
            width: 0,
            height: 0,
            properties: {},
          },
        ],
      },
    ],
  }
}

for (const physics of ['legacy', 'precise'] as const)
  test(`regional Phaser ${physics} can jump through a one-way platform and land on it`, () => {
    const scene = platformMap(physics)
    const player = createRegionPhaserPlayer(readRegionPhaserWorld({ [scene.id]: scene }, scene.id))
    let time = 0
    const step = (vertical = 0) => {
      time += 16
      player.advance(0, vertical, time, 16)
    }
    for (let i = 0; i < 100; i++) step()
    expect(player.platformer).toBe(true)
    expect(player.position.y).toBeGreaterThan(116)
    step(-1)
    let highest = player.position.y
    for (let i = 0; i < 150; i++) {
      step()
      highest = Math.min(highest, player.position.y)
    }
    expect(highest).toBeLessThan(88)
    expect(player.position.y).toBeCloseTo(90, 5)
  })

test('admission sums regional grids across maps and binds image folders independently of key order', () => {
  function mapWithRegions(id: string, folder: number, count: number) {
    const scene = platformMap('legacy')
    const layer = scene.layers[0]
    if (layer?.kind !== 'tiles') throw new Error('A folha de teste está ausente.')
    const data = layer.cells.chunks[0]?.data
    if (!data) throw new Error('As regiões de teste estão ausentes.')
    return {
      ...scene,
      id,
      cols: 10000,
      rows: 10000,
      layers: [
        {
          ...layer,
          cells: {
            ...layer.cells,
            chunks: Array.from({ length: count }, (_, index) => ({
              col: index % 32,
              row: Math.floor(index / 32),
              data,
            })),
          },
        },
      ],
      tilesets: scene.tilesets.map((sheet) => ({
        ...sheet,
        image: `mapas/mapa-${folder}/images/tiles-0.png`,
      })),
    }
  }
  const full = mapWithRegions('2', 0, 2047)
  const one = mapWithRegions('1', 1, 1)
  const atLimit = readRegionPhaserWorld({ '2': full, '1': one }, '2')
  expect(atLimit.rootId).toBe('2')
  expect(atLimit.maps.get('2')?.context.cols).toBe(10000)
  const two = mapWithRegions('1', 1, 2)
  expect(() => readRegionPhaserWorld({ '2': full, '1': two }, '2')).toThrow('dados inválidos')
  const impostor = mapWithRegions('1', 0, 1)
  expect(() => readRegionPhaserWorld({ '2': full, '1': impostor }, '2')).toThrow(
    'referência de imagem',
  )
})

test('a projected square map keeps the same explicitly selected legacy motion', () => {
  const original = platformMap('legacy')
  const { sets: _sets, ...root } = original
  const projection: PintaProjectedSceneWire = {
    ...root,
    version: 5,
    physics: 'legacy',
    projection: { kind: 'orthogonal', tileWidth: 16, tileHeight: 16 },
  }
  const players = [original, projection].map((scene) =>
    createRegionPhaserPlayer(readRegionPhaserWorld({ [scene.id]: scene }, scene.id)),
  )
  for (let frame = 1; frame <= 160; frame++) {
    for (const player of players) player.advance(0, frame === 65 ? -1 : 0, frame * 16, 16)
    expect(players[0]!.position).toEqual(players[1]!.position)
  }
})

/** The same four chunks, start and art; only the authored extent changes. */
function sparseMap(bounds: PintaRegionBounds): PintaRegionSceneWire {
  const base = platformMap('precise')
  const floor = base.layers[0]
  if (floor?.kind !== 'tiles') throw new Error('A camada de teste está ausente.')
  const [ground] = encodePintaRegionLayers(
    [
      {
        kind: 'regions',
        version: 1,
        side: 32,
        chunks: [-2, -1, 0, 1].map((n) => {
          const cells = new Int16Array(PINTA_REGION_CELL_COUNT).fill(-1)
          for (let i = 0; i < cells.length; i += 5) cells[i] = (i + n) & 1
          return { col: n, row: n, cells }
        }),
      },
    ],
    bounds,
  )!
  return {
    ...base,
    cols: bounds.cols,
    rows: bounds.rows,
    origin: { col: bounds.col, row: bounds.row },
    layers: [{ ...floor, cells: ground! }, ...base.layers.slice(1)],
  }
}

test('a sparse 10,000 × 10,000 Phaser world allocates and draws by chunks, never by its extent', () => {
  const canvas = createCanvas(640, 480)
  const ctx = canvas.getContext('2d')
  const sheet = createCanvas(32, 16)
  const paint = sheet.getContext('2d')
  paint.fillStyle = '#b4532a'
  paint.fillRect(0, 0, 16, 16)
  paint.fillStyle = '#2a6bb4'
  paint.fillRect(16, 0, 16, 16)
  const art = new Map([['folha', sheet as unknown as CanvasImageSource]])
  function play(scene: PintaRegionSceneWire) {
    Bun.gc(true)
    const before = heapStats()
    const world = readRegionPhaserWorld({ [scene.id]: scene }, scene.id)
    const player = createRegionPhaserPlayer(world)
    for (let frame = 1; frame <= 30; frame++) {
      player.advance(1, 0, frame * 16, 16)
      player.draw(ctx as unknown as CanvasRenderingContext2D, art, frame * 16)
    }
    Bun.gc(true)
    const after = heapStats()
    let cellBytes = 0
    for (const { context } of world.maps.values())
      for (const layer of context.layers)
        if (layer.kind === 'tiles')
          for (const chunk of layer.cells.chunks) cellBytes += chunk.cells.byteLength
    return {
      // Measured while `world` is still referenced below.
      retained: after.heapSize + after.extraMemorySize - before.heapSize - before.extraMemorySize,
      cellBytes,
      extent: player.scene.cols * player.scene.rows,
      position: player.position,
      pixels: Buffer.from(ctx.getImageData(0, 0, 640, 480).data),
    }
  }
  const compact = { col: -64, row: -64, cols: 128, rows: 128 }
  const widest = {
    col: -PINTA_REGION_LIMITS.maxAxis / 2,
    row: -PINTA_REGION_LIMITS.maxAxis / 2,
    cols: PINTA_REGION_LIMITS.maxAxis,
    rows: PINTA_REGION_LIMITS.maxAxis,
  }
  play(sparseMap(compact)) // warms lazily created module state
  const small = play(sparseMap(compact))
  const large = play(sparseMap(widest))
  expect(large.extent).toBe(100_000_000)
  // Index storage is the stored chunks, as in the compact map.
  expect(small.cellBytes).toBe(4 * PINTA_REGION_CHUNK_BYTES)
  expect(large.cellBytes).toBe(small.cellBytes)
  // One dense Int16 layer of this extent would retain 200,000,000 bytes, and Phaser's
  // `infinite` Tiled parser would retain one Tile object per cell. Neither path is used.
  const mebibyte = 1024 * 1024
  expect(large.retained).toBeLessThan(8 * mebibyte)
  expect(Math.abs(large.retained - small.retained)).toBeLessThan(2 * mebibyte)
  expect(large.position).toEqual(small.position)
  expect(large.pixels.equals(small.pixels)).toBe(true)
  expect(new Set(large.pixels.subarray(0, 4 * 640 * 120)).size).toBeGreaterThan(4)
})
