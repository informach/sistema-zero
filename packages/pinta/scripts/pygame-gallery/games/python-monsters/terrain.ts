/**
 * Python Monsters terrain: the tiles of the overworld drawn from a small description language.
 *
 * Each original tile is described by what it MEANS (`TileSpec`): a body material, strips of
 * another material hugging some sides, round pockets in some corners, a rocky ridge along that
 * border, stairs. The renderer paints every description with this game's own textures. Borders
 * always cross a tile edge at the same offset and every texture repeats every 32 px, so tiles
 * join seamlessly in any arrangement the maps use. `ORIGINAL_TILES` is the table "original tile
 * → new tile" the map converter uses.
 */
import { Px } from '../../pixel'
import { bayer, hash, INK, PAL, periodicNoise } from './kit'

export const TILE = 32

/** G grass, S sand, N snow, I frozen lake, W water, R rock, V the void around indoor maps. */
export type Mat = 'G' | 'S' | 'N' | 'I' | 'W' | 'R' | 'V'
type Side = 'T' | 'R' | 'B' | 'L'
type Corner = 'TL' | 'TR' | 'BR' | 'BL'

export interface TileSpec {
  body: Mat
  /** Material of the strips and pockets. */
  strip?: Mat
  /** edge: a plain material border; ridge: a line of rocks on the border; cliff: a rock mass. */
  kind?: 'edge' | 'ridge' | 'cliff'
  sides?: string
  pockets?: Corner[]
  stairs?: 'top' | 'full' | 'left' | 'right'
  /** Variant of a plain tile (small decorations), chosen per map cell. */
  variant?: number
  /** Animation frame (water). */
  frame?: number
}

const OFFSET = { edge: 11, ridge: 8, cliff: 5 } as const
const ROUND = { edge: 9, ridge: 7, cliff: 7 } as const

/** Border wobble along an edge; zero at both ends so neighbours always meet. */
function wobble(t: number, kind: 'edge' | 'ridge' | 'cliff', seed: number): number {
  const a = kind === 'cliff' ? 0.7 : 1.3
  const phase = Math.PI * 2 * (t / TILE)
  return a * Math.sin(phase + 0) * (seed % 2 ? 1 : -1) + 0.6 * Math.sin(phase * 2) + 0.4 * Math.sin(phase * 3 + seed * 0)
}

/** Positive inside the strips/pockets, negative in the body (a soft signed distance). */
function field(spec: TileSpec, x: number, y: number): number {
  const kind = spec.kind ?? 'edge'
  const o = OFFSET[kind]
  const rc = ROUND[kind]
  const sides = spec.sides ?? ''
  const has = (side: Side) => sides.includes(side)
  let d = -Infinity
  const seed = kind === 'edge' ? 1 : kind === 'ridge' ? 2 : 3
  const t = (side: Side) => {
    if (side === 'T') return o + wobble(x, kind, seed) - y
    if (side === 'B') return y - (TILE - o - wobble(x, kind, seed + 1))
    if (side === 'L') return o + wobble(y, kind, seed + 1) - x
    return x - (TILE - o - wobble(y, kind, seed))
  }
  for (const side of ['T', 'R', 'B', 'L'] as Side[]) if (has(side)) d = Math.max(d, t(side))
  // Rounded body corners where two neighbouring sides both have strips.
  const corners: [Side, Side, number, number][] = [
    ['T', 'L', o + rc, o + rc],
    ['T', 'R', TILE - o - rc, o + rc],
    ['B', 'L', o + rc, TILE - o - rc],
    ['B', 'R', TILE - o - rc, TILE - o - rc],
  ]
  for (const [a, b, cx, cy] of corners) {
    if (!has(a) || !has(b)) continue
    const inX = b === 'L' ? x < cx : x > cx
    const inY = a === 'T' ? y < cy : y > cy
    if (inX && inY) d = Math.max(d, Math.hypot(x - cx, y - cy) - rc)
  }
  for (const corner of spec.pockets ?? []) {
    const cx = corner.includes('L') ? 0 : TILE
    const cy = corner.includes('T') ? 0 : TILE
    d = Math.max(d, o - Math.hypot(x - cx, y - cy))
  }
  return d
}

function matAt(spec: TileSpec, x: number, y: number): Mat {
  if (!spec.strip) return spec.body
  if (spec.kind === 'ridge') return field(spec, x + 0.5, y + 0.5) > 0 ? spec.strip : spec.body
  return field(spec, x + 0.5, y + 0.5) > 0 ? spec.strip : spec.body
}

// Textures ----------------------------------------------------------------------------------

const VOID = '#000000'
const wrap = (v: number) => ((v % TILE) + TILE) % TILE

