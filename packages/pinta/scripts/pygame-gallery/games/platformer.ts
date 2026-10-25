/**
 * Platformer: the explorer with the blaster, the bees, the worms, the finish flag, the hearts of
 * the HUD, the terrain pieces (chosen from the neighbours of each solid cell) and the garden
 * decorations, plus the level map. Drawn at half size (×2): a 32 px piece is 64 px in the game.
 */
import type { Drawing, MapDrawing, MapObject, SpriteDrawing, TilesetDrawing } from '../drawing'
import { darken, lighten, mix, Px, random } from '../pixel'
import { COLS, DECORATION, DECORATION_PIECES, ENTITIES, MAIN, ROWS } from './platformer/maps'

const INK = '#2b1d2a'

// The game's palette: warm earth, fresh grass, teal leaves and a coral hero.
const GRASS_DARK = '#3d8a3e'
const GRASS = '#62b246'
const GRASS_LIGHT = '#9bd75c'
const GRASS_TIP = '#d2f08a'
const DIRT_DEEP = '#5c3326'
const DIRT_DARK = '#7a4630'
const DIRT = '#9c5f3d'
const DIRT_LIGHT = '#bd7c4f'
const STONE = '#d2ab88'
const STONE_DARK = '#8e6a55'

const LEAF_DARK = '#1f6b58'
const LEAF = '#2f9474'
const LEAF_LIGHT = '#57bf8c'
const LEAF_TIP = '#a3e3a6'
const BARK_DARK = '#5a3a2c'
const BARK = '#83573c'
const BARK_LIGHT = '#a97a52'

// Hero.
const SKIN = '#f3c08f'
const SKIN_SHADE = '#d5976a'
const CAP = '#e5493a'
const CAP_DARK = '#a82f2f'
const CAP_LIGHT = '#ff7d5c'
const HAIR = '#6b3a2a'
const SHIRT = '#ffd25a'
const SHIRT_DARK = '#d79b2f'
const OVERALL = '#3c6fd0'
const OVERALL_DARK = '#284b9c'
const OVERALL_LIGHT = '#6a98ef'
const SHOE = '#4a2f3a'
const SHOE_LIGHT = '#7a5263'
const PACK = '#4f9a63'
const PACK_DARK = '#2f6a45'
const METAL = '#9fb0c4'
const METAL_DARK = '#5d6b80'
const METAL_LIGHT = '#dbe6f2'
const GLOW = '#ffe15a'
const GLOW_HOT = '#fff7c9'
const GLOW_WARM = '#ff9a3c'
const EYE = '#2b1d2a'
const WHITE = '#ffffff'

// ---------------------------------------------------------------------------------------------
// The explorer (32×32, facing right). The blaster's barrel sits at rows 19–21, where the game
// puts the muzzle flash and the shot (player center + 8 px in the game).

interface Pose {
  /** Body bob (rows, + is down). */
  bob: number
  /** Feet: x of each shoe's left side and how high it is lifted. */
  back: [number, number]
  front: [number, number]
  blink?: boolean
  hurt?: boolean
  /** Arms up (jumping). */
  reach?: boolean
}

function leg(p: Px, hipX: number, hipY: number, footX: number, lift: number, near: boolean) {
  const footY = 28 - lift
  const pant = near ? OVERALL : OVERALL_DARK
  p.line(hipX, hipY, footX + 1, footY - 1, pant, 3)
  p.rect(footX - 1, footY, 5, 2, near ? SHOE : darken(SHOE, 0.15))
  p.rect(footX, footY, 3, 1, near ? SHOE_LIGHT : SHOE)
}

