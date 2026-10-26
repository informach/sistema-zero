/**
 * The sixteen Python Monsters, drawn facing LEFT (the opponent side; the player's are mirrored by
 * the game). Each monster is a Pinta sprite with `parado` (breathing), `atacar` (wind-up, lunge,
 * strike, back) and `icone` (a small portrait for the lists).
 *
 * A monster is built from parts back to front: every part is shaded on its own (light from the
 * top-left) and gets a thin dark seam where it overlaps what is behind it, then the whole body
 * gets the ink outline.
 */
import type { SpriteDrawing } from '../../drawing'
import { darken, Px } from '../../pixel'
import { bayer, crop, INK, moved, shrink } from './kit'

export const MONSTER_SIZE = 96

/** dark, mid, light, shine. */
type Ramp = readonly [string, string, string, string]
const R = (dark: string, mid: string, light: string, shine: string): Ramp => [
  dark,
  mid,
  light,
  shine,
]

const LEAF = R('#2d6a35', '#45963f', '#6fbf4f', '#a8e070')
const MOSS = R('#2f5f3c', '#4a8c50', '#72b56a', '#a9dc92')
const FIRE = R('#c2401f', '#ef6f2a', '#f9a23c', '#ffe08a')
const EMBER = R('#6a2418', '#9a3c26', '#c75e36', '#ec9256')
const SHELL = R('#8a4e2a', '#c27a3e', '#e3a45a', '#f6cf8a')
const SEA = R('#1d5a9e', '#3488d2', '#62b8ec', '#b6e6fb')
const FOAM = R('#9ab8d4', '#d5e8f4', '#f2f9fd', '#ffffff')
const PURPLE = R('#45276e', '#6a3fa0', '#9468cc', '#c8a8ee')
const CREAM = R('#c49a64', '#e8c992', '#f8e2b8', '#fff5e0')
const BROWN = R('#5e3a24', '#8a5834', '#b47c4a', '#d9a46e')
const NIGHT = R('#262552', '#3a3a7a', '#5858a6', '#9494d4')
const ICE = R('#7aa2cc', '#b8d4ee', '#e2f0fb', '#ffffff')
const CRYSTAL = R('#3a8cc2', '#62bce8', '#a2e2f8', '#e6fbff')
const PINK = R('#b04c6a', '#dc7692', '#f2a4b8', '#ffd6e0')
const RED = R('#86202c', '#bd3440', '#e4606a', '#f6a0a6')
const GOLD = R('#a0701a', '#d29a2a', '#eec44a', '#fff0a8')
const STONE = R('#2a2232', '#3e3448', '#5a4e66', '#7c7088')

type Pt = readonly [number, number]

class Creature {
  readonly p = new Px(MONSTER_SIZE, MONSTER_SIZE)

  /** A shaded part drawn with `#000001` by `draw`, seamed against what is already there. */
  part(draw: (q: Px, c: string) => void, ramp: Ramp, seam = true) {
    const q = new Px(MONSTER_SIZE, MONSTER_SIZE)
    draw(q, '#000001')
    let x0 = 99
    let y0 = 99
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < q.height; y++)
      for (let x = 0; x < q.width; x++)
        if (q.get(x, y))
          [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)]
    if (x1 < 0) return this
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const w = Math.max(2, x1 - x0)
    const h = Math.max(2, y1 - y0)
    const out = new Px(MONSTER_SIZE, MONSTER_SIZE)
    for (let y = 0; y < q.height; y++)
      for (let x = 0; x < q.width; x++) {
        if (!q.get(x, y)) continue
        const t = ((x - cx) / w) * 0.9 + (y - cy) / h
        let color = ramp[1]
        if (t < -0.38 || (t < -0.3 && bayer(x, y) < 0.5)) color = ramp[2]
        if (t > 0.3 || (t > 0.22 && bayer(x, y) < 0.5)) color = ramp[0]
        const litEdge = !q.get(x, y - 1) || !q.get(x - 1, y)
        const darkEdge = !q.get(x, y + 1) || !q.get(x + 1, y)
        if (litEdge && t < 0.05) color = ramp[3]
        else if (darkEdge && t > -0.25) color = ramp[0]
        out.set(x, y, color)
      }
    if (seam) {
      const line = darken(ramp[0], 0.4)
      for (let y = 0; y < q.height; y++)
        for (let x = 0; x < q.width; x++) {
          if (q.get(x, y) || !this.p.get(x, y)) continue
          if (q.get(x + 1, y) || q.get(x - 1, y) || q.get(x, y + 1) || q.get(x, y - 1))
            this.p.set(x, y, line)
        }
    }
    this.p.draw(out)
    return this
  }

  /** Flat details on top (eyes, marks, stripes). */
  detail(draw: (p: Px) => void) {
    draw(this.p)
    return this
  }

  done() {
    this.p.outline(INK)
    return this.p
  }
}

/** A thick stroke between two points that tapers from r0 to r1 (necks, legs, tails). */
function capsule(q: Px, c: string, a: Pt, b: Pt, r0: number, r1 = r0) {
  const steps = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2))
  for (let k = 0; k <= steps; k++) {
    const t = k / steps
    q.circle(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r0 + (r1 - r0) * t, c)
  }
}

