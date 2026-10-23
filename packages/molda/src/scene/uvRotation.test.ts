import { expect, test } from 'bun:test'
import type { Vec2 } from './document'
import { prepareUvRotation } from './uvRotation'

test('free UV rotation preserves texel lengths and center on a rectangular texture', () => {
  const origin: Vec2 = [0.5, 0.5]
  const rotate = prepareUvRotation(37, origin, { width: 16, height: 8 })
  const before: Vec2[] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]
  const after = before.map(rotate)
  for (let i = 0; i < before.length; i++) {
    const a = after[i]!,
      b = after[(i + 1) % after.length]!
    expect(Math.hypot((a[0] - b[0]) * 16, (a[1] - b[1]) * 8)).toBeCloseTo(i % 2 === 0 ? 16 : 8, 10)
  }
  expect(after.reduce((sum, point) => sum + point[0] / 4, 0)).toBeCloseTo(0.5, 12)
  expect(after.reduce((sum, point) => sum + point[1] / 4, 0)).toBeCloseTo(0.5, 12)
  const edge: Vec2 = [(after[1]![0] - after[0]![0]) * 16, (after[1]![1] - after[0]![1]) * 8]
  expect((Math.atan2(edge[1], edge[0]) * 180) / Math.PI).toBeCloseTo(37, 10)
  const inverse = prepareUvRotation(-37, origin, { width: 16, height: 8 })
  for (const [i, uv] of after.map(inverse).entries())
    for (const [axis, value] of uv.entries()) expect(value).toBeCloseTo(before[i]![axis]!, 12)
})

test('whole turns are exact no-ops and quarter turns keep exact pixel coordinates', () => {
  for (const degrees of [0, 360, -360, 720])
    expect(prepareUvRotation(degrees, [0.5, 0.5], { width: 16, height: 8 })([0.125, 0.25])).toEqual(
      [0.125, 0.25],
    )
  expect(prepareUvRotation(90, [0.5, 0.5], { width: 16, height: 8 })([1, 1])).toEqual([0.25, 1.5])
})
