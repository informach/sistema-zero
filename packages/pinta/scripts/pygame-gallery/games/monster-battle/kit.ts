/**
 * Monster Battle drawing kit: monsters are designed once in a 100×100 box (facing left, feet on
 * y = 100) and painted at any size. Each body part is a mask shaded by its distance to the edge
 * along the light (top-left), so round parts read as volumes; parts in front of others get a
 * dark seam (selout) and the whole creature gets a dark outline at the end.
 */
import { type Color, Px } from '../../pixel'

/** Dark → light. Index 0 is the seam colour; the shading uses the others. */
export type Ramp = readonly Color[]

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const LIGHT_X = -0.6
const LIGHT_Y = -0.8

export interface FillOptions {
  /** How far (pixels) the light and shade bands reach into the part. */
  reach?: number
  /** Shift towards light (+) or shade (−), in ramp steps. */
  bias?: number
  /** Ordered dither at the band borders (0 = hard bands). */
  dither?: number
  /** Dark seam where the part overlaps what is already painted. */
  seam?: boolean
}

export class Mask {
  readonly px: Px
  constructor(private readonly painter: Painter) {
    this.px = new Px(painter.px.width, painter.px.height)
  }
  private mark(cut: boolean) {
    return cut ? null : '#000000'
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, cut = false) {
    const p = this.painter
    const w = Math.max(1, rx * 2 * p.s)
    const h = Math.max(1, ry * 2 * p.s)
    this.px.ellipse(p.X(cx) - w / 2, p.Y(cy) - h / 2, w, h, this.mark(cut))
    return this
  }
  poly(points: readonly (readonly [number, number])[], cut = false) {
    const p = this.painter
    this.px.polygon(
      points.map(([x, y]) => [p.X(x), p.Y(y)] as const),
      this.mark(cut),
    )
    return this
  }
  line(x0: number, y0: number, x1: number, y1: number, thickness: number, cut = false) {
    const p = this.painter
    const t = Math.max(1, Math.round(thickness * p.s))
    const color = this.mark(cut)
    if (color === null) {
      const temp = new Px(this.px.width, this.px.height)
      temp.line(p.X(x0), p.Y(y0), p.X(x1), p.Y(y1), '#000000', t)
      for (let i = 0; i < temp.data.length; i++) if (temp.data[i]) this.px.data[i] = null
    } else this.px.line(p.X(x0), p.Y(y0), p.X(x1), p.Y(y1), color, t)
    return this
  }
  /** A thick curve through points (Catmull-Rom), tapering from `from` to `to` thickness. */
  curve(points: readonly (readonly [number, number])[], from: number, to = from, cut = false) {
    const samples = sampleCurve(points, 24)
    samples.forEach(([x, y], index) => {
      const r = (from + (to - from) * (index / Math.max(1, samples.length - 1))) / 2
      this.ellipse(x, y, r, r, cut)
    })
    return this
  }
  /** Only keep the part inside another mask (clip). */
  clip(other: Mask) {
    for (let i = 0; i < this.px.data.length; i++) if (!other.px.data[i]) this.px.data[i] = null
    return this
  }
  has(x: number, y: number) {
    return this.px.get(x, y) !== null
  }
}