function explorer(pose: Pose): Px {
  const p = new Px(32, 32)
  const b = pose.bob
  // Back leg, backpack, body.
  leg(p, 13, 24 + b, pose.back[0], pose.back[1], false)
  p.rect(6, 15 + b, 5, 9, PACK).rect(6, 15 + b, 1, 9, PACK_DARK).rect(7, 17 + b, 3, 1, PACK_DARK)
  p.rect(10, 15 + b, 10, 8, SHIRT)
  p.rect(10, 15 + b, 2, 8, SHIRT_DARK)
  p.rect(11, 19 + b, 9, 6, OVERALL).rect(11, 19 + b, 9, 1, OVERALL_LIGHT)
  p.rect(12, 16 + b, 2, 4, OVERALL).rect(17, 16 + b, 2, 4, OVERALL)
  p.set(13, 21 + b, GLOW).set(17, 21 + b, GLOW)
  leg(p, 17, 24 + b, pose.front[0], pose.front[1], true)
  // Head: round face, cap with a visor to the right, hair tuft at the back.
  p.ellipse(9, 3 + b, 14, 13, SKIN)
  p.rect(9, 9 + b, 3, 5, HAIR).set(8, 10 + b, HAIR).set(8, 12 + b, HAIR)
  p.ellipse(9, 2 + b, 14, 9, CAP)
  p.rect(9, 7 + b, 14, 2, CAP)
  p.rect(20, 7 + b, 6, 2, CAP_DARK).rect(20, 7 + b, 5, 1, CAP)
  p.rect(12, 3 + b, 4, 1, CAP_LIGHT).rect(11, 4 + b, 2, 1, CAP_LIGHT)
  p.rect(14, 4 + b, 3, 3, WHITE).rect(15, 5 + b, 1, 1, CAP)
  p.rect(9, 8 + b, 14, 1, CAP_DARK)
  // Face.
  if (pose.hurt) {
    p.set(18, 10 + b, EYE).set(20, 10 + b, EYE).set(19, 11 + b, EYE).set(18, 12 + b, EYE).set(20, 12 + b, EYE)
    p.rect(18, 14 + b, 3, 1, EYE)
  } else if (pose.blink) p.rect(18, 11 + b, 3, 1, EYE)
  else p.rect(19, 10 + b, 2, 3, EYE).set(19, 10 + b, WHITE)
  p.set(21, 13 + b, '#f08a7a').set(17, 13 + b, '#f08a7a')
  p.rect(10, 13 + b, 2, 2, SKIN_SHADE)
  // Blaster held in front, barrel to the right edge (rows 19–21, fixed: the shots come from it).
  p.rect(16, 18, 10, 5, METAL).rect(16, 18, 10, 1, METAL_LIGHT).rect(16, 22, 10, 1, METAL_DARK)
  p.rect(26, 19, 4, 3, METAL_DARK).rect(26, 19, 4, 1, METAL)
  p.rect(19, 19, 4, 2, GLOW).rect(20, 19, 2, 1, GLOW_HOT)
  p.rect(17, 23, 3, 2, METAL_DARK)
  // Hands.
  if (pose.reach) p.rect(14, 18, 3, 3, SKIN).rect(22, 21, 3, 2, SKIN)
  else p.rect(15, 20, 3, 3, SKIN).rect(22, 21, 3, 2, SKIN)
  p.outline(INK)
  return p
}

function explorerFrames() {
  // Breathing: the body sinks one row and the eyes blink once.
  const idle = [
    explorer({ bob: 0, back: [11, 0], front: [17, 0] }),
    explorer({ bob: 0, back: [11, 0], front: [17, 0] }),
    explorer({ bob: 1, back: [11, 0], front: [17, 0] }),
    explorer({ bob: 1, back: [11, 0], front: [17, 0], blink: true }),
  ]
  // Run: six poses of a stride, the body bobbing on the passing frames.
  const strides: [[number, number], [number, number], number][] = [
    [[8, 0], [20, 0], 0],
    [[10, 1], [18, 0], 1],
    [[13, 3], [15, 0], 0],
    [[20, 0], [8, 0], 0],
    [[18, 0], [10, 1], 1],
    [[15, 0], [13, 3], 0],
  ]
  const run = strides.map(([back, front, bob]) => explorer({ bob, back, front }))
  const jump = [
    explorer({ bob: 0, back: [10, 3], front: [18, 2], reach: true }),
    explorer({ bob: 0, back: [8, 1], front: [20, 1] }),
  ]
  const hurt = [explorer({ bob: 1, back: [9, 1], front: [19, 0], hurt: true })]
  return { idle, run, jump, hurt }
}

// ---------------------------------------------------------------------------------------------
// The shot and the muzzle flash.

function shot(): Px {
  // 24×12: a hot pellet with a trail, the bright end to the right.
  const s = new Px(24, 12)
  s.rect(2, 5, 6, 2, GLOW_WARM)
  s.rect(6, 4, 8, 4, GLOW_WARM)
  s.ellipse(11, 2, 11, 8, GLOW)
  s.ellipse(13, 3, 8, 6, GLOW_HOT)
  s.rect(17, 5, 3, 2, WHITE)
  s.set(4, 3, GLOW).set(7, 8, GLOW).set(1, 6, GLOW_WARM)
  s.outline('#b8452a')
  return s
}

