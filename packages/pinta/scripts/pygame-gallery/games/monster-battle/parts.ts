/** Body parts several monsters share: leaves, flames, fins, stars, legs. */
import { type Color, darken, lighten, mix } from '../../pixel'
import { type FillOptions, type Mask, type Painter, type Ramp, sampleCurve } from './kit'

/** Five tones from one base colour: seam, shade, base, light, shine. */
export function tones(base: Color, warm = '#fff2c8', cool = '#241a3a'): Ramp {
  return [
    mix(base, cool, 0.62),
    mix(base, cool, 0.3),
    base,
    mix(base, warm, 0.3),
    mix(base, warm, 0.6),
  ]
}

export const FIRE: Ramp = ['#8a1f12', '#d2401c', '#f27a24', '#ffb238', '#ffe27a']

/** A pointed leaf from (x0, y0) to (x1, y1); `width` is the widest half-width. */
export function leafMask(
  P: Painter,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  bend = 0,
): Mask {
  const dx = x1 - x0
  const dy = y1 - y0
  const length = Math.hypot(dx, dy) || 1
  const nx = -dy / length
  const ny = dx / length
  const side = (sign: number) =>
    Array.from({ length: 13 }, (_, i) => {
      const t = i / 12
      const w = width * Math.sin(Math.PI * t) ** 0.8
      const b = bend * Math.sin(Math.PI * t)
      return [x0 + dx * t + nx * (w * sign + b), y0 + dy * t + ny * (w * sign + b)] as const
    })
  const left = side(1)
  const right = side(-1).reverse()
  return P.mask().poly([...left, ...right])
}

export function leaf(
  P: Painter,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  ramp: Ramp,
  bend = 0,
  vein = true,
) {
  P.fill(leafMask(P, x0, y0, x1, y1, width, bend), ramp, { reach: 4 })
  if (vein && P.s * width > 2.5) {
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2
    const length = Math.hypot(x1 - x0, y1 - y0) || 1
    const b = bend * 0.9
    P.stroke(
      [
        [x0, y0],
        [mx + (-(y1 - y0) / length) * b, my + ((x1 - x0) / length) * b],
        [x0 + (x1 - x0) * 0.85, y0 + (y1 - y0) * 0.85],
      ],
      0.9,
      ramp[1]!,
    )
  }
}

/** A flame standing on (x, y), `r` wide at the base, leaning sideways by `lean`. */
export function flame(P: Painter, x: number, y: number, r: number, lean = 0, height = 2.6) {
  const shape = (scale: number, dy: number) => {
    const points: [number, number][] = []
    const tipX = x + lean * scale
    const tipY = y - r * height * scale + dy
    points.push([tipX, tipY])
    // The round bottom, from the left side through the bottom to the right side.
    for (let i = 0; i <= 12; i++) {
      const angle = Math.PI + 0.15 - (i / 12) * (Math.PI + 0.3)
      points.push([x + Math.cos(angle) * r * scale, y + dy + Math.sin(angle) * r * scale * 0.9])
    }
    return points
  }
  P.fill(P.mask().poly(shape(1, 0)), FIRE, { reach: 3, bias: 0.2, seam: false })
  P.flat(P.mask().poly(shape(0.62, r * 0.25)), FIRE[3]!)
  P.flat(P.mask().poly(shape(0.32, r * 0.45)), FIRE[4]!)
}

export function starPoints(
  cx: number,
  cy: number,
  r: number,
  points = 5,
  inner = 0.45,
  turn = -Math.PI / 2,
) {
  return Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 ? r * inner : r
    const angle = turn + (i * Math.PI) / points
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const
  })
}

/** Paint `build` only inside `body` (markings that follow a body part). */
export function marking(P: Painter, body: Mask, build: (m: Mask) => void, color: Color) {
  const m = P.mask()
  build(m)
  m.clip(body)
  P.flat(m, color)
}

/** A leg as a tapered tube ending in a foot. */
export function leg(
  P: Painter,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  ramp: Ramp,
  options?: FillOptions,
) {
  const m = P.mask().curve(
    [
      [x0, y0],
      [x1, y1],
    ],
    width,
    width * 0.8,
  )
  m.ellipse(x1 - width * 0.15, y1 + width * 0.05, width * 0.6, width * 0.32)
  P.fill(m, ramp, { reach: 4, ...options })
}

/** A fin: a curved triangle from a base segment to a tip. */
export function fin(
  P: Painter,
  base: readonly [number, number][],
  tip: readonly [number, number],
  ramp: Ramp,
  curl = 0,
) {
  const [a, b] = [base[0]!, base[1]!]
  const mid = [(a[0] + tip[0]) / 2 + curl, (a[1] + tip[1]) / 2 - curl] as const
  const curve = sampleCurve([a, mid, tip], 5)
  const back = sampleCurve([tip, [(b[0] + tip[0]) / 2 + curl * 0.5, (b[1] + tip[1]) / 2], b], 5)
  P.fill(P.mask().poly([...curve, ...back]), ramp, { reach: 4 })
}

export const WHITE = '#fbf7ec'
export { darken, lighten, mix }