/** Small tufts at fixed spots of every tile (seamless: they stay inside the tile). */
const TUFTS = Array.from({ length: 6 }, (_, index) => [3 + Math.floor(hash(index, 5, 33) * 26), 4 + Math.floor(hash(index, 6, 33) * 25)])

function grassAt(x: number, y: number, variant = 0): string {
  const g = PAL.grass
  const tx = wrap(x)
  const ty = wrap(y)
  const n = periodicNoise(x, y, 16, TILE, 11 + variant)
  let color: string = g[3]
  if (n > 0.68 && bayer(x, y) < 0.35) color = g[4]
  if (n < 0.25 && bayer(x, y) < 0.3) color = g[2]
  for (const [cx, cy] of TUFTS) {
    if ((tx === cx! && ty === cy!) || (tx === cx! + 2 && ty === cy!)) color = g[2]
    if (tx === cx! + 1 && ty === cy! - 1) color = g[2]
    if ((tx === cx! && ty === cy! - 1) || (tx === cx! + 2 && ty === cy! - 1)) color = g[4]
  }
  const h = hash(tx, ty, 31 + variant)
  if (h < 0.018) color = g[5]
  else if (h < 0.03) color = g[2]
  return color
}

function sandAt(x: number, y: number): string {
  const s = PAL.sand
  const tx = wrap(x)
  const ty = wrap(y)
  const n = periodicNoise(x, y, 16, TILE, 21)
  let color: string = s[3]
  if (n > 0.66 && bayer(x, y) < 0.2) color = s[4]
  // Wind ripples: short soft arcs.
  const ripple = (tx + Math.round(Math.sin((ty / TILE) * Math.PI * 2) * 3) + ty * 2) % 16
  if (ripple === 0 && (ty % 8) < 5) color = s[2]
  if (ripple === 1 && (ty % 8) < 5) color = s[4]
  const h = hash(tx, ty, 23)
  if (h < 0.02) color = s[1]
  else if (h < 0.045) color = s[5]
  return color
}

function snowAt(x: number, y: number): string {
  const s = PAL.snow
  const tx = wrap(x)
  const ty = wrap(y)
  const n = periodicNoise(x, y, 16, TILE, 41)
  let color: string = s[4]
  if (n < 0.35 && bayer(x, y) < 0.4) color = s[3]
  if (n < 0.2 && bayer(x, y) < 0.2) color = s[2]
  const h = hash(tx, ty, 43)
  if (h < 0.02) color = s[5]
  else if (h < 0.032) color = s[2]
  return color
}

function iceAt(x: number, y: number): string {
  const c = PAL.ice
  const band = wrap(x - y) % 16
  let color: string = band < 2 ? c[4] : band < 5 ? c[3] : c[2]
  if (periodicNoise(x, y, 8, TILE, 51) > 0.7 && band >= 5) color = c[1]
  if (hash(wrap(x), wrap(y), 53) < 0.012) color = '#ffffff'
  return color
}

/** Small wave crests at fixed spots of the tile; they drift right along the four frames. */
const CRESTS = Array.from({ length: 7 }, (_, index) => [Math.floor(hash(index, 1, 63) * 32), 2 + Math.floor(hash(index, 2, 63) * 28)])

export function waterAt(x: number, y: number, frame = 0): string {
  const w = PAL.water
  const tx = wrap(x)
  const ty = wrap(y)
  const n = periodicNoise(x, y, 16, TILE, 61)
  let color: string = w[2]
  if (n > 0.62 && bayer(x, y) < 0.4) color = w[3]
  if (n < 0.28 && bayer(x, y) < 0.35) color = w[1]
  for (const [cx, cy] of CRESTS) {
    const dx = wrap(tx - cx! - frame * 2)
    if (ty === cy! && dx < 5) color = dx === 0 || dx === 4 ? w[3] : w[4]
    if (ty === cy! - 1 && dx > 0 && dx < 4) color = w[5]
  }
  return color
}

