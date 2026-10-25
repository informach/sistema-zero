/** Shared helpers for the Python Monsters art: the palette, seeded hashes and small drawing tools. */
import { Px } from '../../pixel'

/** Outline ink of the whole game (a warm, very dark purple). */
export const INK = '#2a1d2b'

export const PAL = {
  grass: ['#2f6331', '#41803a', '#5b9e40', '#77b84b', '#98d05e', '#bfe384'],
  sand: ['#a8703d', '#c88e50', '#dfac67', '#ecc684', '#f5dca5', '#fbedcb'],
  snow: ['#7d9fc7', '#a6c4e2', '#cbdff1', '#e4eff9', '#f4f9fd', '#ffffff'],
  ice: ['#1f7fb0', '#2fa3d2', '#55c3e6', '#8ddcf1', '#c4eff9'],
  water: ['#17487e', '#1f62a3', '#2b7fc3', '#4a9ddb', '#7cc0ec', '#c4e8fa'],
  rock: ['#4a2618', '#6b3a22', '#8e532c', '#b06f39', '#cf904d', '#e8b673'],
  stone: ['#4d5566', '#717c8f', '#9aa6b8', '#c4cddb', '#e8edf3'],
  wood: ['#4a2a1a', '#6e3f22', '#93592d', '#b8783d', '#d79b55'],
  skin: ['#7a4a33', '#a8694a', '#d4956b', '#efbe92', '#fbdcbc'],
} as const

/** A deterministic hash in [0, 1) of integer coordinates and a seed. */
export function hash(x: number, y: number, seed = 0): number {
  let h =
    Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Value noise that repeats every `period` pixels in both directions (seamless tiles). */
export function periodicNoise(
  x: number,
  y: number,
  cell: number,
  period: number,
  seed = 0,
): number {
  const cells = Math.max(1, Math.round(period / cell))
  const gx = x / cell
  const gy = y / cell
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const fx = gx - x0
  const fy = gy - y0
  const at = (cx: number, cy: number) =>
    hash(((cx % cells) + cells) % cells, ((cy % cells) + cells) % cells, seed)
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
  return top + (bottom - top) * sy
}

/** Paint a shape (a function that fills the canvas), then rim light/shade and outline it. */
export function shaded(
  width: number,
  height: number,
  paint: (p: Px) => void,
  light?: string,
  shade?: string,
  ink = INK,
) {
  const p = new Px(width, height)
  paint(p)
  if (light || shade) p.rim(light ?? null, shade ?? null)
  p.outline(ink)
  return p
}

/** A copy shifted by whole pixels (used for bobbing animations). */
export function moved(source: Px, dx: number, dy: number): Px {
  const out = new Px(source.width, source.height)
  out.draw(source, dx, dy)
  return out
}

/** Pixels painted with `color` only inside an existing shape, with a soft dither between two colours. */
export function shadeInside(p: Px, test: (x: number, y: number) => boolean, color: string) {
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) if (p.get(x, y) !== null && test(x, y)) p.set(x, y, color)
  return p
}

/** Bayer threshold (0..1) for ordered dithering. */
export function bayer(x: number, y: number): number {
  const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
  return (m[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)]! + 0.5) / 16
}

/** Copy a rectangle of a canvas into a new canvas. */
export function crop(source: Px, x: number, y: number, width: number, height: number): Px {
  const out = new Px(width, height)
  for (let row = 0; row < height; row++)
    for (let column = 0; column < width; column++)
      out.set(column, row, source.get(x + column, y + row))
  return out
}

/** Nearest-neighbour downscale by an integer factor that keeps the most common painted colour. */
export function shrink(source: Px, factor: number): Px {
  const out = new Px(Math.ceil(source.width / factor), Math.ceil(source.height / factor))
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++) {
      const counts = new Map<string, number>()
      let empty = 0
      for (let dy = 0; dy < factor; dy++)
        for (let dx = 0; dx < factor; dx++) {
          const color = source.get(x * factor + dx, y * factor + dy)
          if (color === null) empty++
          else counts.set(color, (counts.get(color) ?? 0) + 1)
        }
      let best: string | null = null
      let most = 0
      for (const [color, count] of counts) if (count > most) [best, most] = [color, count]
      if (best && most * 2 >= factor * factor - empty && empty < factor * factor * 0.75)
        out.set(x, y, best)
    }
  return out
}
