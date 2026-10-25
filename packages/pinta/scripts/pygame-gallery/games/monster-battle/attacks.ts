/**
 * The six attack animations (four frames each, like the original sheets): they start small,
 * burst on the second frame and fade out. Drawn on a 128×128 frame (256 px in the game).
 */
import { type Color, Px, random } from '../../pixel'
import { Painter, type Ramp } from './kit'
import { FIRE, flame, leafMask, starPoints } from './parts'

const SIZE = 128
const SPARK: Ramp = ['#b85a10', '#ff9a2a', '#ffd84a', '#fff4b0', '#ffffff']
const WATER: Ramp = ['#173f86', '#2a78d0', '#4ab2f0', '#a2e2ff', '#ffffff']
const ICE: Ramp = ['#1a3a7a', '#4a9ad8', '#8ad8f8', '#d8f6ff', '#ffffff']
const LEAF: Ramp = ['#14501e', '#2f9a3a', '#5ac84a', '#9ae66a', '#e2ffb0']
const SMOKE: Ramp = ['#4a4048', '#7a6e78', '#a89ca4', '#d0c6cc', '#efe8ec']

function canvas() {
  const px = new Px(SIZE, SIZE)
  return { px, P: new Painter(px, 0, 0, SIZE / 100, false) }
}

function sparkle(P: Painter, x: number, y: number, r: number, color: Color) {
  P.flat(P.mask().poly(starPoints(x, y, r, 4, 0.3)), color)
}

function scratch(frame: number): Px {
  const { px, P } = canvas()
  const slashes = [0, 1, 2].map((i) => ({
    x0: 66 + i * 13,
    y0: 14 + i * 4,
    x1: 30 + i * 13,
    y1: 84 + i * 2,
  }))
  for (const { x0, y0, x1, y1 } of slashes) {
    const lerp = (t: number) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t] as const
    if (frame === 0) {
      const [ax, ay] = lerp(0)
      const [bx, by] = lerp(0.35)
      P.fill(leafMask(P, ax, ay, bx, by, 1.6), SPARK, { seam: false, reach: 2 })
    } else if (frame === 1) {
      P.fill(leafMask(P, x0, y0, x1, y1, 4.2, 2), SPARK, { seam: false, reach: 3 })
    } else if (frame === 2) {
      for (const [from, to] of [
        [0.1, 0.32],
        [0.42, 0.62],
        [0.72, 0.92],
      ] as const) {
        const [ax, ay] = lerp(from)
        const [bx, by] = lerp(to)
        P.fill(leafMask(P, ax, ay + 4, bx, by + 4, 2.4, 1), SPARK, { seam: false, reach: 2 })
      }
    } else {
      for (const t of [0.25, 0.55, 0.85]) {
        const [x, y] = lerp(t)
        sparkle(P, x, y + 8, 3, SPARK[3]!)
      }
    }
  }
  return px.outline('#7a3a08')
}

function fire(frame: number): Px {
  const { px, P } = canvas()
  const rng = random(101 + frame)
  if (frame === 0) {
    flame(P, 50, 84, 9, 1, 2.4)
    flame(P, 38, 88, 5, -2, 2.2)
  } else if (frame === 1) {
    flame(P, 30, 88, 11, -5, 2.4)
    flame(P, 70, 88, 12, 5, 2.4)
    flame(P, 50, 86, 19, 0, 2.8)
  } else if (frame === 2) {
    flame(P, 34, 88, 9, -4, 2.2)
    flame(P, 64, 88, 10, 4, 2.4)
    for (let i = 0; i < 9; i++)
      P.ball(rng.int(26, 76), rng.int(20, 50), 1.6, 1.6, FIRE, { seam: false })
    P.ball(46, 30, 8, 6, SMOKE, { seam: false })
  } else {
    for (let i = 0; i < 6; i++) P.dot(rng.int(30, 72), rng.int(16, 60), 1.2, FIRE[3]!)
    P.ball(40, 30, 9, 7, SMOKE, { seam: false })
    P.ball(58, 22, 7, 6, SMOKE, { seam: false })
    flame(P, 50, 88, 6, 0, 2)
  }
  return px.outline('#5a1408')
}

