/**
 * PyDew Valley: trees, apples and stumps, wild plants, the crops, the rain, the water, the tilled
 * soil and the icons of the tools and seeds.
 */
import type { SpriteDrawing, TilesetDrawing } from '../../drawing'
import { darken, lighten, mix, Px, random } from '../../pixel'
import { FLOWER, GRASS, INK, METAL, SOIL, WATER, WOOD } from './palette'

const LEAF = {
  outline: '#2d4a37',
  deep: '#3d6e45',
  dark: '#4f8a4e',
  base: '#66a556',
  light: '#86c262',
  bright: '#b0dc78',
}
const BARK = { dark: '#5e3c27', base: '#80553a', light: '#a3744d' }
const CREAM = '#fbf5e6'

// Trees ---------------------------------------------------------------------------------------

/** A round crown made of puffs, lit from the top-left. */
function crown(s: Px, puffs: [number, number, number][], seed: number) {
  for (const [x, y, r] of puffs) s.circle(x, y, r, LEAF.dark)
  for (const [x, y, r] of puffs) s.circle(x - 1, y - 1, r - 1.5, LEAF.base)
  for (const [x, y, r] of puffs) if (r > 4) s.circle(x - r * 0.35, y - r * 0.4, r * 0.45, LEAF.light)
  const rng = random(seed)
  s.speckle(rng, 0.06, [LEAF.light, LEAF.dark], LEAF.base)
  s.speckle(rng, 0.08, [LEAF.bright], LEAF.light)
}

function trunk(s: Px, x: number, y: number, w: number, h: number) {
  s.rect(x, y, w, h, BARK.base).rect(x, y, 2, h, BARK.light).rect(x + w - 2, y, 2, h, BARK.dark)
  s.rect(x - 2, y + h - 2, w + 4, 2, BARK.base).rect(x - 2, y + h - 1, w + 4, 1, BARK.dark)
  s.set(x + Math.floor(w / 2), y + 3, BARK.dark).set(x + Math.floor(w / 2), y + 4, BARK.dark)
}

function bigTree(): Px {
  const s = new Px(48, 62)
  trunk(s, 19, 40, 10, 22)
  const crownLayer = new Px(48, 62)
  crown(
    crownLayer,
    [
      [24, 13, 12],
      [12, 21, 10.5],
      [36, 21, 10.5],
      [17, 33, 11],
      [32, 33, 11],
      [24, 27, 12],
    ],
    11,
  )
  s.draw(crownLayer)
  s.outline(LEAF.outline)
  return s
}

function smallTree(): Px {
  const s = new Px(28, 58)
  trunk(s, 10, 40, 7, 18)
  const crownLayer = new Px(28, 58)
  crown(
    crownLayer,
    [
      [14, 9, 8.5],
      [14, 19, 10],
      [14, 30, 10.5],
      [9, 24, 7],
      [19, 24, 7],
    ],
    12,
  )
  s.draw(crownLayer)
  s.outline(LEAF.outline)
  return s
}

function stump(w: number, h: number): Px {
  const s = new Px(w, h)
  const cx = w / 2
  s.rect(cx - 6, 6, 12, h - 9, BARK.base).rect(cx - 6, 6, 2, h - 9, BARK.light).rect(cx + 4, 6, 2, h - 9, BARK.dark)
  s.rect(cx - 8, h - 4, 16, 3, BARK.base).rect(cx - 8, h - 2, 16, 1, BARK.dark)
  s.ellipse(cx - 6, 3, 12, 6, WOOD.pale).ellipse(cx - 4, 4, 8, 4, WOOD.light).ellipse(cx - 2, 5, 4, 2, WOOD.pale)
  s.outline(INK)
  return s
}

function apple(): Px {
  const s = new Px(14, 10)
  s.ellipse(2, 1, 10, 9, FLOWER.red)
  s.rect(4, 2, 2, 2, '#f39283').set(9, 7, FLOWER.redDark).set(10, 6, FLOWER.redDark).set(8, 8, FLOWER.redDark)
  s.rect(7, 0, 1, 2, BARK.dark)
  s.rect(8, 0, 3, 1, LEAF.light).set(9, 1, LEAF.dark)
  s.outline(INK)
  return s
}

