/**
 * PyDew Valley ground pieces (32 px, played at 64): the grass with its rounded borders, grass
 * textures and tufts, the cliffs and stairs, the paths, wild flowers, fences, the invisible
 * marks of the map and the farm house.
 */
import type { TilesetDrawing } from '../../drawing'
import { darken, mix, Px, random } from '../../pixel'
import { EARTH, FLOWER, GRASS, INK, WATER, WOOD } from './palette'

const T = 32

// Grass ---------------------------------------------------------------------------------------

/** Plain grass with a few soft specks (seed changes the specks, never the base). */
function grass(seed: number, specks = 3): Px {
  const tile = new Px(T, T, GRASS.base)
  const rng = random(seed)
  for (let index = 0; index < specks; index++) {
    const x = rng.int(2, T - 4)
    const y = rng.int(2, T - 4)
    if (rng.chance(0.5)) tile.set(x, y, GRASS.light).set(x + 1, y, GRASS.light)
    else tile.set(x, y, GRASS.shade)
  }
  return tile
}

interface Island {
  n?: boolean
  s?: boolean
  w?: boolean
  e?: boolean
  /** Concave corners (a bite out of a tile corner): nw, ne, sw, se. */
  bite?: ('nw' | 'ne' | 'sw' | 'se')[]
  /** Inset of the edges (narrow pills and circles). */
  inset?: number
  radius?: number
}

/**
 * A piece of a raised grass patch (or of the land beside the water): grass inside a dark
 * border with rounded corners; outside is transparent.
 */
function island(spec: Island, seed: number): Px {
  const tile = grass(seed, 4)
  const inset = spec.inset ?? 0
  const radius = spec.radius ?? 7
  // A concave corner only rounds the meeting point of the two borders next to it.
  const biteRadius = 1
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const cx = x + 0.5
      const cy = y + 0.5
      const dn = spec.n ? cy - inset : Infinity
      const ds = spec.s ? T - inset - cy : Infinity
      const dw = spec.w ? cx - inset : Infinity
      const de = spec.e ? T - inset - cx : Infinity
      let distance = Math.min(dn, ds, dw, de)
      for (const [vertical, horizontal] of [
        [dn, dw],
        [dn, de],
        [ds, dw],
        [ds, de],
      ] as const)
        if (vertical < radius && horizontal < radius)
          distance = Math.min(distance, radius - Math.hypot(radius - vertical, radius - horizontal))
      for (const corner of spec.bite ?? []) {
        const px = corner.endsWith('w') ? 0 : T
        const py = corner.startsWith('n') ? 0 : T
        distance = Math.min(distance, Math.hypot(cx - px, cy - py) - biteRadius)
      }
      if (distance <= 0) tile.set(x, y, null)
      else if (distance < 1.6) tile.set(x, y, GRASS.edge)
      else if (distance < 2.6) tile.set(x, y, GRASS.dark)
      else if (distance < 3.6) tile.set(x, y, GRASS.shade)
    }
  // Light from the top-left: the inner side of the top and left borders is brighter.
  for (let y = 1; y < T - 1; y++)
    for (let x = 1; x < T - 1; x++)
      if (
        tile.get(x, y) === GRASS.shade &&
        (tile.get(x, y - 2) === GRASS.edge || tile.get(x - 2, y) === GRASS.edge)
      )
        tile.set(x, y, GRASS.light)
  return tile
}

function blades(tile: Px, x: number, y: number, color = GRASS.dark) {
  tile
    .set(x, y, color)
    .set(x - 1, y - 1, color)
    .set(x + 1, y - 1, color)
    .set(x + 1, y - 2, color)
}

function sprout(tile: Px, x: number, y: number) {
  tile
    .set(x, y, GRASS.edge)
    .set(x, y - 1, GRASS.dark)
    .set(x - 1, y - 2, GRASS.bright)
    .set(x + 1, y - 2, GRASS.bright)
}