/** A stroke along a list of points (curvy tails and bodies). */
function path(q: Px, c: string, points: Pt[], r0: number, r1 = r0) {
  const total = points
    .slice(1)
    .reduce(
      (sum, point, index) =>
        sum + Math.hypot(point[0] - points[index]![0], point[1] - points[index]![1]),
      0,
    )
  let walked = 0
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!
    const b = points[index]!
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    capsule(
      q,
      c,
      a,
      b,
      r0 + (r1 - r0) * (walked / total),
      r0 + (r1 - r0) * ((walked + length) / total),
    )
    walked += length
  }
}

/** A big friendly eye looking left. */
function eye(p: Px, x: number, y: number, size: number, iris: string, closed = false) {
  if (closed) {
    p.line(x - size / 2, y, x + size / 2 - 1, y, INK)
      .set(x - size / 2, y - 1, INK)
      .set(x + size / 2 - 1, y - 1, INK)
    return
  }
  p.ellipse(x - size / 2, y - size / 2 - 1, size, size + 2, INK)
  p.ellipse(x - size / 2 + 1, y - size / 2, size - 2, size, '#ffffff')
  p.ellipse(x - size / 2 + 0.5, y - size / 2 + 0.5, size * 0.66, size, iris)
  p.ellipse(x - size / 2 + 1, y - size / 2 + 2, size * 0.36, size * 0.55, INK)
  p.set(x - size / 2 + 1, y - size / 2 + 1, '#ffffff').set(
    x - size / 2 + 2,
    y - size / 2 + 1,
    '#ffffff',
  )
}

function mouth(p: Px, x: number, y: number, width: number, open: number, inside = '#7a2a3a') {
  const h = Math.round(open * 3)
  if (h < 1) {
    p.line(x, y, x + width - 1, y, INK)
    return
  }
  p.rect(x, y, width, h + 1, INK).rect(x + 1, y + 1, width - 2, h - 1 || 1, inside)
  p.set(x + 1, y + 1, '#ffffff')
}

/** A leaf pointing from a to b. */
function leaf(q: Px, c: string, a: Pt, b: Pt, width: number) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = Math.hypot(dx, dy)
  const nx = -dy / length
  const ny = dx / length
  const points: [number, number][] = []
  for (let k = 0; k <= 10; k++) {
    const t = k / 10
    const w = Math.sin(t * Math.PI) ** 0.8 * width
    points.push([a[0] + dx * t + nx * w, a[1] + dy * t + ny * w])
  }
  for (let k = 10; k >= 0; k--) {
    const t = k / 10
    const w = Math.sin(t * Math.PI) ** 0.8 * width * 0.75
    points.push([a[0] + dx * t - nx * w, a[1] + dy * t - ny * w])
  }
  q.polygon(points, c)
}

function veins(p: Px, a: Pt, b: Pt, color: string) {
  p.line(a[0], a[1], a[0] + (b[0] - a[0]) * 0.85, a[1] + (b[1] - a[1]) * 0.85, color)
}

function flame(p: Px, x: number, y: number, size: number, lean = 0) {
  const shape = (q: Px, c: string, s: number, dy: number) =>
    q.polygon(
      [
        [x - s * 0.55, y + dy],
        [x - s * 0.4 + lean * 0.5, y - s * 0.8 + dy],
        [x - s * 0.1 + lean, y - s * 1.2 + dy],
        [x + lean * 1.4, y - s * 1.75 + dy],
        [x + s * 0.3 + lean, y - s * 0.9 + dy],
        [x + s * 0.55, y + dy],
        [x, y + s * 0.4 + dy],
      ],
      c,
    )
  const out = new Px(MONSTER_SIZE, MONSTER_SIZE)
  shape(out, FIRE[0], size, 0)
  shape(out, FIRE[1], size * 0.85, -1)
  shape(out, FIRE[2], size * 0.6, -1)
  shape(out, FIRE[3], size * 0.32, -1)
  out.outline('#7a1f14')
  p.draw(out)
}

interface Pose {
  bob: number
  /** 0..1 how open the mouth is (the strike). */
  open: number
  /** 0/1 animation phase for tails, wings and flames. */
  phase: number
}

type Draw = (pose: Pose) => Px

const legs = (
  c: Creature,
  ramp: Ramp,
  feet: [number, number, number][],
  ground: number,
  r: number,
  toe?: string,
) => {
  for (const [x, top, lean] of feet)
    c.part((q, k) => capsule(q, k, [x, top], [x + lean, ground - r], r, r * 0.9), ramp)
  if (toe)
    c.detail((p) =>
      feet.forEach(([x, , lean]) => {
        p.rect(x + lean - r + 1, ground - 2, r * 2 - 1, 1, toe)
      }),
    )
}

// The monsters --------------------------------------------------------------------------------