/** Cobbles: a tile-periodic Voronoi of boulders, each lit from the top-left. */
const STONES = Array.from({ length: 7 }, (_, index) => [
  4 + hash(index, 1, 71) * 24,
  4 + hash(index, 2, 71) * 24,
  Math.floor(hash(index, 3, 71) * 3),
])
function rockAt(x: number, y: number): string {
  const r = PAL.rock
  let best = Infinity
  let second = Infinity
  let owner = 0
  for (let index = 0; index < STONES.length; index++) {
    const [sx, sy] = STONES[index]!
    for (const ox of [-TILE, 0, TILE])
      for (const oy of [-TILE, 0, TILE]) {
        const d = Math.hypot(wrap(x) + 0.5 - sx! - ox, wrap(y) + 0.5 - sy! - oy)
        if (d < best) {
          second = best
          best = d
          owner = index
        } else if (d < second) second = d
      }
  }
  if (second - best < 1.2) return r[1]
  const [sx, sy, tone] = STONES[owner]!
  const lit = (wrap(x) - sx!) + (wrap(y) - sy!)
  const base = [r[2], r[3], r[3]][tone!]!
  if (lit < -best * 0.9 && best > 2) return r[4]
  if (lit > best * 0.9 && best > 3) return r[1]
  if (lit < -best * 0.3) return tone === 2 ? r[4] : r[3]
  return base
}

function textureAt(mat: Mat, x: number, y: number, variant = 0, frame = 0): string {
  switch (mat) {
    case 'G':
      return grassAt(x, y, variant)
    case 'S':
      return sandAt(x, y)
    case 'N':
      return snowAt(x, y)
    case 'I':
      return iceAt(x, y)
    case 'W':
      return waterAt(x, y, frame)
    case 'R':
      return rockAt(x, y)
    case 'V':
      return VOID
  }
}

const DARK: Record<Mat, string> = {
  G: PAL.grass[1],
  S: PAL.sand[1],
  N: PAL.snow[1],
  I: PAL.ice[0],
  W: PAL.water[1],
  R: PAL.rock[0],
  V: VOID,
}
const SHADE: Record<Mat, string> = {
  G: PAL.grass[2],
  S: PAL.sand[2],
  N: PAL.snow[2],
  I: PAL.ice[1],
  W: PAL.water[1],
  R: PAL.rock[1],
  V: VOID,
}

/** Which material sits on top where two meet (grass grows over sand and snow). */
const HEIGHT: Record<Mat, number> = { V: 0, W: 1, I: 2, S: 3, N: 4, G: 5, R: 6 }

// Rendering ---------------------------------------------------------------------------------

function ridgeColor(x: number, y: number): string {
  const r = PAL.rock
  const n = periodicNoise(x, y, 3, TILE, 81)
  if (n > 0.66) return r[4]
  if (n < 0.3) return r[2]
  return r[3]
}

export function renderTile(spec: TileSpec): Px {
  const p = new Px(TILE, TILE)
  const mat = (x: number, y: number) => matAt(spec, x, y)
  // 1. Materials with their textures.
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) p.set(x, y, textureAt(mat(x, y), x, y, spec.variant ?? 0, spec.frame ?? 0))

  const kind = spec.kind ?? 'edge'
  if (spec.strip && kind === 'ridge') {
    // 2a. A ridge of rocks along the border, with a dark outline and a shadow below it.
    const width = 3.2
    const d = (x: number, y: number) => field(spec, x + 0.5, y + 0.5)
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const v = Math.abs(d(x, y))
        if (v <= width) p.set(x, y, ridgeColor(x, y))
      }
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const v = Math.abs(d(x, y))
        if (v > width && v <= width + 1.25) p.set(x, y, PAL.rock[0])
        else if (v <= width && v > width - 1.1) {
          // Light on the upper-left rim, dark on the lower-right one.
          const above = Math.abs(d(x, y - 1)) > width || Math.abs(d(x - 1, y)) > width
          p.set(x, y, above ? PAL.rock[5] : PAL.rock[1])
        }
      }
    for (let y = 1; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const here = Math.abs(d(x, y))
        if (here <= width + 1.25) continue
        if (Math.abs(d(x, y - 1)) <= width + 1.25 || Math.abs(d(x, y - 2)) <= width + 1.25) p.set(x, y, SHADE[mat(x, y)])
      }
  } else if (spec.strip) {
    // 2b. Material borders: the upper material gets a dark lip, the lower one a shadow.
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const here = mat(x, y)
        const around = [mat(x - 1, y), mat(x + 1, y), mat(x, y - 1), mat(x, y + 1)]
        const lower = around.find((m) => m !== here && HEIGHT[m] < HEIGHT[here])
        if (lower) {
          if (here === 'R') p.set(x, y, INK)
          else p.set(x, y, DARK[here])
          continue
        }
        const higher = around.find((m) => m !== here && HEIGHT[m] > HEIGHT[here])
        if (here === 'W' && higher) p.set(x, y, PAL.water[5])
        // Shadow cast downwards by a higher material.
        if (mat(x, y - 1) !== here && HEIGHT[mat(x, y - 1)] > HEIGHT[here]) p.set(x, y, SHADE[here])
        else if (mat(x, y - 2) !== here && HEIGHT[mat(x, y - 2)] > HEIGHT[here] && bayer(x, y) < 0.5) p.set(x, y, SHADE[here])
      }
    // Grass tufts hanging over the border.
    if (spec.strip === 'G' || spec.body === 'G')
      for (let y = 0; y < TILE; y++)
        for (let x = 0; x < TILE; x++) {
          if (mat(x, y) === 'G') continue
          if (mat(x, y - 1) === 'G' && hash(wrap(x), wrap(y), 91) < 0.35) p.set(x, y, PAL.grass[2])
        }
    // Rock masses: a darker face on the bottom rows, a lit top rim.
    if (spec.strip === 'R' || spec.body === 'R')
      for (let y = 0; y < TILE; y++)
        for (let x = 0; x < TILE; x++) {
          if (mat(x, y) !== 'R' || p.get(x, y) === INK) continue
          if (mat(x, y + 1) !== 'R' || mat(x, y + 2) !== 'R') p.set(x, y, PAL.rock[1])
          else if (mat(x, y - 1) !== 'R' && mat(x, y - 2) !== 'R') p.set(x, y, PAL.rock[5])
          else if (mat(x, y - 1) !== 'R') p.set(x, y, PAL.rock[4])
        }
  }

  if (spec.body === 'W' && spec.strip) {
    // Foam that comes and goes along the shore.
    const reach = [2.2, 3, 3.8, 3][(spec.frame ?? 0) % 4]!
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        if (mat(x, y) !== 'W') continue
        const d = -field(spec, x + 0.5, y + 0.5)
        if (d > reach - 0.7 && d < reach + 0.5) p.set(x, y, bayer(x, y) < 0.6 ? PAL.water[5] : PAL.water[4])
      }
  }
  if (spec.stairs) drawStairs(p, spec.stairs)
  if (!spec.strip && spec.variant) decorate(p, spec.body, spec.variant)
  return p
}