function tinyFlower(tile: Px, x: number, y: number, petal: string, center: string) {
  tile
    .set(x, y - 1, petal)
    .set(x - 1, y, petal)
    .set(x + 1, y, petal)
    .set(x, y + 1, petal)
    .set(x, y, center)
}

function clover(tile: Px, x: number, y: number) {
  const leaf = '#5d8f62'
  const light = '#7fae7c'
  tile
    .rect(x - 3, y - 2, 3, 3, leaf)
    .rect(x + 1, y - 2, 3, 3, leaf)
    .rect(x - 1, y, 3, 3, leaf)
  tile
    .set(x - 3, y - 2, light)
    .set(x + 1, y - 2, light)
    .set(x - 1, y, light)
  tile.set(x, y + 3, GRASS.edge)
}

function blot(tile: Px, x: number, y: number, w: number, h: number, color: string) {
  tile.ellipse(x, y, w, h, color)
}

/** The 12 textured grass tiles (opaque): tufts, sprouts, darker and lighter patches, flowers. */
function texturedGrass(): Px[] {
  const tiles: Px[] = []
  for (let variant = 0; variant < 12; variant++) {
    const tile = grass(100 + variant, 3)
    const rng = random(500 + variant)
    const kind = variant % 6
    if (kind === 0)
      for (let index = 0; index < 4; index++) blades(tile, rng.int(4, 27), rng.int(6, 27))
    if (kind === 1)
      for (let index = 0; index < 3; index++) sprout(tile, rng.int(4, 27), rng.int(8, 27))
    if (kind === 2) {
      for (let index = 0; index < 5; index++)
        blades(tile, rng.int(4, 27), rng.int(6, 27), GRASS.light)
    }
    if (kind === 3) {
      blot(tile, 3, 4, 13, 8, GRASS.shade)
      blot(tile, 15, 17, 14, 9, GRASS.shade)
      tile.set(6, 6, GRASS.dark).set(19, 20, GRASS.dark)
    }
    if (kind === 4) {
      blot(tile, 4, 5, 11, 7, GRASS.light)
      blot(tile, 14, 18, 14, 8, GRASS.light)
      blot(tile, 17, 4, 9, 6, GRASS.bright)
    }
    if (kind === 5)
      for (let index = 0; index < 3; index++)
        tinyFlower(
          tile,
          rng.int(4, 27),
          rng.int(4, 27),
          variant < 6 ? FLOWER.yellow : FLOWER.white,
          FLOWER.yellowDark,
        )
    tiles.push(tile)
  }
  return tiles
}

/** Transparent decals over the grass: sprouts, a little flower, clovers. */
function decals(): Px[] {
  const sproutTile = new Px(T, T)
  sprout(sproutTile, 15, 18)
  sprout(sproutTile, 19, 20)
  const flowerTile = new Px(T, T)
  tinyFlower(flowerTile, 16, 16, FLOWER.yellow, FLOWER.yellowDark)
  flowerTile.set(16, 18, GRASS.edge)
  const cloverTile = new Px(T, T)
  clover(cloverTile, 15, 14)
  const clovers = new Px(T, T)
  clover(clovers, 9, 9)
  clover(clovers, 22, 20)
  const bladeTile = new Px(T, T)
  blades(bladeTile, 12, 14)
  blades(bladeTile, 20, 22)
  return [sproutTile, flowerTile, cloverTile, clovers, bladeTile]
}

function clump(tiles: [number, number, number, number][], color: string, rim: string): Px {
  const tile = new Px(T, T)
  for (const [x, y, w, h] of tiles) tile.ellipse(x, y, w, h, color)
  tile.rim(mix(color, '#ffffff', 0.25), null)
  tile.outline(rim)
  return tile
}