function flash(): Px {
  // 16×20: a star of light, opening to the right of the barrel.
  const f = new Px(16, 20)
  f.polygon([[0, 7], [6, 1], [7, 6], [15, 3], [10, 10], [15, 17], [7, 14], [6, 19], [0, 13]], GLOW_WARM)
  f.polygon([[1, 8], [6, 4], [8, 7], [12, 6], [9, 10], [12, 14], [8, 13], [6, 16], [1, 12]], GLOW)
  f.ellipse(1, 7, 8, 6, GLOW_HOT)
  f.rect(2, 9, 4, 2, WHITE)
  return f
}

// ---------------------------------------------------------------------------------------------
// The bee (20×22, flying to the left) and the worm (22×14, crawling to the right).

const BEE = '#ffc93a'
const BEE_LIGHT = '#ffe58a'
const BEE_DARK = '#d98e1f'
const BEE_STRIPE = '#3a2732'
const WING = '#e8f7ff'
const WING_SHADE = '#a9d4ee'

function bee(frame: number): Px {
  const b = new Px(20, 22)
  const bob = [0, 1, 1, 0][frame]!
  // Wings behind the body: up, middle, down, middle.
  const wing = [
    [[8, 9], [6, 1], [11, 0], [12, 8]],
    [[8, 9], [4, 3], [10, 2], [12, 8]],
    [[8, 9], [3, 7], [8, 7], [12, 9]],
    [[8, 9], [4, 3], [10, 2], [12, 8]],
  ][frame]! as [number, number][]
  b.polygon(wing, WING)
  b.polygon(wing.map(([x, y]) => [x + 4, y + 1] as [number, number]), WING_SHADE)
  b.polygon(wing.map(([x, y]) => [x + 3, y] as [number, number]), WING)
  // Body and head.
  b.ellipse(5, 9 + bob, 13, 10, BEE)
  b.rect(9, 9 + bob, 2, 10, BEE_STRIPE).rect(13, 10 + bob, 2, 8, BEE_STRIPE)
  b.rect(6, 10 + bob, 3, 2, BEE_LIGHT)
  b.rect(16, 13 + bob, 2, 4, BEE_DARK)
  b.set(18, 14 + bob, BEE_STRIPE).set(19, 15 + bob, BEE_STRIPE)
  b.ellipse(1, 9 + bob, 7, 7, BEE)
  b.rect(2, 10 + bob, 2, 1, BEE_LIGHT)
  b.rect(2, 12 + bob, 2, 2, EYE).set(2, 12 + bob, WHITE)
  b.set(4, 15 + bob, BEE_DARK).set(5, 15 + bob, BEE_DARK)
  // Antennae.
  b.line(4, 9 + bob, 2, 6 + bob, BEE_STRIPE).set(1, 5 + bob, BEE_STRIPE)
  b.line(6, 9 + bob, 6, 6 + bob, BEE_STRIPE).set(7, 5 + bob, BEE_STRIPE)
  b.outline(INK)
  return b
}

const WORM = '#e2679a'
const WORM_LIGHT = '#ff9cc2'
const WORM_DARK = '#a8406f'
const WORM_BELLY = '#ffc7d9'

function worm(frame: number): Px {
  const w = new Px(22, 14)
  // An inchworm: segments along a hump that travels from the tail to the head.
  const hump = [0, 1, 2, 1][frame]!
  const stretch = [0, 1, 0, -1][frame]!
  const segments = 6
  for (let index = 0; index < segments; index++) {
    const t = index / (segments - 1)
    const x = 3 + t * (13 + stretch)
    const rise = Math.max(0, 1 - Math.abs(t - 0.45) * 2.4) * (2 + hump * 1.5)
    const y = 9 - rise
    w.circle(x, y, index === segments - 1 ? 3.6 : 2.8, index % 2 ? WORM : mix(WORM, WORM_DARK, 0.25))
  }
  // Belly and light along the back.
  for (let x = 0; x < 22; x++) {
    let bottom = -1
    let top = -1
    for (let y = 0; y < 14; y++)
      if (w.get(x, y)) {
        if (top < 0) top = y
        bottom = y
      }
    if (bottom >= 0) {
      w.set(x, bottom, WORM_DARK)
      if (top !== bottom) w.set(x, top, WORM_LIGHT)
    }
  }
  const head = 3 + 13 + stretch
  w.rect(head - 2, 10, 3, 1, WORM_BELLY)
  w.rect(head, 6, 2, 3, WHITE).rect(head + 1, 7, 1, 2, EYE)
  w.set(head + 2, 10, WORM_DARK)
  w.outline(INK)
  return w
}