function drawStairs(p: Px, kind: NonNullable<TileSpec['stairs']>) {
  const s = PAL.stone
  if (kind === 'top' || kind === 'full') {
    const bottom = kind === 'top' ? 22 : TILE
    p.rect(2, 0, 28, bottom, s[2])
    for (let y = 0; y < bottom; y += 7) {
      p.rect(2, y, 28, 3, s[4]).rect(2, y + 3, 28, 1, s[3])
      p.rect(2, Math.min(bottom - 1, y + 6), 28, 1, s[1])
    }
    p.rect(1, 0, 2, bottom, s[0]).rect(29, 0, 2, bottom, s[0])
    p.rect(3, 0, 1, bottom, s[3]).rect(28, 0, 1, bottom, s[1])
    if (kind === 'top') p.rect(1, bottom, 30, 1, INK).rect(1, bottom + 1, 30, 1, PAL.grass[1])
    return
  }
  const x0 = kind === 'left' ? 3 : 13
  p.rect(x0, 0, 16, TILE, s[2])
  for (let x = x0; x < x0 + 16; x += 5) p.rect(x, 0, 2, TILE, s[4]).rect(x + 2, 0, 1, TILE, s[3]).rect(x + 4, 0, 1, TILE, s[1])
  p.rect(x0 - 1, 0, 1, TILE, s[0]).rect(x0 + 16, 0, 1, TILE, s[0])
}

/** Small decorations on plain tiles so a big field does not repeat one tile. */
function decorate(p: Px, mat: Mat, variant: number) {
  const at = (index: number) => [6 + Math.floor(hash(variant, index, 101) * 20), 6 + Math.floor(hash(variant, index, 102) * 20)]
  if (mat === 'G') {
    if (variant === 1) {
      const [x, y] = at(0)
      p.set(x!, y!, '#ffffff').set(x! - 1, y!, '#f6e05e').set(x! + 1, y!, '#f6e05e').set(x!, y! - 1, '#f6e05e').set(x!, y! + 1, '#f6e05e')
      const [a, b] = at(1)
      p.set(a!, b!, '#ffffff').set(a! + 1, b! + 1, PAL.grass[1])
    } else if (variant === 2) {
      for (let k = 0; k < 3; k++) {
        const [x, y] = at(k + 3)
        p.set(x!, y!, PAL.grass[1]).set(x! - 1, y! - 1, PAL.grass[5]).set(x! + 1, y! - 1, PAL.grass[5]).set(x!, y! - 2, PAL.grass[5])
      }
    }
  } else if (mat === 'S' && variant === 1) {
    const [x, y] = at(0)
    p.rect(x!, y!, 3, 2, PAL.sand[5]).rect(x!, y! + 2, 3, 1, PAL.sand[1])
  } else if (mat === 'S' && variant === 2) {
    const [x, y] = at(4)
    p.set(x!, y!, PAL.rock[2]).set(x! + 1, y!, PAL.rock[3]).set(x!, y! + 1, PAL.rock[1])
  } else if (mat === 'N' && variant === 1) {
    const [x, y] = at(0)
    p.set(x!, y!, '#ffffff').set(x! - 1, y!, PAL.snow[5]).set(x! + 1, y!, PAL.snow[5]).set(x!, y! - 1, PAL.snow[5]).set(x!, y! + 1, PAL.snow[5])
  } else if (mat === 'N' && variant === 2) {
    const [x, y] = at(2)
    p.rect(x!, y!, 4, 1, PAL.snow[1]).rect(x! + 1, y! - 1, 2, 1, PAL.snow[5])
  }
}