/** Plumette: a leaf kitten. */
const plumette: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 84
  const y = 64 + bob
  c.part((q, k) => capsule(q, k, [62, y + 2], [70, y - 12], 3, 2), MOSS)
  c.part((q, k) => leaf(q, k, [68, y - 10], [76 + phase, y - 28], 7), LEAF)
  legs(
    c,
    MOSS,
    [
      [56, y + 6, 1],
      [48, y + 8, 0],
    ],
    g,
    4,
  )
  c.part((q, k) => q.ellipse(36, y - 9, 32, 22, k), MOSS)
  c.part((q, k) => q.ellipse(40, y, 18, 9, k), CREAM)
  legs(
    c,
    MOSS,
    [
      [44, y + 8, -1],
      [36, y + 6, -2],
    ],
    g,
    4,
    MOSS[3],
  )
  c.part(
    (q, k) =>
      q.polygon(
        [
          [26, y - 22],
          [27, y - 38],
          [36, y - 26],
        ],
        k,
      ),
    MOSS,
  )
  c.part(
    (q, k) =>
      q.polygon(
        [
          [44, y - 26],
          [52, y - 37],
          [52, y - 22],
        ],
        k,
      ),
    MOSS,
  )
  c.part((q, k) => q.ellipse(22, y - 32, 32, 28, k), MOSS)
  c.part((q, k) => leaf(q, k, [36, y - 30], [30, y - 46], 5), LEAF)
  c.part((q, k) => leaf(q, k, [38, y - 30], [46, y - 44], 4), LEAF)
  return c
    .detail((p) => {
      p.polygon(
        [
          [28, y - 31],
          [29, y - 35],
          [32, y - 30],
        ],
        PINK[2],
      )
      eye(p, 29, y - 19, 7, '#3f9a4a')
      eye(p, 41, y - 19, 7, '#3f9a4a')
      p.rect(25, y - 12, 3, 1, PINK[1]).rect(45, y - 12, 3, 1, PINK[1])
      p.set(35, y - 13, INK)
      mouth(p, 33, y - 11, 5, open)
      veins(p, [68, y - 10], [76 + phase, y - 28], LEAF[0])
    })
    .done()
}

/** Ivieron: a slender vine cat. */
const ivieron: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 86
  const y = 58 + bob
  c.part((q, k) => {
    const pts: Pt[] = []
    for (let t = 0; t <= 1.001; t += 0.05) {
      const a = Math.PI * (0.2 - t * 2.1) - phase * 0.15
      const r = 12 * (1 - t * 0.55)
      pts.push([78 + t * 6 + Math.cos(a) * r * t, y - 6 - t * 22 + Math.sin(a) * r * t])
    }
    path(q, k, [[70, y], [76, y - 4], ...pts], 3, 1.5)
  }, LEAF)
  legs(
    c,
    MOSS,
    [
      [70, y + 4, 2],
      [62, y + 6, 0],
    ],
    g,
    3.5,
  )
  c.part((q, k) => capsule(q, k, [44, y], [68, y], 11, 10), MOSS)
  c.part((q, k) => q.ellipse(42, y + 2, 22, 9, k), CREAM)
  legs(
    c,
    MOSS,
    [
      [46, y + 6, -2],
      [38, y + 4, -3],
    ],
    g,
    3.5,
    MOSS[3],
  )
  c.part((q, k) => capsule(q, k, [40, y - 2], [32, y - 18], 7, 6), MOSS)
  c.part((q, k) => q.ellipse(16, y - 36, 28, 24, k), MOSS)
  c.part((q, k) => q.ellipse(12, y - 26, 14, 10, k), CREAM)
  c.part((q, k) => leaf(q, k, [24, y - 34], [20, y - 54], 5), LEAF)
  c.part((q, k) => leaf(q, k, [34, y - 34], [42, y - 52], 5), LEAF)
  return c
    .detail((p) => {
      eye(p, 23, y - 27, 6, '#e8c84a')
      eye(p, 33, y - 27, 6, '#e8c84a')
      p.rect(13, y - 23, 3, 2, MOSS[0])
      mouth(p, 15, y - 19, 6, open)
      for (const [x, yy] of [
        [48, y - 6],
        [56, y - 8],
        [62, y - 2],
        [52, y + 1],
      ] as const) {
        p.ellipse(x, yy, 6, 3, LEAF[0]).set(x + 1, yy, LEAF[3])
      }
      veins(p, [24, y - 34], [20, y - 54], LEAF[0])
      veins(p, [34, y - 34], [42, y - 52], LEAF[0])
    })
    .done()
}

/** Pluma: a lion with a mane of leaves. */
const pluma: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 88
  const y = 58 + bob
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [78, y - 2],
          [86, y - 10],
          [88, y - 22],
        ],
        3,
        2.5,
      ),
    MOSS,
  )
  c.part((q, k) => leaf(q, k, [88, y - 20], [84 + phase * 2, y - 38], 7), LEAF)
  legs(
    c,
    MOSS,
    [
      [78, y + 6, 1],
      [68, y + 8, 0],
    ],
    g,
    5.5,
  )
  c.part((q, k) => capsule(q, k, [46, y - 2], [74, y], 15, 13), MOSS)
  c.part((q, k) => q.ellipse(44, y + 2, 30, 12, k), CREAM)
  legs(
    c,
    MOSS,
    [
      [50, y + 8, -1],
      [40, y + 6, -2],
    ],
    g,
    5.5,
    MOSS[3],
  )
  c.part((q, k) => {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6)
      leaf(
        q,
        k,
        [34, y - 26],
        [34 + Math.cos(a + phase * 0.1) * 24, y - 26 + Math.sin(a + phase * 0.1) * 22],
        7,
      )
  }, LEAF)
  c.part((q, k) => q.ellipse(19, y - 42, 30, 28, k), CREAM)
  c.part((q, k) => q.ellipse(14, y - 30, 18, 13, k), CREAM)
  return c
    .detail((p) => {
      eye(p, 25, y - 33, 6, '#d8a02c')
      eye(p, 36, y - 33, 6, '#d8a02c')
      p.polygon(
        [
          [16, y - 28],
          [22, y - 28],
          [19, y - 25],
        ],
        '#5a2a2a',
      )
      mouth(p, 15, y - 22, 9, open, '#9a2a3a')
      if (open > 0.4) p.rect(16, y - 21, 1, 2, '#ffffff').rect(22, y - 21, 1, 2, '#ffffff')
      for (const [x, yy] of [
        [54, y - 10],
        [64, y - 4],
        [58, y + 2],
      ] as const)
        p.ellipse(x, yy, 6, 3, LEAF[0])
    })
    .done()
}