/** Trees (`grande`, `pequena`), their stumps and the apple. The game crops each frame to its art. */
export function trees(): SpriteDrawing {
  const frame = (art: Px) => {
    const f = new Px(48, 62)
    f.draw(art, Math.floor((48 - art.width) / 2), 62 - art.height)
    return f
  }
  return {
    kind: 'sprite',
    name: 'arvores',
    frameWidth: 48,
    frameHeight: 62,
    animations: [
      { name: 'grande', fps: 1, loop: true, frames: [frame(bigTree())] },
      { name: 'pequena', fps: 1, loop: true, frames: [frame(smallTree())] },
      { name: 'toco-grande', fps: 1, loop: true, frames: [frame(stump(20, 20))] },
      { name: 'toco-pequeno', fps: 1, loop: true, frames: [frame(stump(16, 20))] },
      { name: 'maca', fps: 1, loop: true, frames: [frame(apple())] },
    ],
  }
}

// Wild plants ---------------------------------------------------------------------------------

function sunflower(): Px {
  const s = new Px(28, 56)
  s.rect(13, 18, 3, 38, GRASS.dark).rect(13, 18, 1, 38, GRASS.light)
  s.ellipse(3, 30, 11, 6, GRASS.dark).ellipse(15, 38, 11, 6, GRASS.dark)
  s.ellipse(4, 30, 8, 3, GRASS.light).ellipse(16, 38, 8, 3, GRASS.light)
  for (let index = 0; index < 12; index++) {
    const angle = (index / 12) * Math.PI * 2
    s.circle(14 + Math.cos(angle) * 8, 11 + Math.sin(angle) * 8, 3.2, index % 2 ? FLOWER.yellow : '#f8e07a')
  }
  s.circle(14, 11, 6, '#7a4a28').circle(13, 10, 3, '#9a6234')
  s.set(11, 8, '#c08850').set(15, 12, '#5a361e').set(12, 13, '#5a361e')
  s.outline(INK)
  return s
}

function bush(): Px {
  const s = new Px(32, 30)
  crown(
    s,
    [
      [10, 17, 9],
      [22, 17, 9],
      [16, 11, 9.5],
      [16, 20, 9],
    ],
    21,
  )
  for (const [x, y] of [[9, 14], [20, 10], [23, 20], [13, 22]] as const)
    s.set(x, y, FLOWER.pink).set(x + 1, y, FLOWER.pink).set(x, y + 1, FLOWER.pinkDark)
  s.outline(LEAF.outline)
  return s
}

function flowerPlant(): Px {
  const s = new Px(22, 24)
  s.ellipse(2, 16, 9, 6, GRASS.dark).ellipse(11, 17, 9, 6, GRASS.dark).ellipse(4, 17, 6, 3, GRASS.light)
  for (const [x, y] of [[7, 8], [15, 11], [10, 14]] as const) {
    s.line(x, y + 3, x, y + 8, GRASS.edge)
    for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]] as const) s.circle(x + dx, y + dy, 1.6, CREAM)
    s.set(x, y, FLOWER.yellow)
  }
  s.outline(INK)
  return s
}

function mushroomBig(): Px {
  const s = new Px(20, 22)
  s.rect(7, 11, 6, 10, CREAM).rect(7, 11, 2, 10, '#ffffff').rect(11, 11, 2, 10, '#e3d6bd')
  s.ellipse(1, 2, 18, 12, FLOWER.red).ellipse(3, 3, 9, 5, '#ef7468')
  s.rect(1, 11, 18, 2, FLOWER.redDark)
  for (const [x, y] of [[5, 5], [12, 4], [14, 8], [8, 9]] as const) s.rect(x, y, 2, 2, CREAM)
  s.outline(INK)
  return s
}