function explosion(frame: number): Px {
  const { px, P } = canvas()
  const rng = random(211 + frame)
  if (frame === 0) {
    P.ball(50, 56, 12, 12, FIRE, { seam: false, bias: 0.4 })
    P.ball(48, 54, 6, 6, ['#fff4b0', '#ffe27a', '#fff4b0', '#ffffff', '#ffffff'], { seam: false })
  } else if (frame === 1) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.2
      const r = i % 2 ? 40 : 46
      P.shape(
        [
          [50 + Math.cos(a - 0.18) * 24, 54 + Math.sin(a - 0.18) * 24],
          [50 + Math.cos(a) * r, 54 + Math.sin(a) * r],
          [50 + Math.cos(a + 0.18) * 24, 54 + Math.sin(a + 0.18) * 24],
        ],
        FIRE,
        { seam: false },
      )
    }
    P.ball(50, 54, 32, 30, FIRE, { seam: false, bias: 0.2, reach: 10 })
    P.ball(46, 50, 16, 14, ['#ffd84a', '#ffe27a', '#fff4b0', '#ffffff', '#ffffff'], { seam: false })
  } else if (frame === 2) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      P.ball(50 + Math.cos(a) * 30, 54 + Math.sin(a) * 26, 12, 10, SMOKE, { seam: false })
    }
    P.ball(50, 54, 20, 18, FIRE, { seam: false })
    for (let i = 0; i < 10; i++) P.dot(rng.int(10, 90), rng.int(10, 96), 1.4, FIRE[3]!)
  } else {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4
      P.ball(50 + Math.cos(a) * 38, 52 + Math.sin(a) * 32, 7, 6, SMOKE, { seam: false })
    }
    P.ball(50, 56, 8, 7, SMOKE, { seam: false })
  }
  return px.outline('#4a1008')
}

function splash(frame: number): Px {
  const { px, P } = canvas()
  const drop = (x: number, y: number, r: number) =>
    P.ball(x, y, r, r * 1.15, WATER, { seam: false, reach: 3 })
  if (frame === 0) {
    P.ball(50, 74, 16, 12, WATER, { seam: false })
    drop(50, 54, 4)
  } else if (frame === 1) {
    for (const [x1, y1] of [
      [20, 40],
      [34, 26],
      [50, 18],
      [66, 26],
      [80, 40],
    ] as const)
      P.fill(leafMask(P, 50 + (x1 - 50) * 0.3, 80, x1, y1, 6, 0), WATER, { seam: false, reach: 3 })
    P.ball(50, 82, 34, 9, WATER, { seam: false })
    for (const [x, y] of [
      [18, 26],
      [50, 6],
      [82, 26],
      [30, 12],
      [70, 12],
    ] as const)
      drop(x, y, 3.4)
  } else if (frame === 2) {
    for (const [x, y, r] of [
      [14, 40, 5],
      [86, 40, 5],
      [26, 22, 4],
      [74, 22, 4],
      [50, 12, 4.5],
      [8, 62, 3],
      [92, 62, 3],
    ] as const)
      drop(x, y, r)
    const ring = P.mask().ellipse(50, 84, 38, 9)
    ring.ellipse(50, 84, 32, 6, true)
    P.fill(ring, WATER, { seam: false, reach: 2 })
  } else {
    for (const [x, y] of [
      [6, 58],
      [94, 58],
      [20, 40],
      [80, 40],
    ] as const)
      drop(x, y, 2.4)
    const ring = P.mask().ellipse(50, 86, 46, 9)
    ring.ellipse(50, 86, 42, 7, true)
    P.flat(ring, WATER[3]!)
  }
  return px.outline('#0e2a5a')
}

