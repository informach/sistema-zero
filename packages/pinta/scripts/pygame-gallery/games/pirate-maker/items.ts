/** Coins, the diamond, the sparkle, spikes, palm trees, clouds and the editor cursors. */
import { Px } from '../../pixel'
import { P, shade } from './palette'

const GOLD = { base: P.gold, light: P.goldLight, dark: P.goldDark }
const SILVER = { base: P.steel, light: P.white, dark: P.steelDark }

/** A spinning coin: `turn` 0 = facing us, 1 = three quarters, 2 = on its edge. */
export function coin(turn: number, metal: 'gold' | 'silver', size = 16, radius = 6): Px {
  const colors = metal === 'gold' ? GOLD : SILVER
  const s = new Px(size, size)
  const c = size / 2
  const rx = [radius, radius * 0.62, radius * 0.22][turn]!
  const ry = radius
  if (turn === 2) {
    s.rect(c - 1, c - ry, 2, ry * 2, colors.dark)
    s.rect(c - 1, c - ry + 1, 1, ry * 2 - 2, colors.base)
  } else {
    s.ellipse(c - rx, c - ry, rx * 2, ry * 2, colors.dark)
    s.ellipse(c - rx + 1, c - ry + 1, rx * 2 - 2, ry * 2 - 2, colors.base)
    shade(s, colors.base, colors.light, null, c, c, rx, ry, -0.35)
    // the emblem: a little anchor (or a dot when the coin turns)
    if (turn === 0) {
      const k = radius / 6
      s.rect(c - 0.5 * k, c - 3 * k, 1 * k + 0.5, 5 * k, colors.dark)
      s.rect(c - 2 * k, c - 2 * k, 4 * k, 1, colors.dark)
      s.rect(c - 2.5 * k, c + 1 * k, 1, 1 * k + 0.5, colors.dark).rect(
        c + 1.5 * k,
        c + 1 * k,
        1,
        1 * k + 0.5,
        colors.dark,
      )
      s.rect(c - 2 * k, c + 2 * k, 4 * k + 0.5, 1, colors.dark)
    } else s.rect(c - 0.5, c - 2, 1, 4, colors.dark)
  }
  s.outline(P.ink)
  return s
}

export const COIN_TURNS = [0, 1, 2, 1]

/** The diamond turns (its light moves across the facets) and twinkles. */
export function diamond(frame: number, size = 24): Px {
  const s = new Px(size, size)
  const o = (size - 24) / 2
  const crown: [number, number][] = [
    [5 + o, 9 + o],
    [8 + o, 4 + o],
    [16 + o, 4 + o],
    [19 + o, 9 + o],
  ]
  const pavilion: [number, number][] = [
    [5 + o, 9 + o],
    [19 + o, 9 + o],
    [12 + o, 21 + o],
  ]
  s.polygon(crown, P.gem1).polygon(pavilion, P.gem0)
  // facets: one bright stripe walks across the stone
  const lit = [7, 10, 13, 16][frame % 4]! + o
  for (let y = 4 + o; y < 22 + o; y++)
    for (let x = 0; x < size; x++) {
      const color = s.get(x, y)
      if (!color) continue
      if (Math.abs(x - lit) < 1.5) s.set(x, y, y < 9 + o ? P.white : P.gem2)
      else if (y < 9 + o && x > 15 + o) s.set(x, y, P.gem0)
      else if (y >= 9 + o && x < 10 + o && x > lit) s.set(x, y, P.gem1)
    }
  s.rect(5 + o, 9 + o, 15, 1, P.gem2)
  s.outline(P.ink)
  // twinkle
  const [sx, sy] = [
    [18, 3],
    [4, 6],
    [17, 14],
    [6, 2],
  ][frame % 4]!
  s.set(sx + o, sy + o, P.white)
    .set(sx + o - 1, sy + o, P.gem2)
    .set(sx + o + 1, sy + o, P.gem2)
  s.set(sx + o, sy + o - 1, P.gem2).set(sx + o, sy + o + 1, P.gem2)
  return s
}