// ---------------------------------------------------------------------------------------------
// The finish flag (32×64: pole on the left, cloth waving to the right) and the HUD heart.

const FLAG = '#ff6b4a'
const FLAG_DARK = '#c8433a'
const FLAG_LIGHT = '#ff9a73'

function flag(frame: number): Px {
  const f = new Px(32, 64)
  // Stone base.
  f.rect(1, 58, 10, 6, STONE).rect(1, 58, 10, 1, lighten(STONE, 0.3)).rect(1, 62, 10, 2, STONE_DARK)
  // Pole and golden knob.
  f.rect(5, 5, 2, 53, METAL_LIGHT).rect(6, 5, 1, 53, METAL)
  f.circle(6, 3.5, 2.6, GLOW).set(5, 2, GLOW_HOT)
  // Cloth: each column waves with a phase that moves along it.
  for (let x = 7; x < 29; x++) {
    const t = (x - 7) / 21
    const wave = Math.round(Math.sin(t * 5 - frame * (Math.PI / 2)) * 1.6 * t)
    const top = 7 + wave
    const height = 15 - Math.round(t * 3)
    for (let y = 0; y < height; y++) {
      const shade = Math.sin(t * 5 - frame * (Math.PI / 2) + 0.9)
      f.set(x, top + y, shade > 0.5 ? FLAG_LIGHT : shade < -0.5 ? FLAG_DARK : FLAG)
    }
  }
  // A star on the cloth.
  const sy = 12 + Math.round(Math.sin(0.4 * 5 - frame * (Math.PI / 2)) * 1.6 * 0.4)
  f.rect(14, sy, 3, 3, GLOW).set(15, sy - 1, GLOW).set(15, sy + 3, GLOW).set(13, sy + 1, GLOW).set(17, sy + 1, GLOW)
  f.set(15, sy + 1, GLOW_HOT)
  f.outline(INK)
  return f
}

const HEART = '#ff4f6a'
const HEART_LIGHT = '#ff9aa8'
const HEART_DARK = '#b8304a'

function heart(full: boolean): Px {
  // 16×15: two round lobes and a point, with a light spot on the top-left lobe.
  const h = new Px(16, 15)
  const fill = full ? HEART : '#6d5a6b'
  h.circle(5, 5, 3.8, fill).circle(11, 5, 3.8, fill)
  h.polygon([[1.2, 6], [14.8, 6], [8, 13.4]], fill)
  h.rect(4, 4, 8, 3, fill)
  if (full) {
    h.rim(null, HEART_DARK)
    h.rect(3, 3, 2, 2, HEART_LIGHT).set(5, 2, HEART_LIGHT).set(3, 5, HEART_LIGHT)
  } else {
    h.rim(null, '#55444f')
    h.rect(5, 6, 6, 2, '#4a3b49').rect(6, 8, 4, 2, '#4a3b49')
  }
  h.outline(INK)
  return h
}

// ---------------------------------------------------------------------------------------------
// Terrain: one piece per combination of open sides (top, right, bottom, left) in two versions,
// plus the inner corners where a wall rises from a floor. All pieces are fully opaque (the game
// draws them fast without blending).

const TOP = 1
const RIGHT = 2
const BOTTOM = 4
const LEFT = 8

interface TerrainKey {
  open: number
  variant: number
  /** Inner corners: the diagonal up-left / up-right is empty while both sides are solid. */
  innerLeft?: boolean
  innerRight?: boolean
}