function mushroomCluster(): Px {
  const s = new Px(26, 26)
  const one = (x: number, y: number, r: number) => {
    s.rect(x - 1, y, 3, r + 3, CREAM).rect(x - 1, y, 1, r + 3, '#ffffff')
    s.ellipse(x - r, y - r + 1, r * 2 + 1, r + 2, FLOWER.purple)
    s.set(x - r + 2, y - r + 2, lighten(FLOWER.purple, 0.4))
    s.rect(x - r, y + 1, r * 2 + 1, 1, FLOWER.purpleDark)
  }
  one(16, 9, 6)
  one(7, 15, 5)
  one(19, 18, 4)
  s.outline(INK)
  return s
}

/** Decorations of the map: sunflower, bush, flowers, mushroom and mushrooms (cropped by the game). */
export function wildPlants(): SpriteDrawing {
  const frame = (art: Px) => {
    const f = new Px(32, 56)
    f.draw(art, Math.floor((32 - art.width) / 2), 56 - art.height)
    return f
  }
  const one = (name: string, art: Px) => ({ name, fps: 1, loop: true, frames: [frame(art)] })
  return {
    kind: 'sprite',
    name: 'enfeites',
    frameWidth: 32,
    frameHeight: 56,
    animations: [
      one('girassol', sunflower()),
      one('arbusto', bush()),
      one('flor', flowerPlant()),
      one('cogumelo', mushroomBig()),
      one('cogumelos', mushroomCluster()),
    ],
  }
}

// Crops ---------------------------------------------------------------------------------------

const STEM = '#4f8a3a'
const STEM_LIGHT = '#79b852'
const CORN = '#f2cf4e'
const CORN_DARK = '#c99a2e'
const HUSK = '#9fcf6a'

function leaf(s: Px, x: number, y: number, dx: number, length: number) {
  for (let index = 0; index < length; index++) {
    const px = x + dx * index
    const py = y - Math.round(index * 0.6) + Math.round((index * index) / (length * 1.6))
    s.set(px, py, index < length / 2 ? STEM : STEM_LIGHT).set(px, py + 1, STEM)
  }
}

function cornStage(stage: number): Px {
  const s = new Px(32, 32)
  const base = 31
  if (stage === 0) {
    s.rect(15, base - 5, 2, 6, STEM)
    leaf(s, 14, base - 4, -1, 4)
    leaf(s, 17, base - 5, 1, 4)
  } else {
    const height = [0, 12, 22, 28][stage]!
    s.rect(15, base - height, 2, height + 1, STEM).rect(15, base - height, 1, height, STEM_LIGHT)
    for (let y = base - 2; y > base - height + 3; y -= 5) {
      leaf(s, 14, y, -1, Math.min(9, 4 + stage * 2))
      leaf(s, 17, y - 2, 1, Math.min(9, 4 + stage * 2))
    }
    s.rect(14, base - height - 2, 4, 3, STEM_LIGHT)
    if (stage === 3) {
      for (const [x, y] of [[9, 12], [19, 15]] as const) {
        s.ellipse(x, y, 5, 10, CORN).rect(x + 1, y + 1, 1, 7, '#fbe48a').rect(x + 3, y + 2, 1, 6, CORN_DARK)
        s.line(x, y + 6, x + 1, y + 10, HUSK).line(x + 4, y + 6, x + 3, y + 10, HUSK)
      }
      s.rect(14, base - height - 4, 4, 3, CORN_DARK)
    }
  }
  s.outline(darken(STEM, 0.5))
  return s
}

const TOMATO = '#e2483d'
const TOMATO_GREEN = '#9ccf5a'