function shard(P: Painter, x: number, y: number, angle: number, length: number, width: number) {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const nx = -dy
  const ny = dx
  P.shape(
    [
      [x - dx * length * 0.3, y - dy * length * 0.3],
      [x + nx * width, y + ny * width],
      [x + dx * length, y + dy * length],
      [x - nx * width, y - ny * width],
    ],
    ICE,
    { seam: false, reach: 3, bias: 0.2 },
  )
}

function ice(frame: number): Px {
  const { px, P } = canvas()
  if (frame === 0) {
    shard(P, 20, 40, 0.25, 18, 4)
    shard(P, 30, 70, -0.1, 20, 5)
    shard(P, 22, 56, 0.05, 14, 3)
  } else if (frame === 1) {
    for (const [a, l, w] of [
      [-1.6, 34, 8],
      [-2.3, 26, 6],
      [-0.9, 28, 7],
      [-2.9, 18, 5],
      [-0.2, 20, 5],
    ] as const)
      shard(P, 50, 70, a, l, w)
    shard(P, 30, 74, -2.1, 14, 4)
    shard(P, 70, 74, -1.0, 14, 4)
    sparkle(P, 76, 28, 5, '#ffffff')
  } else if (frame === 2) {
    for (const [x, y, a, l] of [
      [30, 30, -2.2, 14],
      [70, 26, -1, 12],
      [50, 18, -1.6, 12],
      [22, 62, 2.9, 10],
      [80, 60, 0.3, 10],
      [50, 76, 1.6, 8],
    ] as const)
      shard(P, x, y, a, l, 3.4)
    sparkle(P, 50, 50, 5, '#ffffff')
  } else {
    for (const [x, y, a] of [
      [18, 22, -2.4],
      [84, 20, -0.8],
      [10, 66, 3],
      [92, 64, 0.2],
      [50, 88, 1.6],
    ] as const)
      shard(P, x, y, a, 6, 2.2)
    sparkle(P, 36, 40, 3.4, '#ffffff')
    sparkle(P, 66, 54, 3, '#ffffff')
  }
  return px.outline('#123060')
}

function green(frame: number): Px {
  const { px, P } = canvas()
  const radius = [12, 24, 34, 42][frame]!
  const size = [7, 10, 9, 6][frame]!
  const count = 6
  for (let i = 0; i < count; i++) {
    const a = frame * 0.9 + (i / count) * Math.PI * 2
    const r = radius * (0.7 + (i % 2) * 0.3)
    const x = 50 + Math.cos(a) * r
    const y = 54 + Math.sin(a) * r * 0.8
    // Each leaf points along the spin.
    const tx = Math.cos(a + Math.PI / 2) * size
    const ty = Math.sin(a + Math.PI / 2) * size
    P.fill(leafMask(P, x - tx, y - ty, x + tx, y + ty, size * 0.42, 1), LEAF, {
      seam: false,
      reach: 3,
    })
  }
  if (frame > 0)
    for (let i = 0; i < 5; i++) {
      const a = -frame * 0.7 + (i / 5) * Math.PI * 2
      sparkle(
        P,
        50 + Math.cos(a) * radius * 0.55,
        54 + Math.sin(a) * radius * 0.45,
        frame === 3 ? 4 : 3,
        LEAF[4]!,
      )
    }
  if (frame === 1) P.ball(50, 54, 6, 6, LEAF, { seam: false })
  return px.outline('#14401a')
}

/** Animation names in the Pinta drawing and the key the game uses for each. */
export const ATTACKS = [
  { name: 'arranhao', key: 'scratch', draw: scratch },
  { name: 'fogo', key: 'fire', draw: fire },
  { name: 'explosao', key: 'explosion', draw: explosion },
  { name: 'respingo', key: 'splash', draw: splash },
  { name: 'gelo', key: 'ice', draw: ice },
  { name: 'folhas', key: 'green', draw: green },
] as const

export const ATTACK_SIZE = SIZE
