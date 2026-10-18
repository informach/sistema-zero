import { expect, test } from 'bun:test'
import type { Vec2 } from './document'
import { createUvTriangleIndex, trianglesOverlap, type UvTriangleBounds } from './meshUvOverlap'

test('the UV spatial index agrees with the exhaustive overlap check for small, large and extreme triangles', () => {
  let seed = 17
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 2 ** 32
  }
  const triangle = (x: number, y: number, size: number): UvTriangleBounds => {
    const points: Vec2[] = [
      [x, y],
      [x + size, y],
      [x, y + size],
    ]
    return { points, min: [x, y], max: [x + size, y + size] }
  }
  const all: UvTriangleBounds[] = []
  const index = createUvTriangleIndex(1)
  const check = (candidate: UvTriangleBounds) => {
    expect(index.overlaps(candidate)).toBe(
      all.some(
        (other) =>
          candidate.max[0] > other.min[0] &&
          other.max[0] > candidate.min[0] &&
          candidate.max[1] > other.min[1] &&
          other.max[1] > candidate.min[1] &&
          trianglesOverlap(candidate.points, other.points),
      ),
    )
  }
  for (let i = 0; i < 300; i++) {
    const candidate =
      i % 15 === 0
        ? triangle(10000 + i, 10000, 1000)
        : triangle(random() * 100 - 50, random() * 100 - 50, 0.1 + random() * 3)
    check(candidate)
    index.add(candidate)
    all.push(candidate)
    check(candidate)
    check(triangle(random() * 100 - 50, random() * 100 - 50, 0.1))
  }
  for (const candidate of [triangle(1e300, 1e300, 1e290), triangle(-1e300, -1e300, 1e290)]) {
    check(candidate)
    index.add(candidate)
    all.push(candidate)
    check(candidate)
  }
  const edge = triangle(-100, -100, 1)
  index.add(edge)
  all.push(edge)
  check(triangle(-99, -100, 1))
})
