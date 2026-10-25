/**
 * Pixel art drawn by code for the Pygame-ce gallery: a small canvas of hex colours with the
 * shapes, outlines and shading the drawings need. Everything is deterministic (seeded noise),
 * so the generator's `--check` reproduces every byte.
 */
export type Color = string

export function rgb(color: Color): [number, number, number] {
  const value = Number.parseInt(color.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function hex(r: number, g: number, b: number): Color {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/** `amount` 0 = a, 1 = b. */
export function mix(a: Color, b: Color, amount: number): Color {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  return hex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount)
}

export const lighten = (color: Color, amount: number) => mix(color, '#ffffff', amount)
export const darken = (color: Color, amount: number) => mix(color, '#000000', amount)

/** A colour ramp from dark to light around a base colour (hue-shifted like pixel artists do). */
export function ramp(base: Color, steps = 5, warm = '#ffe9b0', cool = '#1a1035'): Color[] {
  const result: Color[] = []
  for (let index = 0; index < steps; index++) {
    const t = steps === 1 ? 0.5 : index / (steps - 1)
    result.push(t < 0.5 ? mix(cool, base, 0.35 + t * 1.3) : mix(base, warm, (t - 0.5) * 0.8))
  }
  return result
}

/** mulberry32: small, fast and the same everywhere. */
export function random(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)]!,
    chance: (probability: number) => next() < probability,
  }
}
export type Random = ReturnType<typeof random>

export class Px {
  readonly width: number
  readonly height: number
  readonly data: (Color | null)[]