function tomatoStage(stage: number): Px {
  const s = new Px(32, 32)
  const base = 31
  if (stage === 0) {
    s.rect(15, base - 4, 2, 5, STEM)
    s.ellipse(11, base - 7, 6, 4, STEM_LIGHT).ellipse(16, base - 8, 6, 4, STEM_LIGHT)
  } else {
    const height = [0, 12, 20, 24][stage]!
    s.rect(9, base - height + 2, 2, height - 1, WOOD.base).rect(21, base - height + 2, 2, height - 1, WOOD.base)
    s.rect(15, base - height + 4, 2, height - 3, STEM)
    const puffs: [number, number, number][] = [
      [16, base - height + 6, 5 + stage],
      [11, base - height / 2, 4 + stage],
      [21, base - height / 2 + 1, 4 + stage],
      [16, base - 6, 4 + stage / 2],
    ]
    for (const [x, y, r] of puffs) s.circle(x, y, r, LEAF.dark)
    for (const [x, y, r] of puffs) s.circle(x - 1, y - 1, r - 1.5, LEAF.base)
    for (const [x, y, r] of puffs) s.circle(x - r * 0.3, y - r * 0.4, r * 0.35, LEAF.light)
    if (stage >= 2) {
      const color = stage === 3 ? TOMATO : TOMATO_GREEN
      for (const [x, y] of [[10, base - 13], [19, base - 16], [15, base - 9], [21, base - 8]] as const) {
        s.circle(x, y, 2.6, color)
        s.set(x - 1, y - 1, lighten(color, 0.45))
        s.set(x, y - 3, STEM)
      }
    }
  }
  s.outline(darken(STEM, 0.5))
  return s
}

/** The crops: `milho` and `tomate`, four growing stages each (the last one is ripe). */
export function crops(): SpriteDrawing {
  return {
    kind: 'sprite',
    name: 'plantas',
    frameWidth: 32,
    frameHeight: 32,
    animations: [
      { name: 'milho', fps: 1, loop: false, frames: [0, 1, 2, 3].map(cornStage) },
      { name: 'tomate', fps: 1, loop: false, frames: [0, 1, 2, 3].map(tomatoStage) },
    ],
  }
}

// Rain ----------------------------------------------------------------------------------------

/** Rain: falling drops (they move down and to the left) and splashes on the ground. */
export function rain(): SpriteDrawing {
  const drop = (length: number) => {
    const s = new Px(16, 16)
    // A streak falling down and to the left (the game moves it by (-2, 4)).
    for (let index = 0; index < length; index++) {
      const x = 12 - Math.floor(index / 2)
      const y = 1 + index
      const color = index < 2 ? '#ffffff' : index < length - 3 ? WATER.foam : WATER.light
      s.set(x, y, color).set(x + 1, y, index < length - 2 ? WATER.light : WATER.base)
    }
    return s
  }
  const splash = (size: number) => {
    const s = new Px(16, 16)
    const w = 4 + size * 3
    const h = 2 + size
    const x = 8 - Math.floor(w / 2)
    const y = 10 - Math.floor(h / 2)
    s.ellipse(x, y, w, h, WATER.light)
    s.ellipse(x + 1, y + 1, w - 2, Math.max(1, h - 2), null)
    if (size > 0) s.set(x - 1, y - 2, WATER.foam).set(x + w, y - 2, WATER.foam)
    if (size > 1) s.set(8, y - 3, WATER.foam)
    return s
  }
  return {
    kind: 'sprite',
    name: 'chuva',
    frameWidth: 16,
    frameHeight: 16,
    animations: [
      { name: 'gotas', fps: 1, loop: true, frames: [drop(6), drop(11), drop(9)] },
      { name: 'respingos', fps: 1, loop: true, frames: [splash(0), splash(1), splash(2)] },
    ],
  }
}

// Water ---------------------------------------------------------------------------------------

/** The water of the pond and the lake: an opaque tile whose ripples drift across 4 frames. */
export function water(): SpriteDrawing {
  const frame = (phase: number) => {
    const s = new Px(32, 32, WATER.base)
    const rng = random(77)
    for (let index = 0; index < 40; index++) s.set(rng.int(0, 31), rng.int(0, 31), mix(WATER.base, WATER.deep, 0.5))
    const waves: [number, number, number][] = [
      [3, 4, 6],
      [18, 9, 5],
      [8, 16, 7],
      [24, 22, 5],
      [2, 27, 5],
    ]
    for (const [x0, y, length] of waves) {
      const shift = phase * 8 + (y % 3)
      for (let index = 0; index < length; index++) {
        const x = (x0 + index + shift) % 32
        s.set(x, y, index === 0 || index === length - 1 ? WATER.light : WATER.foam)
        s.set(x, y + 1, WATER.light)
      }
    }
    return s
  }
  return {
    kind: 'sprite',
    name: 'agua',
    frameWidth: 32,
    frameHeight: 32,
    animations: [{ name: 'ondas', fps: 5, loop: true, frames: [0, 1, 2, 3].map(frame) }],
  }
}