/** Round blobs of darker grass: pill pieces, circles and little clumps. */
function blobs(): Px[] {
  const pillTop = island({ n: true, w: true, e: true, inset: 7, radius: 9 }, 41)
  const pillMid = island({ w: true, e: true, inset: 7 }, 42)
  const pillMid2 = island({ w: true, e: true, inset: 7 }, 43)
  const pillBottom = island({ s: true, w: true, e: true, inset: 7, radius: 9 }, 44)
  const small = island({ n: true, s: true, w: true, e: true, inset: 7, radius: 9 }, 45)
  const small2 = island({ n: true, s: true, w: true, e: true, inset: 8, radius: 8 }, 46)
  const big = island({ n: true, s: true, w: true, e: true, inset: 3, radius: 13 }, 47)
  const dark1 = clump(
    [
      [4, 6, 10, 7],
      [16, 15, 12, 8],
      [7, 20, 7, 5],
    ],
    GRASS.shade,
    GRASS.dark,
  )
  const dark2 = clump(
    [
      [14, 4, 13, 8],
      [3, 14, 9, 6],
      [16, 20, 8, 6],
    ],
    GRASS.shade,
    GRASS.dark,
  )
  const light1 = clump(
    [
      [5, 5, 10, 6],
      [17, 13, 11, 7],
      [6, 20, 9, 6],
    ],
    GRASS.bright,
    GRASS.light,
  )
  const light2 = clump(
    [
      [13, 6, 14, 7],
      [3, 17, 10, 6],
      [17, 21, 8, 5],
    ],
    GRASS.bright,
    GRASS.light,
  )
  return [pillTop, pillMid, pillMid2, pillBottom, small, small2, big, dark1, dark2, light1, light2]
}

// Cliffs --------------------------------------------------------------------------------------

/** The face of a cliff between two rows (bricks of earth, light from the top-left). */
function cliffFace(tile: Px, from: number, to: number, top = 11, bottom = 25) {
  for (let x = from; x < to; x++) {
    tile.rect(x, top, 1, bottom - top, EARTH.base)
    tile.set(x, top, GRASS.edge).set(x, top + 1, EARTH.light)
    tile.set(x, bottom - 1, EARTH.dark).set(x, bottom, EARTH.deep)
    tile.set(x, bottom + 1, GRASS.shade)
    if ((x + 3) % 8 === 0) tile.rect(x, top + 2, 1, bottom - top - 3, EARTH.dark)
    if ((x + 4) % 8 === 0) tile.rect(x, top + 2, 1, bottom - top - 3, EARTH.light)
    if ((x * 7) % 11 === 3) tile.set(x, top + 7, EARTH.pale)
    if ((x * 5) % 13 === 4) tile.set(x, top + 10, EARTH.dark)
  }
  for (let x = from; x < to; x++) if ((x * 3) % 7 === 2) tile.set(x, bottom - 1, GRASS.dark)
  // The grass lip hangs over the face.
  for (let x = from; x < to; x++) {
    tile.set(x, top - 1, GRASS.dark)
    if (x % 5 === 1) tile.set(x, top + 1, GRASS.dark)
    if (x % 5 === 2) tile.set(x, top + 1, GRASS.dark).set(x, top + 2, GRASS.edge)
  }
}

/** The darker border of a plateau along one side of the tile (x of the band). */
function vertical(tile: Px, x: number, from = 0, to = T) {
  for (let y = from; y < to; y++) {
    tile
      .set(x - 1, y, GRASS.light)
      .set(x, y, GRASS.dark)
      .set(x + 1, y, GRASS.edge)
      .set(x + 2, y, GRASS.shade)
    if (y % 6 === 2) tile.set(x - 1, y, GRASS.dark)
  }
}

function stairs(tile: Px, from: number, to: number, x0: number, x1: number) {
  for (let y = from; y < to; y += 3) {
    const left = x0 + ((y / 3) % 2)
    tile.rect(left, y, x1 - left, 2, WOOD.pale)
    tile.rect(left, y + 2, x1 - left, 1, WOOD.base)
    tile.set(left, y, WOOD.light)
  }
}

