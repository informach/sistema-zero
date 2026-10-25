/**
 * The battle arena: a sky with clouds, hills on the horizon and a meadow, painted as one picture
 * and cut into 32 px tiles (repeated tiles share one piece). The game draws it once into its
 * background surface. Also the round grassy floor each monster stands on.
 */

import type { MapDrawing, TilesetDrawing } from '../../drawing'
import { type Color, mix, Px, random } from '../../pixel'
import { bounds } from './kit'

const TILE = 32
const COLS = 20
const ROWS = 12
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x: number, y: number) => (BAYER[(y % 4) * 4 + (x % 4)]! + 0.5) / 16

const SKY = ['#6cbcec', '#82c8f0', '#98d4f4', '#b0e0f6', '#c8ecf8', '#dcf4fa']
const HILL_FAR = ['#8ec8b8', '#a2d4c0']
const HILL_NEAR = ['#5aa86a', '#6cba72', '#4a9a5e']
const GRASS = ['#4f9e4a', '#5aab50', '#66b856', '#72c25c', '#7ecb62']
const GRASS_DARK = '#3f8a42'
const GRASS_LIGHT = '#a2dc76'
const FLOWERS = ['#fff4c8', '#ffd84a', '#f08ab8']
const CLOUD = ['#ffffff', '#eef8fc', '#cfe6f2', '#b2d4e8']

/** Horizon line (Pinta pixels): the far hills sit above it, the meadow below. */
const HORIZON = 104

function picture(): Px {
  const width = COLS * TILE
  const height = ROWS * TILE
  const img = new Px(width, height)
  // Sky: a dithered gradient, the same on every column.
  for (let y = 0; y < HORIZON; y++) {
    const t = (y / HORIZON) * (SKY.length - 1)
    for (let x = 0; x < width; x++) {
      const band = Math.min(SKY.length - 1, Math.floor(t + bayer(x, y) - 0.5 + 0.5))
      img.set(x, y, SKY[Math.max(0, band)]!)
    }
  }
  // Clouds (two, at fixed places).
  const cloud = (cx: number, cy: number, scale: number) => {
    const c = new Px(width, height)
    for (const [dx, dy, r] of [
      [-26, 6, 12],
      [-8, -2, 16],
      [12, 0, 14],
      [28, 7, 10],
      [0, 8, 14],
    ] as const)
      c.circle(cx + dx * scale, cy + dy * scale, r * scale, CLOUD[0]!)
    c.rect(cx - 40 * scale, cy + 8 * scale, 80 * scale, 30 * scale, null)
    const box = bounds(c)!
    for (let y = box.y; y < box.y + box.height; y++)
      for (let x = box.x; x < box.x + box.width; x++) {
        if (!c.get(x, y)) continue
        const below = !c.get(x, y + 2) || !c.get(x + 2, y + 2)
        const deep = !c.get(x, y + 1)
        img.set(x, y, deep ? CLOUD[3]! : below ? CLOUD[2]! : y < box.y + 4 ? CLOUD[0]! : CLOUD[1]!)
      }
  }
  cloud(92, 34, 1.2)
  cloud(300, 22, 0.9)
  cloud(470, 46, 1)
  // Far hills: a soft periodic silhouette (period 128 px).
  const far = (x: number) =>
    HORIZON - 14 - 10 * Math.sin((x / 128) * Math.PI * 2) - 4 * Math.sin((x / 64) * Math.PI * 2 + 1)
  const near = (x: number) =>
    HORIZON - 4 - 6 * Math.sin((x / 128) * Math.PI * 2 + 2.2) - 2 * Math.sin((x / 32) * Math.PI * 2)
  for (let x = 0; x < width; x++) {
    for (let y = Math.round(far(x)); y < HORIZON + 4; y++)
      img.set(x, y, y < far(x) + 3 ? HILL_FAR[1]! : HILL_FAR[0]!)
    for (let y = Math.round(near(x)); y < HORIZON + 4; y++)
      img.set(
        x,
        y,
        y < near(x) + 2 ? HILL_NEAR[1]! : bayer(x, y) < 0.3 ? HILL_NEAR[2]! : HILL_NEAR[0]!,
      )
  }
  // Meadow: bands that widen towards the camera, with tufts and a few flowers (period 64 px).
  const rng = random(77)
  // Each row of tiles has its own scatter (repeating every 64 px along the row).
  const tuftsOf = Array.from({ length: ROWS }, () =>
    Array.from({ length: 9 }, () => [rng.int(0, 63), rng.int(0, 31)] as [number, number]),
  )
  const flowersOf = Array.from({ length: ROWS }, () =>
    Array.from(
      { length: 2 },
      () => [rng.int(2, 61), rng.int(4, 28), rng.int(0, 2)] as [number, number, number],
    ),
  )
  for (let y = HORIZON + 4; y < height; y++) {
    const depth = (y - HORIZON) / (height - HORIZON)
    const t = depth * (GRASS.length - 1)
    for (let x = 0; x < width; x++) {
      const band = Math.min(GRASS.length - 1, Math.max(0, Math.floor(t + bayer(x, y) - 0.5 + 0.5)))
      img.set(x, y, GRASS[band]!)
    }
  }
  for (let row = 4; row < ROWS; row++)
    for (let x = 0; x < width; x += 64)
      for (const [tx, ty] of tuftsOf[row]!) {
        const y = row * TILE + ty
        if (y < HORIZON + 8) continue
        const px = x + tx
        const big = row > 6
        img
          .set(px, y, GRASS_DARK)
          .set(px - 1, y + 1, GRASS_DARK)
          .set(px + 1, y + 1, GRASS_DARK)
        img.set(px, y - 1, GRASS_LIGHT)
        if (big) img.set(px + 1, y - 2, GRASS_LIGHT).set(px - 2, y + 1, GRASS_DARK)
      }
  for (let row = 5; row < ROWS; row++)
    for (let x = 0; x < width; x += 64)
      for (const [fx, fy, kind] of flowersOf[row]!) {
        const y = row * TILE + fy
        const color = FLOWERS[kind]!
        img
          .set(x + fx, y, color)
          .set(x + fx - 1, y, color)
          .set(x + fx + 1, y, color)
        img.set(x + fx, y - 1, color).set(x + fx, y + 1, '#3f8a42')
      }
  return img
}

