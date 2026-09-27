import { lineTexels, type Texel } from './skinPaint'

export type PixelShape = 'line' | 'rectangle' | 'ellipse'

/** Inclusive integer raster shared by legacy seamless textures and native rectangular images.
 * Yields texels incrementally; a filled megapixel does not allocate a million coordinate pairs at once. */
export function* shapeTexels(
  shape: PixelShape,
  from: Texel,
  to: Texel,
  filled: boolean,
): Generator<Texel> {
  if (shape === 'line') {
    yield* lineTexels(...from, ...to)
    return
  }
  const left = Math.min(from[0], to[0]),
    right = Math.max(from[0], to[0])
  const top = Math.min(from[1], to[1]),
    bottom = Math.max(from[1], to[1])
  if (shape === 'rectangle') {
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++)
        if (filled || x === left || x === right || y === top || y === bottom) yield [x, y]
    return
  }
  if (left === right || top === bottom) {
    yield* lineTexels(left, top, right, bottom)
    return
  }
  const cx = (left + right) / 2,
    cy = (top + bottom) / 2
  const rx = (right - left) / 2,
    ry = (bottom - top) / 2
  const rows: Array<[number, number]> = []
  for (let y = top; y <= bottom; y++) {
    const half = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2))
    rows.push([Math.floor(cx - half), Math.ceil(cx + half)])
  }
  for (const [row, [a, b]] of rows.entries()) {
    const above = rows[row - 1],
      below = rows[row + 1]
    for (let x = a; x <= b; x++)
      if (
        filled ||
        x === a ||
        x === b ||
        !above ||
        !below ||
        x < above[0] ||
        x > above[1] ||
        x < below[0] ||
        x > below[1]
      )
        yield [x, top + row]
  }
}
