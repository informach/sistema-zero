import type { Vec2 } from './document'
import { faceTurn } from './meshFaceFrame'

/** Strict separating axes: boundary contact is allowed; no epsilon accepts a small overlap. */
export function trianglesOverlap(a: readonly Vec2[], b: readonly Vec2[]) {
  for (const [polygon, other] of [
    [a, b],
    [b, a],
  ] as const) {
    const sign = Math.sign(faceTurn(polygon[0]!, polygon[1]!, polygon[2]!))
    if (!sign) return true
    for (let i = 0; i < 3; i++) {
      const p = polygon[i]!,
        q = polygon[(i + 1) % 3]!
      if (other.every((point) => faceTurn(p, q, point) * sign <= 0)) return false
    }
  }
  return true
}

export interface UvTriangleBounds {
  points: Vec2[]
  min: Vec2
  max: Vec2
}

/** Broad phase only: exact comparisons still decide overlap, without rounding authorial UVs. */
export function createUvTriangleIndex(cellSize: number) {
  const all: UvTriangleBounds[] = []
  const large: UvTriangleBounds[] = []
  const buckets = new Map<string, UvTriangleBounds[]>()
  function keys(triangle: UvTriangleBounds): string[] | null {
    const min = triangle.min.map((n) => Math.floor(n / cellSize))
    const max = triangle.max.map((n) => Math.floor(n / cellSize))
    if (
      ![...min, ...max].every(Number.isSafeInteger) ||
      (max[0]! - min[0]! + 1) * (max[1]! - min[1]! + 1) > 256
    )
      return null
    const result: string[] = []
    for (let x = min[0]!; x <= max[0]!; x++)
      for (let y = min[1]!; y <= max[1]!; y++) result.push(`${x}:${y}`)
    return result
  }
  return {
    add(triangle: UvTriangleBounds) {
      all.push(triangle)
      const cells = keys(triangle)
      if (!cells) {
        large.push(triangle)
        return
      }
      for (const key of cells) {
        const bucket = buckets.get(key)
        if (bucket) bucket.push(triangle)
        else buckets.set(key, [triangle])
      }
    },
    overlaps(triangle: UvTriangleBounds) {
      const cells = keys(triangle)
      const candidates = cells
        ? new Set([...large, ...cells.flatMap((key) => buckets.get(key) ?? [])])
        : all
      for (const other of candidates)
        if (
          triangle.max[0] > other.min[0] &&
          other.max[0] > triangle.min[0] &&
          triangle.max[1] > other.min[1] &&
          other.max[1] > triangle.min[1] &&
          trianglesOverlap(triangle.points, other.points)
        )
          return true
      return false
    },
  }
}