/** Cut the picture in tiles; identical tiles become one piece. */
export function arena(): { tileset: TilesetDrawing; map: MapDrawing } {
  const img = picture()
  const tiles: Px[] = []
  const index = new Map<string, number>()
  const cells: number[] = []
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      const tile = new Px(TILE, TILE)
      for (let y = 0; y < TILE; y++)
        for (let x = 0; x < TILE; x++) tile.set(x, y, img.get(col * TILE + x, row * TILE + y))
      const key = tile.data.join(',')
      let at = index.get(key)
      if (at === undefined) {
        at = tiles.length
        tiles.push(tile)
        index.set(key, at)
      }
      cells.push(at)
    }
  if (tiles.length > 64)
    throw new Error(`A arena tem ${tiles.length} peças; o Pinta guarda até 64.`)
  const tileset: TilesetDrawing = {
    kind: 'tileset',
    name: 'arena-pecas',
    tileSize: TILE,
    tiles: tiles.map((image) => ({ image })),
  }
  return {
    tileset,
    map: {
      kind: 'map',
      name: 'arena',
      cols: COLS,
      rows: ROWS,
      layers: [{ type: 'tiles', name: 'Fundo', tileset, cells }],
    },
  }
}

/** The round patch of grass under a monster (128×30, 256×60 in the game). */
export function floor(): Px {
  const f = new Px(128, 30)
  f.ellipse(1, 6, 126, 23, '#7a5634')
  f.ellipse(1, 3, 126, 22, '#4f9e4a')
  f.ellipse(4, 4, 120, 19, '#66b856')
  f.ellipse(14, 6, 96, 13, '#7ecb62')
  f.ellipse(34, 7, 52, 7, '#94d86e')
  for (let x = 4; x < 124; x += 3) {
    const y = Math.round(14 + Math.sqrt(Math.max(0, 1 - ((x - 64) / 62) ** 2)) * 10)
    if (f.get(x, y + 1) === '#7a5634' || f.get(x, y) === '#7a5634') f.set(x, y, '#3f8a42')
  }
  for (const [x, y] of [
    [20, 10],
    [40, 18],
    [70, 9],
    [96, 16],
    [110, 11],
    [56, 20],
    [84, 21],
  ] as const)
    f.set(x, y, '#3f8a42')
      .set(x - 1, y + 1, '#3f8a42')
      .set(x + 1, y + 1, '#3f8a42')
      .set(x, y - 1, '#a2dc76')
  f.rim(null, '#5a3c22')
  return f.outline(mix('#2a3a1c', '#000000', 0.2) as Color)
}
