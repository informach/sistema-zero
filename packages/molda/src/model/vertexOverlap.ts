import type { Vec3 } from '../core/model'
import { length, sub } from './vec'

/** Spatial broad phase; exact distance and original i/j ordering remain unchanged. */
export function overlappingVertices(
  vertices: Record<string, Vec3>,
  epsilon: number,
): Array<[string, string]> {
  const entries = Object.entries(vertices)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let finite = true
  for (const [, point] of entries) {
    for (let axis = 0; axis < 3; axis += 1) {
      const n = point[axis]!
      finite &&= Number.isFinite(n)
      min[axis] = Math.min(min[axis]!, n)
      max[axis] = Math.max(max[axis]!, n)
    }
  }
  let axis = 0
  for (let candidate = 1; candidate < 3; candidate += 1) {
    if (max[candidate]! - min[candidate]! > max[axis]! - min[axis]!) axis = candidate
  }
  const ordered = entries.map(([, point], index) => ({ point, index }))
  if (finite) ordered.sort((a, b) => a.point[axis]! - b.point[axis]! || a.index - b.index)
  const pairs: Array<[number, number]> = []
  for (let i = 0; i < ordered.length; i += 1) {
    const a = ordered[i]!
    for (let j = i + 1; j < ordered.length; j += 1) {
      const b = ordered[j]!
      // Sorted sweep along the widest axis. No coordinate quantization or string keys.
      if (finite && b.point[axis]! - a.point[axis]! > epsilon) break
      // NaN retains the former <= comparison semantics.
      if (length(sub(a.point, b.point)) <= epsilon) {
        pairs.push(a.index < b.index ? [a.index, b.index] : [b.index, a.index])
      }
    }
  }
  pairs.sort(([ai, aj], [bi, bj]) => ai - bi || aj - bj)
  return pairs.map(([i, j]) => [entries[i]![0], entries[j]![0]])
}