export function sampleCurve(points: readonly (readonly [number, number])[], perSegment: number) {
  if (points.length < 3) {
    const [a, b] = [points[0]!, points[points.length - 1]!]
    return Array.from({ length: perSegment + 1 }, (_, i) => {
      const t = i / perSegment
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as const
    })
  }
  const out: (readonly [number, number])[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[Math.min(points.length - 1, i + 2)]!
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(points[points.length - 1]!)
  return out
}

/** Paints design coordinates (100×100 box) on a canvas, scaled by `s`, mirrored when `flip`. */
export class Painter {
  constructor(
    readonly px: Px,
    readonly ox: number,
    readonly oy: number,
    readonly s: number,
    readonly flip: boolean,
  ) {}
  X(x: number) {
    return this.ox + (this.flip ? 100 - x : x) * this.s
  }
  Y(y: number) {
    return this.oy + y * this.s
  }
  mask() {
    return new Mask(this)
  }
  /** Shade a mask with a ramp and paint it. */
  fill(mask: Mask, ramp: Ramp, options: FillOptions = {}) {
    const { px } = this
    const reach = Math.max(2, Math.round((options.reach ?? 7) * Math.min(1, this.s * 1.3)))
    const levels = ramp.length - 1
    const bias = options.bias ?? -0.5
    const dither = options.dither ?? 0.45
    const seam = options.seam ?? true
    // The light stays top-left in the picture, even on a mirrored creature.
    const lightX = LIGHT_X
    const m = mask.px
    const inside = (x: number, y: number) => m.get(Math.round(x), Math.round(y)) !== null
    const out: [number, number, Color][] = []
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++) {
        if (m.data[y * m.width + x] === null) continue
        let up = 0
        while (up < reach && inside(x + lightX * (up + 1), y + LIGHT_Y * (up + 1))) up++
        let down = 0
        while (down < reach && inside(x - lightX * (down + 1), y - LIGHT_Y * (down + 1))) down++
        const t = up + down === 0 ? 0 : (down - up) / (down + up)
        const level = ((t + 1) / 2) * (levels - 1) + 1 + bias
        const threshold = (BAYER[(y % 4) * 4 + (x % 4)]! + 0.5) / 16 - 0.5
        const index = Math.max(1, Math.min(levels, Math.floor(level + 0.5 + threshold * dither)))
        let color = ramp[index]!
        if (seam && px.get(x, y) !== null) {
          const edge =
            !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
          if (edge) color = ramp[0]!
        }
        out.push([x, y, color])
      }
    for (const [x, y, color] of out) px.set(x, y, color)
    return this
  }
  /** One flat colour (markings, eyes, mouths). */
  flat(mask: Mask, color: Color) {
    const m = mask.px
    for (let i = 0; i < m.data.length; i++) if (m.data[i] !== null) this.px.data[i] = color
    return this
  }
  /** Shorthands. */
  ball(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, options?: FillOptions) {
    return this.fill(this.mask().ellipse(cx, cy, rx, ry), ramp, options)
  }
  shape(points: readonly (readonly [number, number])[], ramp: Ramp, options?: FillOptions) {
    return this.fill(this.mask().poly(points), ramp, options)
  }
  tube(
    points: readonly (readonly [number, number])[],
    from: number,
    to: number,
    ramp: Ramp,
    options?: FillOptions,
  ) {
    return this.fill(this.mask().curve(points, from, to), ramp, options)
  }
  dot(x: number, y: number, r: number, color: Color) {
    const size = Math.max(1, r * 2 * this.s)
    if (size < 1.6) this.px.set(Math.floor(this.X(x)), Math.floor(this.Y(y)), color)
    else this.px.ellipse(this.X(x) - size / 2, this.Y(y) - size / 2, size, size, color)
    return this
  }
  stroke(points: readonly (readonly [number, number])[], thickness: number, color: Color) {
    const t = Math.max(1, Math.round(thickness * this.s))
    const samples = sampleCurve(points, 6)
    for (let i = 0; i + 1 < samples.length; i++)
      this.px.line(
        this.X(samples[i]![0]),
        this.Y(samples[i]![1]),
        this.X(samples[i + 1]![0]),
        this.Y(samples[i + 1]![1]),
        color,
        t,
      )
    return this
  }
  /** An eye looking towards the facing side: white, iris, pupil and a shine. */
  eye(cx: number, cy: number, r: number, iris: Color, ink: Color, white = '#fbf7ec') {
    const look = this.flip ? 1 : -1
    const ix = this.X(cx)
    const iy = this.Y(cy)
    const rs = r * this.s
    if (rs < 1.3) {
      this.px.set(Math.floor(ix), Math.floor(iy), ink)
      return this
    }
    const disc = (x: number, y: number, radius: number, color: Color) =>
      this.px.ellipse(x - radius, y - radius, radius * 2, radius * 2, color)
    disc(ix, iy, rs, white)
    const irisX = ix + look * rs * 0.28
    disc(irisX, iy + rs * 0.08, Math.max(1, rs * 0.72), iris)
    disc(irisX + look * rs * 0.08, iy + rs * 0.12, Math.max(0.6, rs * 0.42), ink)
    this.px.set(Math.floor(irisX - rs * 0.3), Math.floor(iy - rs * 0.3), '#ffffff')
    return this
  }
}

/** Light-to-dark ramp helper from explicit colours (seam first). */
export const ramp = (...colors: Color[]): Ramp => colors

/** Stretch the upper part of a creature by one pixel (breathing in). */
export function breathe(canvas: Px, pivot = 0.45): Px {
  const box = bounds(canvas)
  if (!box) return canvas.clone()
  const cut = Math.round(box.y + box.height * (1 - pivot))
  const out = new Px(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const color = canvas.get(x, y)
      if (color === null) continue
      if (y <= cut) out.set(x, y - 1, color)
      if (y >= cut) out.set(x, y, color)
    }
  return out
}

export function bounds(canvas: Px) {
  let left = Infinity
  let top = Infinity
  let right = -1
  let bottom = -1
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++)
      if (canvas.get(x, y) !== null) {
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

export function crop(canvas: Px, x: number, y: number, width: number, height: number): Px {
  const out = new Px(width, height)
  for (let row = 0; row < height; row++)
    for (let column = 0; column < width; column++)
      out.set(column, row, canvas.get(x + column, y + row))
  return out
}

/** Put a drawing at the bottom centre of a frame. */
export function place(drawing: Px, width: number, height: number): Px {
  const frame = new Px(width, height)
  frame.draw(drawing, Math.floor((width - drawing.width) / 2), height - drawing.height)
  return frame
}