// The table: original tile → description -----------------------------------------------------

const plain = (body: Mat): TileSpec => ({ body })
const edge = (body: Mat, strip: Mat, sides = '', pockets: Corner[] = []): TileSpec => ({ body, strip, kind: 'edge', sides, pockets })
const ridge = (body: Mat, strip: Mat, sides = '', pockets: Corner[] = []): TileSpec => ({ body, strip, kind: 'ridge', sides, pockets })
const cliff = (body: Mat, strip: Mat, sides: string): TileSpec => ({ body, strip, kind: 'cliff', sides })

/** The three biome blocks of the original world tileset share one layout. */
function biomeBlock(ground: Mat): Record<number, TileSpec> {
  const ring = (sides: string) => ridge(ground, ground, sides)
  const pocket = (corner: Corner) => ridge(ground, ground, '', [corner])
  return {
    // A thick rock mass (a cliff seen from above) and its pieces.
    3: cliff('R', ground, 'TL'),
    4: cliff(ground, 'R', 'T'),
    5: cliff('R', ground, 'TR'),
    13: cliff('R', ground, 'R'),
    14: plain(ground),
    15: cliff('R', ground, 'L'),
    23: cliff('R', ground, 'LB'),
    24: cliff('R', ground, 'B'),
    25: cliff('R', ground, 'RB'),
    6: cliff('R', ground, 'TL'),
    7: cliff('R', ground, 'TB'),
    8: cliff('R', ground, 'TR'),
    16: cliff('R', ground, 'R'),
    17: plain(ground),
    18: cliff('R', ground, 'L'),
    26: cliff(ground, 'R', 'T'),
    27: cliff(ground, 'R', 'T'),
    28: cliff(ground, 'R', 'T'),
    // A ring of low rocks hugging the outer border of a 3×3 block.
    30: ring('TL'),
    31: ring('T'),
    32: ring('TR'),
    40: ring('L'),
    41: plain(ground),
    42: ring('R'),
    50: ring('LB'),
    51: ring('B'),
    52: ring('RB'),
    // A ring hugging the centre tile (its pieces sit on the neighbours).
    33: pocket('BR'),
    34: ring('B'),
    35: pocket('BL'),
    43: ring('R'),
    44: plain(ground),
    45: ring('L'),
    53: pocket('TR'),
    54: ring('T'),
    55: pocket('TL'),
    // Loose ridge pieces.
    36: ring('T'),
    37: ring('T'),
    46: ring('B'),
    47: ring('B'),
    38: ring('L'),
    48: ring('L'),
    39: ring('R'),
    49: ring('R'),
    // Stone stairs.
    56: { body: ground, stairs: 'top' },
    57: { body: ground, stairs: 'full' },
    58: { body: ground, stairs: 'left' },
    59: { body: ground, stairs: 'right' },
  }
}