/** Sparchu: a small bunny with a shell and a flame tail. */
const sparchu: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 84
  const y = 66 + bob
  c.detail((p) => flame(p, 68, y - 4, 12 + phase, 3))
  legs(c, CREAM, [[58, y + 4, 0]], g, 4)
  c.part((q, k) => q.ellipse(36, y - 18, 30, 30, k), CREAM)
  c.part((q, k) => q.ellipse(44, y - 22, 26, 24, k), SHELL)
  legs(
    c,
    CREAM,
    [
      [44, y + 6, -1],
      [36, y + 4, -2],
    ],
    g,
    4,
    CREAM[3],
  )
  c.part((q, k) => leaf(q, k, [30, y - 32], [32, y - 54], 4), CREAM)
  c.part((q, k) => leaf(q, k, [36, y - 32], [46, y - 52], 4), CREAM)
  c.part((q, k) => q.ellipse(16, y - 38, 26, 22, k), CREAM)
  return c
    .detail((p) => {
      p.line(31, y - 34, 32, y - 50, PINK[1]).line(37, y - 34, 45, y - 49, PINK[1])
      eye(p, 23, y - 29, 6, '#c2401f')
      p.rect(17, y - 25, 3, 2, '#7a3a2a')
      mouth(p, 18, y - 21, 5, open)
      p.rect(28, y - 22, 3, 1, PINK[1])
      for (let x = 46; x < 64; x += 5) p.line(x, y - 18, x - 2, y - 6, SHELL[0])
      p.set(47, y - 19, SHELL[3]).set(52, y - 20, SHELL[3])
    })
    .done()
}

/** Cindrill: an armadillo with a burning tail. */
const cindrill: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 86
  const y = 62 + bob
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [66, y + 2],
          [78, y - 2],
          [84, y - 10],
        ],
        4,
        3,
      ),
    SHELL,
  )
  c.detail((p) => flame(p, 85, y - 10, 14 + phase, 3))
  legs(
    c,
    CREAM,
    [
      [64, y + 8, 1],
      [56, y + 10, 0],
    ],
    g,
    5,
  )
  c.part((q, k) => q.ellipse(28, y - 32, 50, 44, k), SHELL)
  legs(
    c,
    CREAM,
    [
      [44, y + 10, -1],
      [34, y + 8, -2],
    ],
    g,
    5,
    CREAM[3],
  )
  c.part((q, k) => capsule(q, k, [30, y - 6], [14, y - 2], 11, 7), CREAM)
  c.part(
    (q, k) =>
      q.polygon(
        [
          [22, y - 18],
          [24, y - 32],
          [30, y - 16],
        ],
        k,
      ),
    SHELL,
  )
  return c
    .detail((p) => {
      for (let k = 0; k < 5; k++)
        p.line(38 + k * 8, y - 34 + Math.abs(k - 2) * 2, 34 + k * 9, y + 6, SHELL[0])
      for (let k = 0; k < 5; k++) p.set(39 + k * 8, y - 31 + Math.abs(k - 2) * 2, SHELL[3])
      eye(p, 22, y - 10, 6, '#c2401f')
      p.rect(8, y - 5, 3, 2, '#5a2a1a')
      mouth(p, 10, y + 1, 6, open)
    })
    .done()
}

/** Charmadillo: a big armoured fire beast standing up. */
const charmadillo: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 90
  const y = 56 + bob
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [62, y + 16],
          [76, y + 22],
          [86, y + 18],
          [90, y + 8],
        ],
        7,
        3,
      ),
    EMBER,
  )
  c.detail((p) => flame(p, 90, y + 8, 14 + phase, 2))
  c.part((q, k) => capsule(q, k, [62, y + 14], [64, g - 6], 8, 7), EMBER)
  c.part((q, k) => q.ellipse(30, y - 30, 48, 58, k), EMBER)
  c.part((q, k) => q.ellipse(28, y - 16, 22, 36, k), SHELL)
  c.part((q, k) => capsule(q, k, [44, y + 16], [42, g - 6], 9, 8), EMBER)
  c.part((q, k) => capsule(q, k, [34, y - 12], [22, y + 2], 6, 5), EMBER)
  c.part((q, k) => {
    for (let s = 0; s < 5; s++)
      q.polygon(
        [
          [56 + s * 3, y - 36 + s * 10],
          [70 + s * 3, y - 38 + s * 9],
          [60 + s * 3, y - 26 + s * 10],
        ],
        k,
      )
  }, STONE)
  c.part((q, k) => q.ellipse(14, y - 46, 30, 24, k), EMBER)
  c.part((q, k) => q.ellipse(8, y - 38, 18, 13, k), SHELL)
  c.part(
    (q, k) =>
      q.polygon(
        [
          [30, y - 44],
          [42, y - 56],
          [36, y - 40],
        ],
        k,
      ),
    STONE,
  )
  return c
    .detail((p) => {
      eye(p, 20, y - 39, 6, '#f9a23c')
      p.rect(9, y - 37, 3, 2, '#3a1a1a')
      mouth(p, 10, y - 30, 11, open, '#e8582a')
      for (const [a, b] of [
        [
          [44, y - 42],
          [50, y - 28],
        ],
        [
          [50, y - 28],
          [46, y - 16],
        ],
        [
          [52, y - 12],
          [58, y],
        ],
        [
          [40, y - 2],
          [48, y + 8],
        ],
      ] as [Pt, Pt][])
        p.line(a[0], a[1], b[0], b[1], FIRE[2])
      for (let yy = y - 30; yy < y + 8; yy += 6) p.line(20, yy, 36, yy, SHELL[0])
      p.rect(36, g - 2, 13, 1, '#3a1a1a').rect(57, g - 2, 13, 1, '#3a1a1a')
    })
    .done()
}