function terrain(key: TerrainKey): Px {
  const { open, variant } = key
  const rng = random(open * 7 + variant * 101 + (key.innerLeft ? 13 : 0) + (key.innerRight ? 29 : 0) + 5)
  const t = new Px(32, 32, DIRT)
  // Strata: soft horizontal bands of a lighter and a darker earth.
  for (let y = 0; y < 32; y++) {
    const band = (y + variant * 5) % 11
    if (band === 3) t.rect(0, y, 32, 1, mix(DIRT, DIRT_LIGHT, 0.45))
    if (band === 8) t.rect(0, y, 32, 1, mix(DIRT, DIRT_DARK, 0.5))
  }
  t.speckle(rng, 0.06, [DIRT_DARK, DIRT_LIGHT])
  // Pebbles.
  for (let stone = 0; stone < 3 + variant; stone++) {
    const x = rng.int(3, 26)
    const y = rng.int(10, 25)
    const w = rng.int(2, 4)
    t.rect(x, y, w, 2, STONE).rect(x, y + 2, w, 1, STONE_DARK).set(x, y, lighten(STONE, 0.35))
  }
  if (variant === 1 && !(open & TOP)) {
    // A buried bone-shaped root: the second version of a buried piece.
    t.rect(9, 14, 12, 2, BARK).rect(9, 14, 12, 1, BARK_LIGHT).rect(7, 13, 3, 4, BARK).rect(20, 13, 3, 4, BARK)
    t.set(7, 13, BARK_LIGHT).set(20, 13, BARK_LIGHT)
  }
  // Light from the top-left, shade towards the bottom-right on open sides.
  if (open & LEFT) t.rect(1, 0, 2, 32, DIRT_LIGHT).rect(1, 0, 1, 32, lighten(DIRT_LIGHT, 0.15))
  if (open & RIGHT) t.rect(29, 0, 2, 32, DIRT_DARK).rect(30, 0, 1, 32, DIRT_DEEP)
  if (open & BOTTOM) {
    t.rect(0, 28, 32, 3, DIRT_DARK).rect(0, 30, 32, 1, DIRT_DEEP)
    // Little roots hanging out of the bottom.
    for (const x of variant ? [6, 19, 26] : [4, 13, 23]) t.rect(x, 26, 1, 4, BARK_DARK).set(x + 1, 29, BARK_DARK)
  }
  // Grass on top, with a wavy edge and drips down the open sides.
  if (open & TOP) {
    for (let x = 0; x < 32; x++) {
      const depth = 5 + Math.round(1.6 * Math.sin((x + variant * 3) * 0.9) + 0.8 * Math.sin(x * 2.3 + variant))
      t.rect(x, 1, 1, depth, GRASS)
      t.set(x, 1 + depth, GRASS_DARK)
      if (x % 5 === (variant ? 1 : 3)) t.set(x, 2 + depth, GRASS_DARK)
    }
    t.rect(0, 1, 32, 2, GRASS_LIGHT)
    for (let x = variant ? 2 : 0; x < 32; x += 4) t.set(x, 1, GRASS_TIP).set(x + 1, 3, GRASS_LIGHT)
    if (variant === 1) {
      // A little flower in the grass of the second version.
      t.set(22, 3, '#ffe36e').set(21, 3, WHITE).set(23, 3, WHITE).set(22, 2, WHITE).set(22, 4, WHITE)
    }
    if (open & LEFT) t.rect(1, 1, 2, 9, GRASS).rect(1, 1, 1, 8, GRASS_LIGHT).set(2, 10, GRASS_DARK).set(1, 11, GRASS)
    if (open & RIGHT) t.rect(29, 1, 2, 10, GRASS).rect(30, 1, 1, 10, GRASS_DARK).set(29, 11, GRASS_DARK)
  }
  if (key.innerLeft) t.rect(0, 0, 3, 3, GRASS).rect(0, 0, 2, 1, GRASS_LIGHT).set(0, 3, GRASS_DARK).set(3, 0, GRASS_DARK)
  if (key.innerRight) t.rect(29, 0, 3, 3, GRASS).rect(30, 0, 2, 1, GRASS_LIGHT).set(31, 3, GRASS_DARK).set(28, 0, GRASS_DARK)
  // Dark border on the open sides.
  if (open & TOP) t.rect(0, 0, 32, 1, INK)
  if (open & BOTTOM) t.rect(0, 31, 32, 1, INK)
  if (open & LEFT) t.rect(0, 0, 1, 32, INK)
  if (open & RIGHT) t.rect(31, 0, 1, 32, INK)
  return t
}