// Tilled soil ---------------------------------------------------------------------------------

type Side = 't' | 'b' | 'l' | 'r'
/** The 16 soil pieces in the order of SOIL_TILES (settings.py): the sides each one joins. */
const SOIL_JOINS: [string, Side[]][] = [
  ['o', []],
  ['x', ['t', 'b', 'l', 'r']],
  ['l', ['r']],
  ['r', ['l']],
  ['lr', ['l', 'r']],
  ['t', ['b']],
  ['b', ['t']],
  ['tb', ['t', 'b']],
  ['tl', ['r', 'b']],
  ['tr', ['l', 'b']],
  ['bl', ['r', 't']],
  ['br', ['l', 't']],
  ['tbr', ['t', 'b', 'r']],
  ['tbl', ['t', 'b', 'l']],
  ['lrb', ['l', 'r', 't']],
  ['lrt', ['l', 'r', 'b']],
]

/** A small fixed noise in [0, 1) from a position (the same on every piece, so edges stay soft). */
function wobble(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function soilPiece(joins: Side[], seed: number): Px {
  const s = new Px(32, 32)
  const inset = 2
  const radius = 7
  const open = (side: Side) => !joins.includes(side)
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const cx = x + 0.5
      const cy = y + 0.5
      const dn = open('t') ? cy - inset : Infinity
      const ds = open('b') ? 32 - inset - cy : Infinity
      const dw = open('l') ? cx - inset : Infinity
      const de = open('r') ? 32 - inset - cx : Infinity
      let distance = Math.min(dn, ds, dw, de)
      for (const [vertical, horizontal] of [
        [dn, dw],
        [dn, de],
        [ds, dw],
        [ds, de],
      ] as const)
        if (vertical < radius && horizontal < radius)
          distance = Math.min(distance, radius - Math.hypot(radius - vertical, radius - horizontal))
      // A crumbly border: the edge moves in and out by up to one pixel.
      distance -= wobble(x, y) * 1.2
      if (distance <= 0) continue
      // Furrows: rows of clods with a lit top and a groove under them.
      const row = (y + 2) % 8
      let color = SOIL.base
      if (row === 0 || row === 1) color = wobble(x, y + 1) < 0.75 ? SOIL.light : SOIL.base
      else if (row === 6) color = wobble(x + 3, y) < 0.8 ? SOIL.dark : SOIL.base
      else if (row === 7) color = wobble(x, y + 5) < 0.4 ? SOIL.deep : SOIL.dark
      // Border: lit on the top and left, in shadow on the bottom and right.
      if (distance < 1.3) color = dn < 2.5 || dw < 2.5 ? SOIL.light : SOIL.dark
      else if (distance < 2.3 && (ds < 3.5 || de < 3.5)) color = SOIL.dark
      s.set(x, y, color)
    }
  const rng = random(seed)
  s.speckle(rng, 0.06, [SOIL.pale, SOIL.dark], SOIL.base)
  return s
}

/** `solo`: the tilled soil, one piece for each way a hoed tile touches its neighbours. */
export function soilTiles(): TilesetDrawing {
  return {
    kind: 'tileset',
    name: 'solo',
    tileSize: 32,
    tiles: SOIL_JOINS.map(([, joins], index) => ({ image: soilPiece(joins, 300 + index) })),
  }
}