function dolphin(c: Creature, x: number, y: number, s: number, tail: number) {
  c.part(
    (q, k) =>
      q.polygon(
        [
          [x + 30 * s, y - 14 * s],
          [x + 22 * s, y - 30 * s],
          [x + 40 * s, y - 14 * s],
        ],
        k,
      ),
    SEA,
  )
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [x, y - 8 * s],
          [x + 22 * s, y - 10 * s],
          [x + 44 * s, y - 6 * s],
          [x + 56 * s, y - 2 * s + tail],
        ],
        11 * s,
        4 * s,
      ),
    SEA,
  )
  c.part((q, k) => {
    q.polygon(
      [
        [x + 54 * s, y + tail],
        [x + 64 * s, y - 12 * s + tail],
        [x + 62 * s, y + tail],
        [x + 68 * s, y + 8 * s + tail],
      ],
      k,
    )
  }, SEA)
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [x + 2 * s, y - 2 * s],
          [x + 24 * s, y - 1 * s],
          [x + 40 * s, y - 3 * s],
        ],
        6 * s,
        3 * s,
      ),
    FOAM,
  )
  c.part(
    (q, k) => capsule(q, k, [x - 6 * s, y - 6 * s], [x - 16 * s, y - 4 * s], 5 * s, 4 * s),
    SEA,
  )
  c.part(
    (q, k) =>
      q.polygon(
        [
          [x + 16 * s, y - 2 * s],
          [x + 26 * s, y + 10 * s],
          [x + 28 * s, y - 2 * s],
        ],
        k,
      ),
    SEA,
  )
}

/** Finsta: a dolphin pup. */
const finsta: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const y = 70 + bob
  dolphin(c, 30, y, 0.8, phase * 2)
  return c
    .detail((p) => {
      eye(p, 28, y - 11, 6, '#1f3f7a')
      mouth(p, 17, y - 4, 6, open)
      p.rect(31, y - 6, 3, 1, PINK[1])
      p.rect(38, y - 20, 6, 1, PINK[2]).rect(46, y - 19, 4, 1, PINK[2])
    })
    .done()
}

/** Gulfin: a leaping dolphin with a pink crest. */
const gulfin: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const y = 66 + bob
  c.part((q, k) => leaf(q, k, [34, y - 16], [52, y - 34], 6), PINK)
  dolphin(c, 24, y, 1.05, phase * 3)
  return c
    .detail((p) => {
      eye(p, 22, y - 14, 7, '#1f3f7a')
      mouth(p, 7, y - 6, 8, open)
      p.rect(28, y - 7, 4, 1, PINK[1])
      for (let x = 40; x < 66; x += 6) p.rect(x, y - 19, 3, 1, SEA[3])
    })
    .done()
}

/** Finiette: a long sea dragon of a dolphin. */
const finiette: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const y = 62 + bob
  c.part((q, k) => leaf(q, k, [62, y - 6], [84, y - 30 + phase * 2], 8), PINK)
  c.part((q, k) => {
    const pts: Pt[] = []
    for (let t = 0; t <= 1.001; t += 0.05) {
      const a = Math.PI * 1.05 + t * Math.PI * 1.25
      pts.push([54 + Math.cos(a) * 26, y + 4 + Math.sin(a) * 22])
    }
    path(q, k, [[22, y - 40], [30, y - 20], ...pts, [84, y + 20]], 9, 4)
  }, SEA)
  c.part(
    (q, k) =>
      q.polygon(
        [
          [82, y + 18],
          [94, y + 4 + phase * 2],
          [90, y + 20],
          [94, y + 30 - phase * 2],
        ],
        k,
      ),
    SEA,
  )
  c.part((q, k) => {
    const pts: Pt[] = []
    for (let t = 0.05; t <= 0.9; t += 0.05) {
      const a = Math.PI * 1.05 + t * Math.PI * 1.25
      pts.push([54 + Math.cos(a) * 20, y + 4 + Math.sin(a) * 16])
    }
    path(q, k, pts, 4, 2)
  }, FOAM)
  c.part((q, k) => q.ellipse(10, y - 56, 30, 22, k), SEA)
  c.part((q, k) => capsule(q, k, [10, y - 42], [2, y - 40], 5, 4), FOAM)
  c.part((q, k) => leaf(q, k, [28, y - 58], [44, y - 70], 6), PINK)
  return c
    .detail((p) => {
      eye(p, 19, y - 48, 7, '#1f3f7a')
      mouth(p, 2, y - 40, 10, open)
      p.rect(24, y - 42, 4, 1, PINK[1])
      p.line(30, y - 58, 42, y - 68, PINK[0])
    })
    .done()
}