/** Every terrain piece in the order of the tileset: 16 open-side combinations × 2, then corners. */
function terrainKeys(): TerrainKey[] {
  const keys: TerrainKey[] = []
  for (let open = 0; open < 16; open++) for (const variant of [0, 1]) keys.push({ open, variant })
  for (let open = 0; open < 16; open++) {
    if (open & TOP) continue
    const canLeft = !(open & LEFT)
    const canRight = !(open & RIGHT)
    if (canLeft) keys.push({ open, variant: 0, innerLeft: true })
    if (canRight) keys.push({ open, variant: 0, innerRight: true })
    if (canLeft && canRight) keys.push({ open, variant: 0, innerLeft: true, innerRight: true })
  }
  return keys
}

const sameKey = (a: TerrainKey, b: TerrainKey) =>
  a.open === b.open && a.variant === b.variant && !!a.innerLeft === !!b.innerLeft && !!a.innerRight === !!b.innerRight

/** The terrain piece of each cell of the Main layer, from its solid neighbours. */
function terrainCells(keys: TerrainKey[]): number[] {
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS && MAIN[y]![x] === '#'
  const cells: number[] = []
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (!solid(x, y)) {
        cells.push(-1)
        continue
      }
      const open =
        (solid(x, y - 1) ? 0 : TOP) | (solid(x + 1, y) ? 0 : RIGHT) | (solid(x, y + 1) ? 0 : BOTTOM) | (solid(x - 1, y) ? 0 : LEFT)
      const innerLeft = !(open & TOP) && !(open & LEFT) && !solid(x - 1, y - 1)
      const innerRight = !(open & TOP) && !(open & RIGHT) && !solid(x + 1, y - 1)
      const key: TerrainKey =
        innerLeft || innerRight
          ? { open, variant: 0, ...(innerLeft ? { innerLeft } : {}), ...(innerRight ? { innerRight } : {}) }
          : { open, variant: (x * 7 + y * 3) % 5 === 0 ? 1 : 0 }
      const index = keys.findIndex((candidate) => sameKey(candidate, key))
      if (index < 0) throw new Error(`peça de terreno sem desenho em ${x},${y}`)
      cells.push(index)
    }
  return cells
}

// ---------------------------------------------------------------------------------------------
// Decorations (32×32 with transparency): mushrooms, flowers, sprouts and the pieces of a tree.

const CAP_BLUE = '#7568e0'
const CAP_BLUE_LIGHT = '#a99cff'
const CAP_BLUE_DARK = '#4c3fa8'
const SPOT = '#f3eeff'
const STEM = '#f1e2c4'
const STEM_SHADE = '#cdb894'
const PETAL = '#ff8fb8'
const PETAL_LIGHT = '#ffc3d8'
const PETAL_DARK = '#d95b8d'
const CENTER = '#ffd84a'

function mushroom(big: boolean): Px {
  const m = new Px(32, 32)
  const w = big ? 18 : 11
  const h = big ? 10 : 7
  const x = 16 - w / 2
  const capY = big ? 14 : 21
  const stemW = big ? 5 : 3
  const stemX = 16 - Math.ceil(stemW / 2)
  // The cap is the top half of an ellipse; the stem grows out from under it to the ground.
  m.ellipse(x, capY, w, h * 2 - 2, CAP_BLUE)
  m.rect(x, capY + h - 1, w, h, null)
  m.rect(x + 1, capY + h - 2, w - 2, 1, CAP_BLUE_DARK)
  m.rect(x + 3, capY + 1, big ? 4 : 2, 1, CAP_BLUE_LIGHT)
  m.rect(x + 2, capY + 3, big ? 3 : 2, 2, SPOT).rect(x + w - (big ? 6 : 4), capY + 2, 2, 2, SPOT)
  if (big) m.rect(x + 8, capY + 5, 3, 2, SPOT)
  m.rect(stemX, capY + h - 1, stemW, 31 - (capY + h - 1), STEM).rect(stemX, capY + h - 1, 1, 31 - (capY + h - 1), STEM_SHADE)
  m.rect(stemX - 1, 30, stemW + 2, 1, STEM_SHADE)
  m.outline(INK)
  return m
}

function flower(m: Px, x: number, top: number, color: string, light: string, dark: string) {
  m.rect(x, top + 4, 1, 31 - top - 4, GRASS_DARK).rect(x + 1, top + 4, 1, 31 - top - 4, GRASS)
  m.rect(x + 2, top + 12, 3, 2, GRASS).rect(x + 2, top + 12, 3, 1, GRASS_LIGHT)
  m.rect(x - 2, top + 1, 6, 3, color).rect(x - 1, top, 4, 5, color)
  m.set(x - 1, top + 1, light).set(x, top, light).set(x + 2, top + 4, dark).set(x + 3, top + 3, dark)
  m.rect(x, top + 2, 2, 1, CENTER).set(x, top + 1, CENTER)
}