/** `solo-molhado`: wet patches drawn over a watered soil tile (three variations). */
export function wetSoilTiles(): TilesetDrawing {
  const wet = (seed: number) => {
    const s = new Px(32, 32)
    const rng = random(seed)
    for (let index = 0; index < 7; index++) {
      const w = rng.int(9, 15)
      const h = rng.int(6, 10)
      s.ellipse(rng.int(3, 29 - w), rng.int(3, 29 - h), w, h, SOIL.wet)
    }
    s.ellipse(5, 5, 22, 22, SOIL.wet)
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (s.get(x, y) && y % 6 === 0) s.set(x, y, SOIL.wetLight)
    s.speckle(rng, 0.06, [SOIL.wetLight], SOIL.wet)
    return s
  }
  return {
    kind: 'tileset',
    name: 'solo-molhado',
    tileSize: 32,
    tiles: [wet(901), wet(902), wet(903)].map((image) => ({ image })),
  }
}

// Icons ---------------------------------------------------------------------------------------

function framed(s: Px): Px {
  s.outline(INK)
  s.outline(CREAM)
  return s
}

function iconHoe(): Px {
  const s = new Px(32, 32)
  s.line(8, 26, 22, 8, WOOD.base, 3).line(8, 25, 21, 8, WOOD.light)
  s.polygon([[18, 4], [27, 4], [27, 13], [24, 13], [24, 8], [18, 8]], METAL.base)
  s.rect(19, 5, 7, 1, METAL.light).rect(25, 9, 1, 3, METAL.dark)
  return framed(s)
}

function iconAxe(): Px {
  const s = new Px(32, 32)
  s.line(9, 27, 21, 7, WOOD.base, 3).line(9, 26, 20, 7, WOOD.light)
  s.polygon([[18, 4], [28, 2], [29, 14], [20, 12]], METAL.base)
  s.line(28, 3, 29, 13, METAL.light).rect(19, 6, 3, 5, METAL.dark)
  return framed(s)
}

function iconCan(): Px {
  const s = new Px(32, 32)
  s.rect(6, 12, 15, 13, '#5aa36a').rect(6, 12, 15, 2, '#8fd09a').rect(6, 23, 15, 2, '#3e7a4f')
  s.rect(9, 8, 9, 2, '#3e7a4f').rect(8, 10, 2, 3, '#3e7a4f').rect(17, 10, 2, 3, '#3e7a4f')
  s.line(21, 18, 27, 12, '#3e7a4f', 2).rect(26, 10, 3, 3, METAL.base)
  s.rect(8, 15, 2, 6, '#8fd09a')
  return framed(s)
}

function iconCorn(): Px {
  const s = new Px(32, 32)
  s.ellipse(10, 4, 11, 21, CORN)
  for (let y = 7; y < 23; y += 3) for (let x = 12; x < 20; x += 3) s.set(x, y, '#fbe48a').set(x + 1, y + 1, CORN_DARK)
  s.polygon([[7, 14], [12, 27], [16, 29], [10, 16]], HUSK).polygon([[24, 14], [19, 27], [15, 29], [21, 16]], HUSK)
  s.line(8, 15, 13, 26, STEM).line(23, 15, 18, 26, STEM)
  return framed(s)
}

function iconTomato(): Px {
  const s = new Px(32, 32)
  s.ellipse(5, 9, 22, 18, TOMATO).ellipse(8, 11, 7, 5, '#f07a6c').set(10, 12, '#ffffff')
  s.ellipse(14, 20, 11, 6, darken(TOMATO, 0.15))
  s.polygon([[10, 8], [16, 11], [22, 8], [18, 12], [14, 12]], STEM_LIGHT).rect(15, 5, 2, 5, STEM)
  return framed(s)
}

/** Icons of the selected tool and seed (bottom-left of the screen). */
export function icons(): SpriteDrawing {
  const one = (name: string, art: Px) => ({ name, fps: 1, loop: true, frames: [art] })
  return {
    kind: 'sprite',
    name: 'icones',
    frameWidth: 32,
    frameHeight: 32,
    animations: [
      one('enxada', iconHoe()),
      one('machado', iconAxe()),
      one('regador', iconCan()),
      one('milho', iconCorn()),
      one('tomate', iconTomato()),
    ],
  }
}