/** Atrox: a coiled purple serpent with golden horns. */
const atrox: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const y = 76 + bob
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [70, y - 4],
          [82, y - 8],
          [86, y - 18 + phase * 2],
        ],
        5,
        2,
      ),
    PURPLE,
  )
  c.part((q, k) => q.ellipse(26, y - 18, 56, 22, k), PURPLE)
  c.part((q, k) => q.ellipse(32, y - 32, 44, 18, k), PURPLE)
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [50, y - 30],
          [42, y - 44],
          [34, y - 52],
          [28, y - 58],
        ],
        8,
        6,
      ),
    PURPLE,
  )
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [40, y - 44],
          [34, y - 52],
        ],
        4,
        3,
      ),
    CREAM,
  )
  c.part((q, k) => q.ellipse(10, y - 74, 30, 20, k), PURPLE)
  c.part((q, k) => q.ellipse(4, y - 66, 16, 9, k), CREAM)
  c.part((q, k) => leaf(q, k, [32, y - 72], [44, y - 84], 3), GOLD)
  c.part((q, k) => leaf(q, k, [28, y - 74], [30, y - 90], 3), GOLD)
  return c
    .detail((p) => {
      eye(p, 18, y - 67, 6, '#eec44a')
      mouth(p, 4, y - 61, 10, open, '#c23440')
      if (open > 0.4) p.rect(5, y - 60, 1, 2, '#ffffff').rect(11, y - 60, 1, 2, '#ffffff')
      for (let x = 10; x < 74; x += 5) p.tint(x, y - 10, CREAM[1]).tint(x + 1, y - 10, CREAM[1])
      for (let x = 20; x < 66; x += 5) p.tint(x, y - 26, CREAM[1]).tint(x + 1, y - 26, CREAM[1])
      for (let k = 0; k < 6; k++)
        p.tint(24 + k * 7, y - 34, PURPLE[3]).tint(12 + k * 9, y - 20, PURPLE[3])
    })
    .done()
}

/** Pouch: a calm capybara with a leaf on its head. */
const pouch: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 84
  const y = 62 + bob
  legs(c, BROWN, [[62, y + 2, 1]], g, 5)
  c.part((q, k) => q.ellipse(28, y - 30, 48, 46, k), BROWN)
  c.part((q, k) => q.ellipse(34, y - 16, 26, 24, k), CREAM)
  legs(
    c,
    BROWN,
    [
      [48, y + 6, 0],
      [36, y + 6, -1],
    ],
    g,
    5,
    BROWN[3],
  )
  c.part((q, k) => q.ellipse(38, y - 44, 9, 9, k), BROWN)
  c.part((q, k) => capsule(q, k, [20, y - 30], [36, y - 33], 12, 13), BROWN)
  c.part((q, k) => q.ellipse(6, y - 42, 24, 22, k), BROWN)
  c.part((q, k) => leaf(q, k, [28, y - 45], [34 + phase, y - 59], 5), LEAF)
  return c
    .detail((p) => {
      eye(p, 26, y - 34, 5, '#3a2418', phase === 1 && open === 0)
      p.rect(8, y - 36, 4, 3, '#3a2418').set(8, y - 36, BROWN[3])
      mouth(p, 9, y - 26, 6, open)
      p.line(28, y - 45, 33 + phase, y - 57, LEAF[0])
      p.ellipse(34, y - 14, 18, 10, BROWN[1]).line(34, y - 14, 51, y - 14, BROWN[0])
      p.rect(15, y - 29, 3, 1, PINK[1])
    })
    .done()
}

/** Draem: a sleepy tapir with stars on its back. */
const draem: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 84
  const y = 60 + bob
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [76, y - 18],
          [82, y - 22],
          [84, y - 28 - phase],
        ],
        2.5,
        1.5,
      ),
    NIGHT,
  )
  legs(
    c,
    NIGHT,
    [
      [70, y - 4, 1],
      [62, y - 2, 0],
    ],
    g,
    4,
  )
  c.part((q, k) => capsule(q, k, [40, y - 18], [70, y - 18], 15, 14), NIGHT)
  c.part((q, k) => capsule(q, k, [50, y - 22], [72, y - 22], 10, 9), ICE)
  legs(
    c,
    NIGHT,
    [
      [44, y - 2, -1],
      [36, y - 4, -2],
    ],
    g,
    4,
    NIGHT[3],
  )
  c.part((q, k) => q.ellipse(14, y - 44, 28, 24, k), NIGHT)
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [16, y - 30],
          [8, y - 26],
          [4, y - 18],
        ],
        5,
        3.5,
      ),
    NIGHT,
  )
  c.part((q, k) => q.ellipse(32, y - 50, 8, 10, k), NIGHT)
  return c
    .detail((p) => {
      eye(p, 23, y - 37, 6, '#c8a8ee', phase === 0 && open === 0)
      p.rect(20, y - 31, 3, 1, PINK[1])
      mouth(p, 12, y - 24, 5, open)
      for (const [x, yy] of [
        [56, y - 26],
        [66, y - 20],
        [48, y - 14],
      ] as const)
        p.set(x, yy, '#fff0a8')
          .set(x - 1, yy, GOLD[2])
          .set(x + 1, yy, GOLD[2])
          .set(x, yy - 1, GOLD[2])
          .set(x, yy + 1, GOLD[2])
    })
    .done()
}

