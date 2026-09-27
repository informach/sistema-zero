/** Bounded ear clipping of a simple polygon. Indices address authorial corners, preserving UV seams. */
import type { Vec3 } from '../core/model'
import type { Vec2 } from './document'

type Triangle = [number, number, number]
export type Triangulation =
  | { status: 'ok'; triangles: Triangle[] }
  | { status: 'degenerate' | 'self-intersection'; triangles: [] }

const EPSILON = 1e-12
const turn = (a: Vec2, b: Vec2, c: Vec2) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

function onSegment(a: Vec2, b: Vec2, p: Vec2) {
  return (
    Math.abs(turn(a, b, p)) <= EPSILON &&
    p[0] >= Math.min(a[0], b[0]) - EPSILON &&
    p[0] <= Math.max(a[0], b[0]) + EPSILON &&
    p[1] >= Math.min(a[1], b[1]) - EPSILON &&
    p[1] <= Math.max(a[1], b[1]) + EPSILON
  )
}

function intersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2) {
  const ac = turn(a, b, c)
  const ad = turn(a, b, d)
  const ca = turn(c, d, a)
  const cb = turn(c, d, b)
  return (
    (ac * ad < -EPSILON * EPSILON && ca * cb < -EPSILON * EPSILON) ||
    onSegment(a, b, c) ||
    onSegment(a, b, d) ||
    onSegment(c, d, a) ||
    onSegment(c, d, b)
  )
}

export function triangulateFace(points: readonly Vec3[]): Triangulation {
  if (points.length < 3) return { status: 'degenerate', triangles: [] }
  const first = points[0]
  if (!first) return { status: 'degenerate', triangles: [] }
  const extent = Math.max(
    ...points.flatMap((p) => [
      Math.abs(p[0] - first[0]),
      Math.abs(p[1] - first[1]),
      Math.abs(p[2] - first[2]),
    ]),
  )
  if (!Number.isFinite(extent) || extent === 0) return { status: 'degenerate', triangles: [] }
  const local: Vec3[] = points.map((p) => [
    (p[0] - first[0]) / extent,
    (p[1] - first[1]) / extent,
    (p[2] - first[2]) / extent,
  ])
  const normal: Vec3 = [0, 0, 0]
  for (let i = 0; i < local.length; i++) {
    const a = local[i]
    const b = local[(i + 1) % local.length]
    if (!a || !b) throw new Error('Polígono incompleto.')
    normal[0] += (a[1] - b[1]) * (a[2] + b[2])
    normal[1] += (a[2] - b[2]) * (a[0] + b[0])
    normal[2] += (a[0] - b[0]) * (a[1] + b[1])
  }
  // A bow tie can have zero Newell area; choose its widest plane to still identify crossings.
  const spreads = [0, 1, 2].map((axis) => {
    const values = local.map((point) => point[axis] ?? 0)
    return Math.max(...values) - Math.min(...values)
  })
  const axis =
    Math.hypot(...normal) > EPSILON
      ? normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)))
      : spreads.indexOf(Math.min(...spreads))
  const projected: Vec2[] = local.map((p) =>
    axis === 0 ? [p[1], p[2]] : axis === 1 ? [p[0], p[2]] : [p[0], p[1]],
  )
  // Positive axis scaling preserves winding/intersections. Normalize each projected
  // extent so a valid thin face is not mistaken for overlapping edges by EPSILON.
  for (const coordinate of [0, 1] as const) {
    const values = projected.map((point) => point[coordinate])
    const minimum = Math.min(...values)
    const width = Math.max(...values) - minimum
    if (width === 0) return { status: 'degenerate', triangles: [] }
    for (const point of projected) point[coordinate] = (point[coordinate] - minimum) / width
  }
  const point = (index: number) => {
    const value = projected[index]
    if (!value) throw new Error('Canto ausente.')
    return value
  }
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (j === (i + 1) % points.length || i === (j + 1) % points.length) continue
      if (
        intersect(
          point(i),
          point((i + 1) % points.length),
          point(j),
          point((j + 1) % points.length),
        )
      )
        return { status: 'self-intersection', triangles: [] }
    }
  }
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = point(i)
    const b = point((i + 1) % points.length)
    area += a[0] * b[1] - a[1] * b[0]
  }
  if (Math.abs(area) <= EPSILON) return { status: 'degenerate', triangles: [] }
  const sign = Math.sign(area)
  const remaining = points.map((_, i) => i)
  const triangles: Triangle[] = []
  while (remaining.length > 3) {
    let found = false
    // Start at corner 1: convex quads keep the legacy 0-1-2 / 0-2-3 diagonal.
    for (let step = 1; step <= remaining.length; step++) {
      const i = step % remaining.length
      const a = remaining[(i + remaining.length - 1) % remaining.length]
      const b = remaining[i]
      const c = remaining[(i + 1) % remaining.length]
      if (a === undefined || b === undefined || c === undefined)
        throw new Error('Polígono incompleto.')
      if (turn(point(a), point(b), point(c)) * sign <= EPSILON) continue
      const occupied = remaining.some(
        (p) =>
          p !== a &&
          p !== b &&
          p !== c &&
          turn(point(a), point(b), point(p)) * sign >= -EPSILON &&
          turn(point(b), point(c), point(p)) * sign >= -EPSILON &&
          turn(point(c), point(a), point(p)) * sign >= -EPSILON,
      )
      if (occupied) continue
      triangles.push([a, b, c])
      remaining.splice(i, 1)
      found = true
      break
    }
    if (!found) return { status: 'degenerate', triangles: [] }
  }
  const [a, b, c] = remaining
  if (
    a === undefined ||
    b === undefined ||
    c === undefined ||
    Math.abs(turn(point(a), point(b), point(c))) <= EPSILON
  )
    return { status: 'degenerate', triangles: [] }
  triangles.push([a, b, c])
  return { status: 'ok', triangles }
}