function worldTable(): Map<number, { tileset: string; spec: TileSpec }> {
  const table = new Map<number, { tileset: string; spec: TileSpec }>()
  const put = (tileset: string, offset: number, block: Record<number, TileSpec>) => {
    for (const [id, spec] of Object.entries(block)) table.set(offset + Number(id), { tileset, spec })
  }
  // Grass: a patch of sand inside the grass.
  put('terreno-grama', 0, {
    ...biomeBlock('G'),
    0: edge('S', 'G', 'TL'),
    1: edge('S', 'G', 'T'),
    2: edge('S', 'G', 'TR'),
    10: edge('S', 'G', 'L'),
    11: plain('S'),
    12: edge('S', 'G', 'R'),
    20: edge('S', 'G', 'LB'),
    21: edge('S', 'G', 'B'),
    22: edge('S', 'G', 'RB'),
  })
  // Sand: a blob of grass on the sand.
  put('terreno-areia', 60, {
    ...biomeBlock('S'),
    0: edge('S', 'G', '', ['BR']),
    1: edge('S', 'G', 'B'),
    2: edge('S', 'G', '', ['BL']),
    10: edge('S', 'G', 'R'),
    11: plain('G'),
    12: edge('S', 'G', 'L'),
    20: edge('S', 'G', '', ['TR']),
    21: edge('S', 'G', 'T'),
    22: edge('S', 'G', '', ['TL']),
  })
  // Snow: a field of snow inside the grass, plus the frozen lakes.
  put('terreno-gelo', 120, {
    ...biomeBlock('N'),
    0: edge('N', 'G', 'TL'),
    1: edge('N', 'G', 'T'),
    2: edge('N', 'G', 'TR'),
    10: edge('N', 'G', 'L'),
    11: plain('N'),
    12: edge('N', 'G', 'R'),
    20: edge('N', 'G', 'LB'),
    21: edge('N', 'G', 'B'),
    22: edge('N', 'G', 'RB'),
    // A blob of grass on the snow.
    60: edge('N', 'G', '', ['BR']),
    61: edge('N', 'G', 'B'),
    62: edge('N', 'G', '', ['BL']),
    70: edge('N', 'G', 'R'),
    71: plain('G'),
    72: edge('N', 'G', 'L'),
    80: edge('N', 'G', '', ['TR']),
    81: edge('N', 'G', 'T'),
    82: edge('N', 'G', '', ['TL']),
    // A frozen lake ringed by rocks.
    63: ridge('I', 'N', 'TL'),
    64: ridge('I', 'N', 'T'),
    65: ridge('I', 'N', 'TR'),
    73: ridge('I', 'N', 'L'),
    74: plain('I'),
    75: ridge('I', 'N', 'R'),
    83: ridge('I', 'N', 'LB'),
    84: ridge('I', 'N', 'B'),
    85: ridge('I', 'N', 'RB'),
    // A snow island in the lake.
    66: ridge('I', 'N', '', ['BR']),
    67: ridge('I', 'N', 'B'),
    68: ridge('I', 'N', '', ['BL']),
    76: ridge('I', 'N', 'R'),
    77: plain('N'),
    78: ridge('I', 'N', 'L'),
    86: ridge('I', 'N', '', ['TR']),
    87: ridge('I', 'N', 'T'),
    88: ridge('I', 'N', '', ['TL']),
  })
  return table
}

/** The indoor tiles (hospital and house) are drawn one by one. */
const INDOOR_IDS = [5, 6, 7, 16, 17, 18, 19, 26, 27, 28, 29, 35, 36, 37, 38, 39, 46, 47, 55, 56, 57, 64, 65, 74, 75, 84, 85]

export const WORLD_TABLE = worldTable()

export interface TerrainTile {
  tileset: string
  key: string
  draw: () => Px
}

const PLAIN_VARIANTS = 3

/** The new tile for an original tile token ("w14", "i46") at a map cell. */
export function tileFor(token: string, x: number, y: number): TerrainTile | null {
  if (token === '.') return null
  const id = Number(token.slice(1))
  if (token[0] === 'i') {
    if (id === 43) return { tileset: '*', key: 'void', draw: () => renderTile(plain('V')) }
    if (!INDOOR_IDS.includes(id)) throw new Error(`peça interna sem desenho: ${token}`)
    return { tileset: 'interior', key: `i${id}`, draw: () => indoorTile(id) }
  }
  const entry = WORLD_TABLE.get(id)
  if (!entry) throw new Error(`peça do mundo sem descrição: ${token}`)
  let spec = entry.spec
  if (!spec.strip && !spec.stairs && spec.body !== 'I') {
    const roll = hash(x, y, 7)
    const variant = roll < 0.08 ? 1 : roll < 0.16 ? 2 : 0
    spec = { ...spec, variant }
  }
  return { tileset: entry.tileset, key: JSON.stringify(spec), draw: () => renderTile(spec) }
}
export const PLAIN_VARIANT_COUNT = PLAIN_VARIANTS

// Indoor -------------------------------------------------------------------------------------

const ROOM = {
  frame: '#f4eee6',
  frameShade: '#c9bfb4',
  frameDark: '#8d8291',
  wall: '#8f78b8',
  wallDark: '#6f5a99',
  wallLight: '#aa96cf',
  base: '#d8e7f2',
  floor: '#e3ecf5',
  floorLine: '#bccbdc',
  floorLight: '#f5f9fc',
  window: '#5fc4ef',
  windowLight: '#c8f0ff',
  counter: '#79c9b8',
  counterLight: '#b6ecdf',
  counterDark: '#3e8f84',
  counterFace: '#5aa99a',
}