function hills(): Px[] {
  const edgeL = grass(61)
  vertical(edgeL, 3)
  const edgeR = grass(62)
  vertical(edgeR, 27)
  const cornerBL = grass(63)
  vertical(cornerBL, 3, 0, 12)
  cliffFace(cornerBL, 4, T)
  cornerBL.rect(2, 11, 2, 15, GRASS.edge).rect(3, 25, 2, 1, EARTH.deep)
  const cliff = grass(64)
  cliffFace(cliff, 0, T)
  const cornerBR = grass(65)
  vertical(cornerBR, 27, 0, 12)
  cliffFace(cornerBR, 0, 28)
  cornerBR.rect(28, 11, 2, 15, GRASS.edge).rect(27, 25, 2, 1, EARTH.deep)
  // A cliff coming from the left that ends here and turns into a border going down.
  const turnL = grass(66)
  cliffFace(turnL, 0, 4)
  vertical(turnL, 3, 11, T)
  turnL.rect(4, 11, 2, 15, GRASS.edge)
  const turnR = grass(67)
  cliffFace(turnR, 28, T)
  vertical(turnR, 27, 11, T)
  turnR.rect(26, 11, 2, 15, GRASS.edge)
  // Stairs: the top of the steps on the plateau, the steps in the cliff, the foot of the steps.
  const topL = grass(68)
  stairs(topL, 22, T, 18, T)
  const topR = grass(69)
  stairs(topR, 22, T, 0, 14)
  const stairsL = grass(70)
  cliffFace(stairsL, 0, 14)
  stairsL.rect(14, 11, 2, 15, GRASS.edge)
  stairs(stairsL, 0, T, 17, T)
  const stairsR = grass(71)
  cliffFace(stairsR, 18, T)
  stairsR.rect(16, 11, 2, 15, GRASS.edge)
  stairs(stairsR, 0, T, 0, 15)
  const footL = grass(72)
  stairs(footL, 0, 9, 19, T)
  const footR = grass(73)
  stairs(footR, 0, 9, 0, 13)
  return [
    edgeL,
    edgeR,
    cornerBL,
    cliff,
    cornerBR,
    turnL,
    turnR,
    topL,
    topR,
    stairsL,
    stairsR,
    footL,
    footR,
  ]
}

/**
 * `terreno`: the grass of the farm (54 pieces). Order (the map converter uses the same):
 * 0 grass · 1-4 borders n s w e · 5-8 corners nw ne sw se · 9-12 bites se sw ne nw ·
 * 13-24 textured grass · 25-29 tufts · 30-40 blobs · 41-53 cliffs and stairs.
 */
export function terrainTiles(): TilesetDrawing {
  const tiles: Px[] = [
    grass(1, 2),
    island({ n: true }, 2),
    island({ s: true }, 3),
    island({ w: true }, 4),
    island({ e: true }, 5),
    island({ n: true, w: true }, 6),
    island({ n: true, e: true }, 7),
    island({ s: true, w: true }, 8),
    island({ s: true, e: true }, 9),
    island({ bite: ['se'] }, 10),
    island({ bite: ['sw'] }, 11),
    island({ bite: ['ne'] }, 12),
    island({ bite: ['nw'] }, 13),
    ...texturedGrass(),
    ...decals(),
    ...blobs(),
    ...hills(),
  ]
  return { kind: 'tileset', name: 'terreno', tileSize: T, tiles: tiles.map((image) => ({ image })) }
}

// Paths, wild flowers and fences ----------------------------------------------------------------

function plank(tile: Px, x: number, y: number, w: number, h: number) {
  tile.rect(x, y, w, h, WOOD.light)
  tile.rect(x, y + h - 1, w, 1, WOOD.dark)
  tile.rect(x, y, w, 1, WOOD.pale)
  tile.set(x, y, WOOD.pale)
  tile.set(x + w - 1, y + h - 1, WOOD.deep)
}