  constructor(width: number, height: number, fill: Color | null = null) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
      throw new Error(`tamanho de desenho inválido: ${width}x${height}`)
    this.width = width
    this.height = height
    this.data = new Array(width * height).fill(fill)
  }

  static from(rows: string[], colors: Record<string, Color>): Px {
    const canvas = new Px(rows[0]!.length, rows.length)
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const key = row[x]!
        if (key === '.' || key === ' ') continue
        const color = colors[key]
        if (!color) throw new Error(`cor sem nome no desenho: ${key}`)
        canvas.set(x, y, color)
      }
    })
    return canvas
  }

  clone(): Px {
    const copy = new Px(this.width, this.height)
    for (let index = 0; index < this.data.length; index++) copy.data[index] = this.data[index]!
    return copy
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  get(x: number, y: number): Color | null {
    return this.inside(x, y) ? this.data[y * this.width + x]! : null
  }

  set(x: number, y: number, color: Color | null) {
    x = Math.round(x)
    y = Math.round(y)
    if (this.inside(x, y)) this.data[y * this.width + x] = color
    return this
  }

  /** Paint only where there is already a pixel (shading inside a shape). */
  tint(x: number, y: number, color: Color) {
    if (this.get(Math.round(x), Math.round(y)) !== null) this.set(x, y, color)
    return this
  }

  rect(x: number, y: number, width: number, height: number, color: Color | null) {
    for (let row = Math.round(y); row < Math.round(y + height); row++)
      for (let column = Math.round(x); column < Math.round(x + width); column++)
        this.set(column, row, color)
    return this
  }

  frame(x: number, y: number, width: number, height: number, color: Color) {
    this.rect(x, y, width, 1, color).rect(x, y + height - 1, width, 1, color)
    this.rect(x, y, 1, height, color).rect(x + width - 1, y, 1, height, color)
    return this
  }

  /** Filled ellipse inside the box (pixel-centred, symmetric). */
  ellipse(x: number, y: number, width: number, height: number, color: Color | null) {
    const cx = x + width / 2
    const cy = y + height / 2
    const rx = width / 2
    const ry = height / 2
    for (let row = Math.floor(y); row < Math.ceil(y + height); row++)
      for (let column = Math.floor(x); column < Math.ceil(x + width); column++) {
        const dx = (column + 0.5 - cx) / rx
        const dy = (row + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1) this.set(column, row, color)
      }
    return this
  }

  circle(cx: number, cy: number, radius: number, color: Color | null) {
    return this.ellipse(cx - radius, cy - radius, radius * 2, radius * 2, color)
  }

  line(x0: number, y0: number, x1: number, y1: number, color: Color, thickness = 1) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let error = dx + dy
    for (;;) {
      if (thickness <= 1) this.set(x0, y0, color)
      else this.rect(x0 - Math.floor((thickness - 1) / 2), y0 - Math.floor((thickness - 1) / 2), thickness, thickness, color)
      if (x0 === x1 && y0 === y1) break
      const twice = 2 * error
      if (twice >= dy) {
        error += dy
        x0 += sx
      }
      if (twice <= dx) {
        error += dx
        y0 += sy
      }
    }
    return this
  }

  /** Filled polygon (even-odd scanline). */
  polygon(points: readonly (readonly [number, number])[], color: Color | null) {
    const ys = points.map((point) => point[1])
    for (let row = Math.floor(Math.min(...ys)); row <= Math.ceil(Math.max(...ys)); row++) {
      const y = row + 0.5
      const crossings: number[] = []
      for (let index = 0; index < points.length; index++) {
        const [ax, ay] = points[index]!
        const [bx, by] = points[(index + 1) % points.length]!
        if ((ay <= y && by > y) || (by <= y && ay > y)) crossings.push(ax + ((y - ay) / (by - ay)) * (bx - ax))
      }
      crossings.sort((a, b) => a - b)
      for (let index = 0; index + 1 < crossings.length; index += 2)
        for (let column = Math.round(crossings[index]!); column < Math.round(crossings[index + 1]!); column++)
          this.set(column, row, color)
    }
    return this
  }

  /** Draw another canvas on this one (transparent pixels skipped). */
  draw(other: Px, x = 0, y = 0) {
    for (let row = 0; row < other.height; row++)
      for (let column = 0; column < other.width; column++) {
        const color = other.data[row * other.width + column]!
        if (color !== null) this.set(x + column, y + row, color)
      }
    return this
  }

  flipX(): Px {
    const copy = new Px(this.width, this.height)
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) copy.set(this.width - 1 - x, y, this.get(x, y))
    return copy
  }

  flipY(): Px {
    const copy = new Px(this.width, this.height)
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) copy.set(x, this.height - 1 - y, this.get(x, y))
    return copy
  }

  /** Rotate by a quarter turn clockwise `turns` times. */
  rotate(turns: number): Px {
    let current: Px = this
    for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn++) {
      const next = new Px(current.height, current.width)
      for (let y = 0; y < current.height; y++)
        for (let x = 0; x < current.width; x++) next.set(current.height - 1 - y, x, current.get(x, y))
      current = next
    }
    return current
  }

  /** Mirror the left half onto the right (symmetric characters). */
  mirrorX() {
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < Math.floor(this.width / 2); x++) this.set(this.width - 1 - x, y, this.get(x, y))
    return this
  }

  /** A border around every painted shape (outside its pixels). */
  outline(color: Color, diagonal = false) {
    const painted = this.data.map((value) => value !== null)
    const at = (x: number, y: number) => this.inside(x, y) && painted[y * this.width + x]!
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        if (at(x, y)) continue
        const near =
          at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) ||
          (diagonal && (at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1)))
        if (near) this.set(x, y, color)
      }
    return this
  }

  /** Light from the top-left: the painted pixels on the lit and shaded rims change colour. */
  rim(light: Color | null, shade: Color | null, width = 1) {
    const painted = this.data.map((value) => value !== null)
    const at = (x: number, y: number) => this.inside(x, y) && painted[y * this.width + x]!
    const changes: [number, number, Color][] = []
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        if (!at(x, y)) continue
        if (light && (!at(x - width, y) || !at(x, y - width))) changes.push([x, y, light])
        else if (shade && (!at(x + width, y) || !at(x, y + width))) changes.push([x, y, shade])
      }
    for (const [x, y, color] of changes) this.set(x, y, color)
    return this
  }

  /** Replace one colour by another everywhere. */
  replace(from: Color, to: Color | null) {
    for (let index = 0; index < this.data.length; index++) if (this.data[index] === from) this.data[index] = to
    return this
  }

  /** Scatter colours on painted pixels (texture). */
  speckle(rng: Random, probability: number, colors: readonly Color[], only?: Color) {
    for (let index = 0; index < this.data.length; index++) {
      const value = this.data[index]
      if (value === null || (only && value !== only)) continue
      if (rng.chance(probability)) this.data[index] = rng.pick(colors)
    }
    return this
  }

  /** Vertical bands from `colors` (top to bottom), only on painted pixels when `onlyPainted`. */
  bands(colors: readonly Color[], onlyPainted = true, from = 0, to = this.height) {
    for (let y = from; y < to; y++) {
      const color = colors[Math.min(colors.length - 1, Math.floor(((y - from) / (to - from)) * colors.length))]!
      for (let x = 0; x < this.width; x++) if (!onlyPainted || this.get(x, y) !== null) this.set(x, y, color)
    }
    return this
  }

  /** Ordered-dither blend between two colours across a box (soft gradients in few colours). */
  dither(x: number, y: number, width: number, height: number, top: Color, bottom: Color) {
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
    for (let row = 0; row < height; row++) {
      const t = height === 1 ? 0 : row / (height - 1)
      for (let column = 0; column < width; column++) {
        const threshold = (bayer[((y + row) % 4) * 4 + ((x + column) % 4)]! + 0.5) / 16
        this.set(x + column, y + row, t > threshold ? bottom : top)
      }
    }
    return this
  }

  colors(): Set<Color> {
    const set = new Set<Color>()
    for (const value of this.data) if (value !== null) set.add(value)
    return set
  }
}

/** Shift a sprite by whole pixels (animation offsets), keeping its size. */
export function shift(canvas: Px, dx: number, dy: number): Px {
  const moved = new Px(canvas.width, canvas.height)
  moved.draw(canvas, dx, dy)
  return moved
}

/** Scale by an integer factor (nearest neighbour) — for previews and contact sheets. */
export function upscale(canvas: Px, factor: number): Px {
  const big = new Px(canvas.width * factor, canvas.height * factor)
  for (let y = 0; y < big.height; y++)
    for (let x = 0; x < big.width; x++) big.set(x, y, canvas.get(Math.floor(x / factor), Math.floor(y / factor)))
  return big
}