function floor(p: Px) {
  p.rect(0, 0, TILE, TILE, ROOM.floor)
  p.rect(0, 0, TILE, 1, ROOM.floorLine).rect(0, 16, TILE, 1, ROOM.floorLine)
  p.rect(0, 0, 1, TILE, ROOM.floorLine).rect(16, 0, 1, TILE, ROOM.floorLine)
  p.rect(2, 2, 12, 1, ROOM.floorLight).rect(18, 18, 12, 1, ROOM.floorLight)
  p.rect(2, 18, 12, 1, ROOM.floorLight).rect(18, 2, 12, 1, ROOM.floorLight)
}
function wall(p: Px, top: boolean) {
  p.rect(0, 0, TILE, TILE, ROOM.wall)
  for (let x = 4; x < TILE; x += 8) p.rect(x, 0, 1, TILE, ROOM.wallDark)
  if (top) p.rect(0, 0, TILE, 3, ROOM.wallLight)
  else p.rect(0, 22, TILE, 2, ROOM.wallLight).rect(0, 24, TILE, 8, ROOM.wallDark)
}
/** The thick white frame around the room, on the side(s) given. */
function frame(p: Px, sides: string) {
  const f = (x: number, y: number, w: number, h: number) => p.rect(x, y, w, h, ROOM.frame)
  if (sides.includes('L')) f(20, 0, 8, TILE), p.rect(20, 0, 1, TILE, ROOM.frameDark).rect(27, 0, 1, TILE, ROOM.frameShade)
  if (sides.includes('R')) f(4, 0, 8, TILE), p.rect(4, 0, 1, TILE, ROOM.frameShade).rect(11, 0, 1, TILE, ROOM.frameDark)
  if (sides.includes('T')) f(0, 20, TILE, 8), p.rect(0, 20, TILE, 1, ROOM.frameDark).rect(0, 27, TILE, 1, ROOM.frameShade)
  if (sides.includes('B')) f(0, 4, TILE, 8), p.rect(0, 4, TILE, 1, ROOM.frameShade).rect(0, 11, TILE, 1, ROOM.frameDark)
}

function indoorTile(id: number): Px {
  const p = new Px(TILE, TILE, VOID)
  switch (id) {
    case 5: // top-left corner of the frame
      p.rect(20, 20, 12, 8, ROOM.frame).rect(20, 20, 8, 12, ROOM.frame)
      p.rect(20, 20, 12, 1, ROOM.frameDark).rect(20, 20, 1, 12, ROOM.frameDark).rect(27, 27, 5, 1, ROOM.frameShade).rect(27, 27, 1, 5, ROOM.frameShade)
      break
    case 6:
      frame(p, 'T')
      p.rect(0, 28, TILE, 4, ROOM.wallLight)
      break
    case 7:
      p.rect(0, 20, 12, 8, ROOM.frame).rect(4, 20, 8, 12, ROOM.frame)
      p.rect(0, 20, 12, 1, ROOM.frameDark).rect(11, 20, 1, 12, ROOM.frameDark).rect(0, 27, 5, 1, ROOM.frameShade).rect(4, 27, 1, 5, ROOM.frameShade)
      break
    case 16:
    case 28:
    case 29:
      wall(p, true)
      if (id !== 16) drawWindow(p, id === 28 ? 'left' : 'right', 'top')
      break
    case 26:
    case 38:
    case 39:
      wall(p, false)
      if (id !== 26) drawWindow(p, id === 38 ? 'left' : 'right', 'bottom')
      break
    case 17:
      p.rect(0, 0, 4, TILE, ROOM.wall).rect(0, 0, 4, 3, ROOM.wallLight)
      frame(p, 'R')
      break
    case 27:
      p.rect(0, 0, 4, 22, ROOM.wall).rect(0, 22, 4, 2, ROOM.wallLight).rect(0, 24, 4, 8, ROOM.wallDark)
      frame(p, 'R')
      break
    case 35: // left frame column
      frame(p, 'L')
      p.rect(28, 0, 4, TILE, ROOM.base)
      break
    case 36: // baseboard where the wall meets the floor
      floor(p)
      p.rect(0, 0, TILE, 6, ROOM.base).rect(0, 6, TILE, 1, ROOM.floorLine).rect(0, 7, TILE, 2, '#c5d5e3')
      break
    case 37:
    case 47:
      p.rect(0, 0, 4, TILE, ROOM.floor)
      if (id === 37) p.rect(0, 0, 4, 6, ROOM.base)
      frame(p, 'R')
      break
    case 46:
      floor(p)
      break
    case 55:
      p.rect(20, 0, 8, 12, ROOM.frame).rect(20, 4, 12, 8, ROOM.frame)
      p.rect(20, 0, 1, 12, ROOM.frameDark).rect(20, 11, 12, 1, ROOM.frameDark).rect(27, 0, 1, 5, ROOM.frameShade).rect(27, 4, 5, 1, ROOM.frameShade)
      p.rect(28, 0, 4, 4, ROOM.floor)
      break
    case 56:
      p.rect(0, 0, TILE, 4, ROOM.floor)
      frame(p, 'B')
      break
    case 57:
      p.rect(4, 0, 8, 12, ROOM.frame).rect(0, 4, 12, 8, ROOM.frame)
      p.rect(11, 0, 1, 12, ROOM.frameDark).rect(0, 11, 12, 1, ROOM.frameDark).rect(4, 0, 1, 5, ROOM.frameShade).rect(0, 4, 5, 1, ROOM.frameShade)
      p.rect(0, 0, 4, 4, ROOM.floor)
      break
    case 18:
    case 19: {
      // The doorway in the bottom wall: a mat on the floor and the frame opening.
      p.rect(0, 0, TILE, 12, ROOM.floor)
      frame(p, 'B')
      const open = id === 18 ? [16, 16] : [0, 16]
      p.rect(open[0]!, 4, open[1]!, 8, ROOM.floor)
      p.rect(id === 18 ? 15 : 16, 4, 1, 8, ROOM.frameDark)
      p.rect(id === 18 ? 18 : 0, 1, 14, 9, '#e0675b').rect(id === 18 ? 19 : 1, 2, 12, 7, '#f08a72')
      p.rect(0, 12, TILE, 20, VOID)
      break
    }
    case 64: // counter: right end of a horizontal piece
      counterH(p, false, true)
      break
    case 74: // counter: left end
      counterH(p, true, false)
      break
    case 84:
      counterH(p, false, false)
      break
    case 65:
      counterV(p, true)
      break
    case 75:
      counterV(p, false)
      break
    case 85: // corner: down from the top, then to the left
      counterV(p, false, 14)
      counterH(p, false, false, 18)
      p.rect(18, 6, 10, 14, ROOM.counter).rect(19, 7, 8, 2, ROOM.counterLight)
      break
  }
  return p
}