/** The sparkle left by a coin: a star that opens into a ring and fades. */
export function sparkle(frame: number): Px {
  const s = new Px(16, 16)
  if (frame === 0) {
    s.rect(7, 3, 2, 10, P.goldLight).rect(3, 7, 10, 2, P.goldLight)
    s.rect(6, 6, 4, 4, P.white)
    s.set(5, 5, P.gold).set(10, 5, P.gold).set(5, 10, P.gold).set(10, 10, P.gold)
  } else if (frame === 1) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      s.set(7.5 + Math.cos(a) * 5.5, 7.5 + Math.sin(a) * 5.5, i % 3 === 0 ? P.white : P.goldLight)
    }
    s.rect(7, 7, 2, 2, P.goldLight)
  } else {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4
      s.set(7.5 + Math.cos(a) * 7, 7.5 + Math.sin(a) * 7, i % 2 ? P.gold : P.goldLight)
    }
  }
  return s
}

/** Iron spikes on a wooden plank (the bottom of the tile). */
export function spikes(): Px {
  const s = new Px(32, 32)
  const tall = [13, 16, 14, 15]
  ;[5, 12, 19, 26].forEach((x, index) => {
    const top = 27 - tall[index]!
    s.polygon(
      [
        [x - 3, 27],
        [x + 0.5, top],
        [x + 4, 27],
      ],
      P.steelDark,
    )
    s.polygon(
      [
        [x - 2, 27],
        [x + 0.5, top + 1],
        [x + 0.5, 27],
      ],
      P.steel,
    )
    s.set(x, top + 1, P.white)
    s.rect(x - 2, 25, 6, 2, P.steelDeep)
  })
  s.rect(2, 27, 28, 4, P.trunk1)
  s.rect(2, 30, 28, 1, P.trunk0)
  s.rect(2, 27, 28, 1, P.trunk2)
  for (const x of [5, 15, 25]) s.set(x, 28, P.steelDeep)
  s.outline(P.ink)
  return s
}

export interface PalmColors {
  leaf: [string, string, string, string]
  trunk: [string, string, string]
  ink: string
}

export const NEAR_PALM: PalmColors = {
  leaf: [P.grass0, P.grass1, P.grass2, P.grass3],
  trunk: [P.trunk0, P.trunk1, P.trunk2],
  ink: P.ink,
}
export const FAR_PALM: PalmColors = {
  leaf: [P.far0, P.far0, P.far1, P.far2],
  trunk: [P.farTrunk0, P.farTrunk0, P.farTrunk1],
  ink: P.farInk,
}