function paths(): Px[] {
  // Vertical boardwalk: horizontal planks stacked, slightly staggered.
  const vertical = (from: number, to: number) => {
    const tile = new Px(T, T)
    for (let y = from; y < to; y += 5) plank(tile, 9 + ((y / 5) % 2 ? 1 : -1), y, 14, 4)
    return tile
  }
  const top = vertical(12, T)
  const middle = vertical(1, T)
  const bottom = vertical(1, 18)
  const horizontal = new Px(T, T)
  for (let x = 1; x < T; x += 5) plank(horizontal, x, 9 + ((x / 5) % 2 ? 1 : -1), 4, 14)
  // Corners: planks turning from the vertical path into the horizontal one.
  const cornerUR = new Px(T, T)
  for (let y = 1; y < 12; y += 5) plank(cornerUR, 9, y, 14, 4)
  plank(cornerUR, 11, 15, 4, 12)
  plank(cornerUR, 17, 14, 4, 13)
  plank(cornerUR, 23, 10, 4, 14)
  plank(cornerUR, 28, 9, 4, 14)
  const cornerUL = cornerUR.flipX()
  return [top, middle, bottom, cornerUR, cornerUL, horizontal]
}

function wildFlower(petal: string, dark: string, big: boolean): Px {
  const tile = new Px(T, T)
  const leaf = GRASS.dark
  tile.ellipse(9, 18, 7, 4, leaf).ellipse(16, 18, 7, 4, leaf)
  tile.set(10, 18, GRASS.light).set(17, 18, GRASS.light)
  const r = big ? 4 : 3
  tile.circle(15.5, 15, r, petal)
  tile.circle(15.5, 15, r - 2, FLOWER.yellow)
  tile.set(14, 13, mix(petal, '#ffffff', 0.5))
  tile.outline(dark)
  tile.replace(dark, darken(dark, 0.2))
  return tile
}

function mushroom(cap: string, dark: string, count: number): Px {
  const tile = new Px(T, T)
  const spots = [
    [14, 16, 5],
    [9, 19, 3],
    [20, 20, 3],
  ].slice(0, count)
  for (const [x, y, r] of spots) {
    tile.rect(x! - 1, y!, 3, r! + 1, FLOWER.white)
    tile.ellipse(x! - r!, y! - r!, r! * 2 + 1, r! + 2, cap)
    tile.set(x! - 1, y! - r! + 1, FLOWER.white).set(x! + 1, y! - 1, FLOWER.white)
  }
  tile.outline(darken(dark, 0.3))
  return tile
}

function blueFlower(): Px {
  const tile = new Px(T, T)
  tile.ellipse(9, 19, 7, 4, GRASS.dark).ellipse(16, 19, 7, 4, GRASS.dark)
  tile.rect(13, 10, 6, 6, FLOWER.blue).rect(12, 11, 8, 4, FLOWER.blue)
  tile.rect(14, 12, 4, 2, FLOWER.white)
  tile.set(13, 10, mix(FLOWER.blue, '#ffffff', 0.5))
  tile.outline(darken(FLOWER.blueDark, 0.2))
  return tile
}

function fencePost(tile: Px, x: number) {
  tile.rect(x, 4, 6, 22, WOOD.base)
  tile.rect(x, 4, 2, 22, WOOD.light)
  tile.rect(x + 5, 4, 1, 22, WOOD.dark)
  tile.rect(x + 1, 2, 4, 2, WOOD.light)
  tile.set(x + 2, 1, WOOD.pale).set(x + 3, 1, WOOD.pale)
  tile.rect(x, 25, 6, 2, WOOD.deep)
}

function fenceRail(tile: Px, from: number, to: number) {
  for (const y of [9, 17]) {
    tile.rect(from, y, to - from, 4, WOOD.base)
    tile.rect(from, y, to - from, 1, WOOD.pale)
    tile.rect(from, y + 3, to - from, 1, WOOD.dark)
  }
}