function drawWindow(p: Px, side: 'left' | 'right', half: 'top' | 'bottom') {
  const x0 = side === 'left' ? 8 : 0
  const x1 = side === 'left' ? TILE : 24
  if (half === 'top') {
    p.rect(x0, 10, x1 - x0, 22, ROOM.frame)
    p.rect(x0 + (side === 'left' ? 4 : 0), 14, x1 - x0 - 4, 18, ROOM.window)
    p.rect(x0 + (side === 'left' ? 6 : 2), 16, 6, 3, ROOM.windowLight)
  } else {
    p.rect(x0, 0, x1 - x0, 14, ROOM.frame)
    p.rect(x0 + (side === 'left' ? 4 : 0), 0, x1 - x0 - 4, 10, ROOM.window)
    p.rect(x0, 13, x1 - x0, 1, ROOM.frameShade)
  }
}

function counterH(p: Px, capLeft: boolean, capRight: boolean, width = TILE) {
  const x0 = capLeft ? 4 : 0
  const x1 = capRight ? 28 : width
  p.rect(x0, 6, x1 - x0, 14, ROOM.counter)
  p.rect(x0, 7, x1 - x0, 2, ROOM.counterLight)
  p.rect(x0, 20, x1 - x0, 7, ROOM.counterFace)
  p.rect(x0, 27, x1 - x0, 2, ROOM.counterDark)
  p.rect(x0, 5, x1 - x0, 1, ROOM.counterDark)
  if (capLeft) p.rect(3, 5, 1, 24, ROOM.counterDark)
  if (capRight) p.rect(28, 5, 1, 24, ROOM.counterDark)
}
function counterV(p: Px, capTop: boolean, height = TILE) {
  const y0 = capTop ? 4 : 0
  p.rect(9, y0, 14, height - y0, ROOM.counter)
  p.rect(10, y0, 2, height - y0, ROOM.counterLight)
  p.rect(8, y0, 1, height - y0, ROOM.counterDark).rect(23, y0, 1, height - y0, ROOM.counterDark)
  if (capTop) p.rect(8, 3, 16, 1, ROOM.counterDark)
}

/** A water tile (the animated sea and the coasts use the same water). */
export function waterTile(frame: number): Px {
  return renderTile({ body: 'W', frame })
}

/** A coast tile: water with land along some sides or in some corners. */
export function coastTile(land: Mat, sides: string, pockets: Corner[], frame: number): Px {
  return renderTile({ body: 'W', strip: land, kind: 'edge', sides, pockets, frame })
}