function flowers(two: boolean): Px {
  const m = new Px(32, 32)
  if (two) {
    flower(m, 9, 11, PETAL, PETAL_LIGHT, PETAL_DARK)
    flower(m, 20, 15, '#ffb84a', '#ffe08a', '#d9842a')
  } else flower(m, 15, 12, PETAL, PETAL_LIGHT, PETAL_DARK)
  m.outline(INK)
  return m
}

function sprout(m: Px, x: number, top: number, flip: boolean) {
  const dir = flip ? -1 : 1
  m.rect(x, top + 4, 2, 31 - top - 4, GRASS)
  m.rect(x, top + 4, 1, 31 - top - 4, GRASS_DARK)
  m.rect(x, top + 1, 2, 3, GRASS).rect(x + dir * 2, top, 2, 2, GRASS).rect(x + dir * 4, top + 1, 2, 3, GRASS_LIGHT)
  m.set(x + dir * 3, top, GRASS_LIGHT)
  m.rect(x - dir * 3, top + 9, 3, 2, GRASS_LIGHT).set(x - dir, top + 10, GRASS)
}

function sprouts(two: boolean): Px {
  const m = new Px(32, 32)
  if (two) {
    sprout(m, 10, 18, true)
    sprout(m, 20, 13, false)
  } else sprout(m, 15, 12, false)
  m.outline(INK)
  return m
}

/** A trunk piece; `leaves` adds round clumps on the left and/or right, `base` the roots. */
function trunk(leavesLeft: boolean, leavesRight: boolean, base: boolean): Px {
  const m = new Px(32, 32)
  m.rect(14, 0, 4, 32, BARK).rect(14, 0, 1, 32, BARK_LIGHT).rect(17, 0, 1, 32, BARK_DARK)
  for (const y of [5, 17, 26]) m.set(15, y, BARK_DARK).set(16, y + 1, BARK_DARK)
  const clump = (cx: number, cy: number, side: number) => {
    m.line(16, cy + 6, cx + side * -2, cy + 3, BARK, 2)
    m.ellipse(cx - 6, cy - 5, 12, 10, LEAF)
    m.ellipse(cx - 5, cy - 5, 8, 6, LEAF_LIGHT)
    m.rect(cx - 3, cy - 4, 2, 1, LEAF_TIP)
    m.rect(cx - 5, cy + 3, 10, 1, LEAF_DARK)
  }
  if (leavesLeft) clump(7, 10, -1)
  if (leavesRight) clump(25, base ? 6 : 16, 1)
  if (base) {
    m.rect(12, 28, 8, 4, BARK).rect(11, 30, 10, 2, BARK).rect(12, 28, 1, 3, BARK_LIGHT).rect(19, 29, 1, 3, BARK_DARK)
    m.rect(9, 30, 3, 2, GRASS).rect(20, 29, 3, 3, GRASS).set(21, 28, GRASS_LIGHT).set(10, 29, GRASS_LIGHT)
  }
  m.outline(INK)
  // The trunk continues across the piece edges: no border at the top or bottom of it.
  for (let x = 13; x <= 18; x++) {
    if (m.get(x, 0) === INK) m.set(x, 0, x === 14 ? BARK_LIGHT : x === 17 ? BARK_DARK : x === 13 || x === 18 ? INK : BARK)
    if (!base && m.get(x, 31) === INK) m.set(x, 31, x === 14 ? BARK_LIGHT : x === 17 ? BARK_DARK : x === 13 || x === 18 ? INK : BARK)
  }
  return m
}

function crown(): Px {
  const m = new Px(32, 32)
  m.rect(14, 22, 4, 10, BARK).rect(14, 22, 1, 10, BARK_LIGHT).rect(17, 22, 1, 10, BARK_DARK)
  m.ellipse(3, 2, 26, 23, LEAF_DARK)
  m.ellipse(4, 2, 24, 20, LEAF)
  m.ellipse(6, 3, 14, 11, LEAF_LIGHT)
  m.ellipse(8, 4, 6, 4, LEAF_TIP)
  const rng = random(39)
  m.speckle(rng, 0.07, [LEAF_DARK, LEAF_LIGHT], LEAF)
  for (const [x, y] of [[20, 16], [11, 18], [24, 10]] as const) m.rect(x, y, 2, 1, LEAF_DARK)
  m.outline(INK)
  for (let x = 13; x <= 18; x++)
    if (m.get(x, 31) === INK) m.set(x, 31, x === 14 ? BARK_LIGHT : x === 17 ? BARK_DARK : x === 13 || x === 18 ? INK : BARK)
  return m
}