/** Larvea: a round green larva with a sprout. */
const larvea: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const y = 76 + bob
  c.part((q, k) => q.ellipse(52, y - 18, 22, 18, k), LEAF)
  c.part((q, k) => q.ellipse(40, y - 24, 24, 24, k), LEAF)
  c.part((q, k) => q.ellipse(36, y - 10, 24, 10, k), CREAM)
  c.part((q, k) => q.ellipse(18, y - 42, 32, 32, k), LEAF)
  c.part((q, k) => capsule(q, k, [33, y - 40], [34, y - 49], 1.5), LEAF)
  c.part((q, k) => leaf(q, k, [34, y - 49], [26, y - 59 + phase], 5), LEAF)
  c.part((q, k) => leaf(q, k, [35, y - 49], [46, y - 57 - phase], 4), LEAF)
  return c
    .detail((p) => {
      eye(p, 24, y - 30, 7, '#3a2a18')
      eye(p, 35, y - 30, 6, '#3a2a18')
      mouth(p, 26, y - 21, 5, open)
      p.rect(20, y - 23, 3, 1, PINK[1]).rect(39, y - 23, 3, 1, PINK[1])
      for (const x of [44, 56]) p.rect(x, y - 2, 4, 2, LEAF[0])
    })
    .done()
}

/** Cleaf: a beetle with leaf wings. */
const cleaf: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const y = 62 + bob
  const beat = phase ? 6 : 0
  c.part((q, k) => leaf(q, k, [46, y - 20], [84, y - 44 + beat], 12), LEAF)
  for (const x of [30, 40, 50])
    c.part(
      (q, k) =>
        path(
          q,
          k,
          [
            [x, y - 10],
            [x - 4, y],
            [x - 2, y + 6],
          ],
          2,
        ),
      MOSS,
    )
  c.part((q, k) => q.ellipse(28, y - 30, 40, 26, k), RED)
  c.part((q, k) => q.ellipse(48, y - 24, 26, 18, k), MOSS)
  c.part((q, k) => q.ellipse(12, y - 32, 24, 22, k), MOSS)
  c.part((q, k) => leaf(q, k, [42, y - 24], [74, y - 62 + beat], 12), LEAF)
  return c
    .detail((p) => {
      eye(p, 18, y - 23, 7, '#eec44a')
      p.line(18, y - 33, 10, y - 46, MOSS[0]).line(23, y - 33, 24, y - 48, MOSS[0])
      p.circle(10, y - 46, 1.5, GOLD[2]).circle(24, y - 48, 1.5, GOLD[2])
      mouth(p, 10, y - 15, 5, open)
      for (const [x, yy] of [
        [30, y - 34],
        [38, y - 28],
        [26, y - 24],
      ] as const)
        p.ellipse(x, yy, 4, 3, RED[3])
      veins(p, [42, y - 24], [74, y - 62 + beat], LEAF[0])
    })
    .done()
}

/** Jacana: a little fire bird. */
const jacana: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 84
  const y = 66 + bob
  c.part((q, k) => {
    leaf(q, k, [54, y - 16], [78, y - 28 - phase * 3], 5)
    leaf(q, k, [54, y - 14], [80, y - 16 - phase * 2], 4)
  }, RED)
  for (const x of [32, 40])
    c.detail((p) => p.rect(x, y - 2, 2, g - y - 1, GOLD[1]).rect(x - 3, g - 2, 7, 1, GOLD[1]))
  c.part((q, k) => q.ellipse(24, y - 34, 36, 32, k), RED)
  c.part((q, k) => q.ellipse(26, y - 22, 20, 16, k), PINK)
  c.part((q, k) => leaf(q, k, [34, y - 28], [62, y - 40 + phase * 4], 9), GOLD)
  c.part((q, k) => q.ellipse(10, y - 52, 26, 24, k), NIGHT)
  c.part((q, k) => leaf(q, k, [22, y - 50], [34, y - 58], 3), RED)
  c.part((q, k) => leaf(q, k, [20, y - 51], [26, y - 62], 3), FIRE)
  return c
    .detail((p) => {
      p.polygon(
        [
          [12, y - 44],
          [2 - open * 2, y - 41],
          [12, y - 38],
        ],
        GOLD[2],
      )
      if (open > 0.3)
        p.polygon(
          [
            [12, y - 38],
            [4, y - 36],
            [12, y - 35],
          ],
          GOLD[0],
        )
      eye(p, 19, y - 46, 6, '#f6a0a6')
      p.line(36, y - 26, 58, y - 37 + phase * 4, GOLD[0])
    })
    .done()
}