/** One leaf: a blade that arches from the crown (through `lift` px above) and droops to `tip`. */
function leaf(
  s: Px,
  from: [number, number],
  tip: [number, number],
  lift: number,
  width: number,
  colors: PalmColors,
) {
  const steps = 18
  const control: [number, number] = [(from[0] + tip[0]) / 2, Math.min(from[1], tip[1]) - lift]
  const at = (t: number): [number, number] => [
    (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * control[0] + t * t * tip[0],
    (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * control[1] + t * t * tip[1],
  ]
  const upper: [number, number][] = []
  const lower: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const [x, y] = at(t)
    const [x2, y2] = at(Math.min(1, t + 0.01))
    const length = Math.hypot(x2 - x, y2 - y) || 1
    const nx = -(y2 - y) / length
    const ny = (x2 - x) / length
    const w = width * Math.sin(Math.min(1, 0.15 + t) * Math.PI * 0.92)
    upper.push([x - nx * w, y - ny * w])
    lower.push([x + nx * w * 0.7, y + ny * w * 0.7])
  }
  s.polygon([...upper, ...lower.reverse()], colors.leaf[1])
  // the midrib, a darker underside and serrated edges
  for (let i = 2; i < steps; i++) {
    const [x, y] = at(i / steps)
    s.tint(x, y + 1, colors.leaf[0])
    if (i % 3 === 0) s.tint(x, y - 1, colors.leaf[2])
  }
  for (let i = 3; i < steps; i += 3) {
    const [x, y] = lower[steps - i]!
    s.set(x, y + 1, colors.leaf[0])
  }
}

/** A palm crown centred at (cx, cy), about 38×22 px; `sway` moves the leaf tips. */
function crown(s: Px, cx: number, cy: number, sway: number, colors: PalmColors) {
  const c: [number, number] = [cx, cy]
  leaf(s, c, [cx - 12 + sway, cy - 7], 2, 2.6, colors)
  leaf(s, c, [cx + 12 + sway, cy - 7], 2, 2.6, colors)
  leaf(s, c, [cx - 17 + sway, cy + 4], 6, 3.2, colors)
  leaf(s, c, [cx + 17 + sway, cy + 4], 6, 3.2, colors)
  leaf(s, c, [cx - 15 + sway, cy + 11], 3, 3, colors)
  leaf(s, c, [cx + 15 + sway, cy + 11], 3, 3, colors)
  leaf(s, c, [cx - 2 + sway, cy - 10], 1, 2.6, colors)
  leaf(s, c, [cx - 6 + sway, cy + 10], 2, 2.6, colors)
  leaf(s, c, [cx + 7 + sway, cy + 9], 2, 2.6, colors)
  // light on the top of the leaves
  for (let y = s.height - 1; y >= 0; y--)
    for (let x = 0; x < s.width; x++) {
      const color = s.get(x, y)
      if (color !== colors.leaf[1] && color !== colors.leaf[2]) continue
      if (!s.get(x, y - 1)) s.set(x, y, colors.leaf[3])
    }
  // coconuts
  for (const [x, y] of [
    [cx - 3, cy + 2],
    [cx + 1, cy + 3],
    [cx - 1, cy + 4],
  ] as const) {
    s.circle(x + 0.5, y + 0.5, 1.8, colors.trunk[0])
    s.set(x, y, colors.trunk[1])
  }
}

/** The trunk: a chain of rings along `path` (bottom first). */
function trunk(s: Px, path: [number, number][], colors: PalmColors) {
  const points: [number, number][] = []
  for (let i = 0; i + 1 < path.length; i++) {
    const [ax, ay] = path[i]!
    const [bx, by] = path[i + 1]!
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 4))
    for (let k = 0; k < n; k++) points.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n])
  }
  points.push(path[path.length - 1]!)
  for (const [index, [x, y]] of points.entries()) {
    s.ellipse(x - 2.5, y - 2.5, 5, 5, colors.trunk[index % 2 ? 1 : 2])
    s.set(x + 1, y + 1, colors.trunk[0]).set(x + 2, y, colors.trunk[0])
  }
}

export type PalmKind = 'pequena' | 'grande' | 'esquerda' | 'direita'

/** Where the middle of the crown is (the crown is about 38 px wide around it). */
export function crownX(kind: PalmKind, far = false) {
  if (far) return kind === 'esquerda' ? 19 : 32
  return kind === 'direita' ? 44 : 19
}

/** A palm tree, crown at the top: fg sizes 38×52, 38×68, 64×53 (left and right). */
export function palm(kind: PalmKind, frame: number, colors: PalmColors, far = false): Px {
  const sway = [0, 1, 0, -1][frame % 4]!
  const width = far ? 64 : 64
  const height = far ? 80 : 68
  const s = new Px(width, height)
  const cx = crownX(kind, far)
  const cy = 12
  if (kind === 'pequena')
    trunk(
      s,
      [
        [cx, far ? 63 : 50],
        [cx + 1, cy + 6],
      ],
      colors,
    )
  else if (kind === 'grande')
    trunk(
      s,
      [
        [cx, far ? 79 : 66],
        [cx - 1, 40],
        [cx + 1, cy + 6],
      ],
      colors,
    )
  else {
    const toward = kind === 'esquerda' ? 1 : -1
    const end = far ? (kind === 'esquerda' ? 51 : 13) : kind === 'esquerda' ? 62 : 2
    const bottom = far ? 50 : 50
    trunk(
      s,
      [
        [end, bottom],
        [cx + toward * 8, bottom],
        [cx + toward * 1, bottom - 6],
        [cx, bottom - 18],
        [cx, cy + 6],
      ],
      colors,
    )
  }
  crown(s, cx, cy, sway, colors)
  s.outline(colors.ink)
  return s
}