/** A fence piece: which sides it joins (the post always sits in the middle). */
function fence(join: { e?: boolean; w?: boolean; n?: boolean; s?: boolean }): Px {
  const tile = new Px(T, T)
  if (join.w) fenceRail(tile, 0, 13)
  if (join.e) fenceRail(tile, 19, T)
  const post = new Px(T, T)
  fencePost(post, 13)
  if (join.n) post.rect(14, 0, 4, 4, WOOD.base).rect(14, 0, 1, 4, WOOD.light)
  if (join.s)
    post.rect(14, 27, 4, 5, WOOD.base).rect(14, 27, 1, 5, WOOD.light).rect(17, 27, 1, 5, WOOD.dark)
  tile.draw(post)
  tile.outline(INK)
  return tile
}

/**
 * `caminhos-e-cerca`: 0-5 paths (top, middle, bottom, corner up-right, corner up-left,
 * horizontal) · 6-14 wild flowers and mushrooms · 15-21 fence (top end, corner right+down,
 * corner left+down, vertical, corner up+right, corner up+left, horizontal).
 * ⚠️ Not `enfeites`: that is the sprite of the plants (`objects.ts`), and two drawings with one
 * name would be one document in `desenhos.pinta.json`.
 */
export function decorationTiles(): TilesetDrawing {
  const tiles: Px[] = [
    ...paths(),
    wildFlower(FLOWER.yellow, FLOWER.yellowDark, false),
    wildFlower(FLOWER.yellow, FLOWER.yellowDark, true),
    mushroom(FLOWER.red, FLOWER.redDark, 1),
    mushroom(FLOWER.purple, FLOWER.purpleDark, 1),
    blueFlower(),
    wildFlower(FLOWER.pink, FLOWER.pinkDark, false),
    wildFlower(FLOWER.pink, FLOWER.pinkDark, true),
    mushroom(FLOWER.red, FLOWER.redDark, 3),
    mushroom(FLOWER.purple, FLOWER.purpleDark, 3),
    fence({ s: true }),
    fence({ e: true, s: true }),
    fence({ w: true, s: true }),
    fence({ n: true, s: true }),
    fence({ n: true, e: true }),
    fence({ n: true, w: true }),
    fence({ e: true, w: true }),
  ]
  return {
    kind: 'tileset',
    name: 'caminhos-e-cerca',
    tileSize: T,
    tiles: tiles.map((image) => ({ image })),
  }
}

/** `marcas`: the invisible marks of the map: 0 water, 1 wall (solid), 2 farmable soil. */
export function markTiles(): TilesetDrawing {
  const mark = (color: string, symbol: (tile: Px) => void) => {
    const tile = new Px(T, T, color)
    tile.frame(0, 0, T, T, darken(color, 0.35))
    symbol(tile)
    return tile
  }
  const water = mark(WATER.base, (tile) => {
    for (const y of [10, 18])
      for (let x = 6; x < 26; x++) tile.set(x, y + Math.round(Math.sin(x / 2) * 1.5), WATER.foam)
  })
  const wall = mark('#d9694a', (tile) => {
    tile.line(7, 7, 24, 24, '#fbe3d6', 2).line(24, 7, 7, 24, '#fbe3d6', 2)
  })
  const farm = mark('#5fbf5a', (tile) => {
    tile.rect(9, 16, 14, 6, EARTH.base).rect(15, 9, 2, 7, GRASS.edge)
    tile.ellipse(10, 8, 6, 4, GRASS.bright).ellipse(16, 8, 6, 4, GRASS.bright)
  })
  return {
    kind: 'tileset',
    name: 'marcas',
    tileSize: T,
    tiles: [{ image: water }, { image: wall, collision: 'solid' }, { image: farm }],
  }
}