/** Friolera: an ice deer with crystal antlers. */
const friolera: Draw = ({ bob, open, phase }) => {
  const c = new Creature()
  const g = 88
  const y = 68 + bob
  c.part((q, k) => q.ellipse(68, y - 24, 14, 14, k), FOAM)
  legs(
    c,
    ICE,
    [
      [70, y - 12, 2],
      [62, y - 10, 0],
    ],
    g,
    3,
  )
  c.part((q, k) => capsule(q, k, [42, y - 18], [68, y - 18], 11, 10), ICE)
  legs(
    c,
    ICE,
    [
      [46, y - 10, -1],
      [38, y - 12, -2],
    ],
    g,
    3,
    CRYSTAL[0],
  )
  c.part(
    (q, k) =>
      path(
        q,
        k,
        [
          [40, y - 22],
          [32, y - 32],
          [26, y - 38],
        ],
        7,
        5,
      ),
    ICE,
  )
  c.part((q, k) => q.ellipse(10, y - 50, 24, 18, k), ICE)
  c.part((q, k) => capsule(q, k, [10, y - 38], [4, y - 36], 5, 4), ICE)
  c.part((q, k) => leaf(q, k, [28, y - 46], [38, y - 50], 3), ICE)
  c.part((q, k) => {
    path(
      q,
      k,
      [
        [20, y - 50],
        [26, y - 60],
        [22, y - 66],
      ],
      2,
    )
    path(
      q,
      k,
      [
        [24, y - 57],
        [32, y - 64],
      ],
      1.5,
    )
    path(
      q,
      k,
      [
        [15, y - 50],
        [12, y - 60],
        [6, y - 66],
      ],
      2,
    )
    path(
      q,
      k,
      [
        [13, y - 57],
        [6, y - 58],
      ],
      1.5,
    )
  }, CRYSTAL)
  return c
    .detail((p) => {
      eye(p, 17, y - 44, 6, '#3a8cc2')
      p.rect(2, y - 38, 2, 2, '#3a3a5a')
      mouth(p, 4, y - 33, 5, open)
      for (const [x, yy] of [
        [48, y - 24],
        [58, y - 16],
        [52, y - 12],
      ] as const)
        p.set(x, yy, CRYSTAL[1]).set(x + 1, yy + 1, CRYSTAL[2])
      for (let k = 0; k < 3; k++) p.set(64 + k * 3, y - 30 + ((k + phase) % 3), '#ffffff')
    })
    .done()
}

/** Name in the game data → drawing function. */
export const MONSTERS: Record<string, Draw> = {
  Plumette: plumette,
  Ivieron: ivieron,
  Pluma: pluma,
  Sparchu: sparchu,
  Cindrill: cindrill,
  Charmadillo: charmadillo,
  Finsta: finsta,
  Gulfin: gulfin,
  Finiette: finiette,
  Atrox: atrox,
  Pouch: pouch,
  Draem: draem,
  Larvea: larvea,
  Cleaf: cleaf,
  Jacana: jacana,
  Friolera: friolera,
}

/** The portrait for the lists: the standing frame, smaller, re-outlined (top-left of its frame). */
function icon(frame: Px): Px {
  let x0 = 99
  let y0 = 99
  let x1 = 0
  let y1 = 0
  for (let y = 0; y < frame.height; y++)
    for (let x = 0; x < frame.width; x++)
      if (frame.get(x, y))
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)]
  const body = crop(frame, x0, y0, x1 - x0 + 1, y1 - y0 + 1)
  const small = shrink(body, Math.max(body.width, body.height) > 60 ? 3 : 2)
  for (let y = 0; y < small.height; y++)
    for (let x = 0; x < small.width; x++) if (small.get(x, y) === INK) small.set(x, y, null)
  const out = new Px(MONSTER_SIZE, MONSTER_SIZE)
  out.draw(small, 1, 1)
  out.outline(INK)
  return out
}

/** Small nudges so every monster has room for its lunge inside the frame. */
const NUDGE: Record<string, [number, number]> = {
  Cindrill: [-4, 0],
  Charmadillo: [-3, 0],
  Finiette: [2, 8],
  Gulfin: [2, 0],
  Pluma: [1, 0],
}

export function monsterDrawings(): SpriteDrawing[] {
  return Object.entries(MONSTERS).map(([name, raw]) => {
    const [nx, ny] = NUDGE[name] ?? [0, 0]
    const draw: Draw = (pose) => moved(raw(pose), nx, ny)
    const idle = [0, -1, -2, -1].map((bob, index) => draw({ bob, open: 0, phase: index % 2 }))
    const attack = [
      moved(draw({ bob: 0, open: 0.3, phase: 1 }), 4, 1),
      moved(draw({ bob: -2, open: 0.7, phase: 0 }), -4, -1),
      moved(draw({ bob: -1, open: 1, phase: 1 }), -7, 0),
      moved(draw({ bob: 0, open: 0.3, phase: 0 }), -2, 0),
    ]
    return {
      kind: 'sprite',
      name: name.toLowerCase(),
      frameWidth: MONSTER_SIZE,
      frameHeight: MONSTER_SIZE,
      animations: [
        { name: 'parado', fps: 6, loop: true, frames: idle },
        { name: 'atacar', fps: 6, loop: false, frames: attack },
        { name: 'icone', fps: 1, loop: false, frames: [icon(idle[0]!)] },
      ],
    }
  })
}