/** Clouds: puffs on a flat bottom (no outline, they are far away), lit from the top-left. */
export function cloud(shape: number): Px {
  const s = new Px(128, 40)
  const [w, h] = (
    [
      [74, 24],
      [124, 35],
      [128, 39],
    ] as const
  )[shape]!
  const top = 40 - h
  const puffs: [number, number, number][] =
    shape === 0
      ? [
          [13, 31, 9],
          [29, 25, 13],
          [47, 27, 11],
          [62, 31, 9],
        ]
      : shape === 1
        ? [
            [15, 31, 11],
            [35, 23, 15],
            [58, 19, 18],
            [82, 23, 15],
            [101, 29, 12],
            [113, 32, 9],
          ]
        : [
            [13, 32, 11],
            [32, 23, 15],
            [55, 16, 19],
            [79, 19, 18],
            [99, 26, 14],
            [116, 31, 10],
          ]
  const placed = puffs.map(([x, y, r]) => [x, Math.max(y, top + r), r] as const)
  // the shaded body first, then a lit cap on every puff, up and to the left
  for (const [x, y, r] of placed) s.circle(x, y, r, P.cloudShade)
  s.rect(3, 34, w - 6, 6, P.cloudShade)
  for (const [x, y, r] of placed) s.circle(x - 1.5, y - 2, r - 2.5, P.cloud)
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 128; x++) {
      if (x >= w || y < top) s.set(x, y, null)
      else if (s.get(x, y) && y >= 38) s.set(x, y, y === 39 ? P.cloudEdge : P.cloudShade)
    }
  return s
}

/** A heart of the play mode: full (red) or lost (empty, dark inside). */
export function heart(full: boolean): Px {
  const s = new Px(16, 16)
  const fill = full ? P.red : P.rock2
  s.circle(5, 6, 3.6, fill).circle(10.5, 6, 3.6, fill)
  s.polygon(
    [
      [1.6, 7],
      [14, 7],
      [8, 13.6],
    ],
    fill,
  )
  if (full) {
    shade(s, P.red, null, P.redDark, 8, 8, 6, 6, -2, 0.35)
    s.rect(3, 4, 2, 2, P.white).set(5, 3, P.white)
  } else s.rect(3, 4, 2, 1, P.rock3)
  s.outline(P.ink)
  return s
}

/** The mouse pointer (hot spot at the top-left pixel) and the sky handle. */
export function arrow(): Px {
  const s = new Px(14, 20)
  s.polygon(
    [
      [0, 0],
      [0, 10.5],
      [3, 8],
      [5.5, 12.5],
      [7.5, 11.5],
      [5.2, 7.2],
      [9, 7],
    ],
    P.white,
  )
  s.set(1, 2, P.coral3).set(1, 3, P.coral3)
  // the outline goes inside, so the tip stays the top-left pixel
  const inner = s.clone()
  for (let y = 0; y < s.height; y++)
    for (let x = 0; x < s.width; x++) {
      if (!inner.get(x, y)) continue
      const edge =
        !inner.get(x - 1, y) || !inner.get(x + 1, y) || !inner.get(x, y - 1) || !inner.get(x, y + 1)
      if (edge || x === 0 || y === 0) s.set(x, y, P.ink)
    }
  s.set(1, 1, P.red).set(1, 2, P.red).set(2, 2, P.red)
  return s
}

export function skyHandle(): Px {
  const s = new Px(14, 20)
  s.ellipse(1, 1, 12, 18, P.cloud)
  shade(s, P.cloud, null, P.cloudShade, 7, 10, 6, 9, -2, 0.35)
  s.polygon(
    [
      [7, 3],
      [3.5, 7.5],
      [10.5, 7.5],
    ],
    P.red,
  )
  s.polygon(
    [
      [3.5, 12.5],
      [10.5, 12.5],
      [7, 17],
    ],
    P.red,
  )
  s.rect(3, 9, 8, 2, P.ink)
  s.outline(P.ink)
  return s
}