const decorationPieces: Record<string, () => Px> = {
  C: () => mushroom(true),
  c: () => mushroom(false),
  F: () => flowers(true),
  f: () => flowers(false),
  B: () => sprouts(true),
  b: () => sprouts(false),
  A: crown,
  G: () => trunk(true, true, false),
  E: () => trunk(true, false, false),
  T: () => trunk(false, false, false),
  D: () => trunk(false, true, false),
  e: () => trunk(true, false, true),
  t: () => trunk(false, false, true),
  d: () => trunk(false, true, true),
}

// ---------------------------------------------------------------------------------------------

const OBJECT_TYPES: Record<string, string> = { Player: 'jogador', Worm: 'inimigo', Flag: 'saida' }

export function drawings(): Drawing[] {
  const hero = explorerFrames()
  const jogador: SpriteDrawing = {
    kind: 'sprite',
    name: 'jogador',
    frameWidth: 32,
    frameHeight: 32,
    animations: [
      { name: 'parado', fps: 5, loop: true, frames: hero.idle },
      { name: 'correr', fps: 10, loop: true, frames: hero.run },
      { name: 'pular', fps: 1, loop: false, frames: hero.jump },
      { name: 'ferido', fps: 1, loop: false, frames: hero.hurt },
    ],
  }
  const keys = terrainKeys()
  const terreno: TilesetDrawing = {
    kind: 'tileset',
    name: 'terreno',
    tileSize: 32,
    tiles: keys.map((key) => ({ image: terrain(key), collision: 'solid' as const })),
  }
  const enfeites: TilesetDrawing = {
    kind: 'tileset',
    name: 'enfeites',
    tileSize: 32,
    tiles: [...DECORATION_PIECES].map((letter) => ({ image: decorationPieces[letter]!() })),
  }
  const objects: MapObject[] = ENTITIES.map((entity) => ({ ...entity, type: OBJECT_TYPES[entity.name] ?? '' }))
  const mundo: MapDrawing = {
    kind: 'map',
    name: 'mundo',
    cols: COLS,
    rows: ROWS,
    layers: [
      { type: 'tiles', name: 'Main', tileset: terreno, cells: terrainCells(keys) },
      {
        type: 'tiles',
        name: 'Decoration',
        tileset: enfeites,
        cells: DECORATION.flatMap((row) => [...row].map((letter) => DECORATION_PIECES.indexOf(letter))),
      },
      { type: 'objects', name: 'Entities', objects },
    ],
  }
  return [
    jogador,
    {
      kind: 'sprite',
      name: 'abelha',
      frameWidth: 20,
      frameHeight: 22,
      animations: [{ name: 'voar', fps: 10, loop: true, frames: [0, 1, 2, 3].map(bee) }],
    },
    {
      kind: 'sprite',
      name: 'minhoca',
      frameWidth: 22,
      frameHeight: 14,
      animations: [{ name: 'rastejar', fps: 10, loop: true, frames: [0, 1, 2, 3].map(worm) }],
    },
    { kind: 'sprite', name: 'tiro', frameWidth: 24, frameHeight: 12, animations: [{ name: 'voar', fps: 1, loop: true, frames: [shot()] }] },
    { kind: 'sprite', name: 'clarao', frameWidth: 16, frameHeight: 20, animations: [{ name: 'brilhar', fps: 1, loop: false, frames: [flash()] }] },
    {
      kind: 'sprite',
      name: 'bandeira',
      frameWidth: 32,
      frameHeight: 64,
      animations: [{ name: 'tremular', fps: 8, loop: true, frames: [0, 1, 2, 3].map(flag) }],
    },
    {
      kind: 'sprite',
      name: 'coracao',
      frameWidth: 16,
      frameHeight: 15,
      animations: [
        { name: 'cheio', fps: 1, loop: true, frames: [heart(true)] },
        { name: 'vazio', fps: 1, loop: true, frames: [heart(false)] },
      ],
    },
    terreno,
    enfeites,
    mundo,
  ]
}

