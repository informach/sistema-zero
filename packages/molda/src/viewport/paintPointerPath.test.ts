import { expect, test } from 'bun:test'
import { MAX_PAINT_PATH_SAMPLES, paintPointerPath } from './paintPointerPath'

const rect = { left: 0, top: 0, right: 10, bottom: 10 }
const point = (clientX: number, clientY = 5) => ({ clientX, clientY })

test('synthetic positions follow the recorded segment and include the real endpoint exactly once', () => {
  expect([...paintPointerPath(point(0), point(9), rect, 4)]).toEqual([point(3), point(6), point(9)])
  const reverse = [...paintPointerPath(point(9), point(0), rect, 4)]
  expect(reverse).toHaveLength(3)
  for (const [i, x] of [6, 3, 0].entries()) expect(reverse[i]!.clientX).toBeCloseTo(x, 12)
  expect(reverse.at(-1)).toEqual(point(0))
  expect([...paintPointerPath(point(5), point(5), rect, 4)]).toEqual([point(5)])
  const diagonal = [...paintPointerPath(point(0, 0), point(10, 10), rect, 2)]
  expect(diagonal.at(-1)).toEqual(point(10, 10))
  expect(diagonal.every((p) => p.clientX === p.clientY)).toBe(true)
  expect(diagonal.slice(0, -1).every((p) => p.clientX > 0 && p.clientX < 10)).toBe(true)
})

test('clipping only limits synthetic work; exits, reentry and a fully external real endpoint survive', () => {
  for (const [from, to] of [
    [point(-1e9), point(1e9)],
    [point(1e9), point(-1e9)],
    [point(5), point(-1e9)],
    [point(-1e9), point(5)],
  ]) {
    const path = [...paintPointerPath(from!, to!, rect, 1)]
    expect(path.at(-1)).toEqual(to!)
    expect(path.length).toBeLessThanOrEqual(12)
    expect(
      path.slice(0, -1).every((p) => p.clientX >= 0 && p.clientX <= 10 && p.clientY === 5),
    ).toBe(true)
  }
  expect([...paintPointerPath(point(-10, -1), point(20, -1), rect, 1)]).toEqual([point(20, -1)])
  expect([...paintPointerPath(point(-1, 5), point(-1, 6), rect, 1)]).toEqual([point(-1, 6)])
})

test('the budget caps only generated positions and numeric extremes never create an unbounded loop', () => {
  const huge = { left: 0, top: 0, right: 100_000, bottom: 100_000 }
  const to = point(100_001, 100_001)
  const path = [...paintPointerPath(point(-1, -1), to, huge, 1)]
  expect(path.length).toBe(MAX_PAINT_PATH_SAMPLES + 1)
  expect(path.at(-1)).toEqual(to)
  expect(
    path
      .slice(0, -1)
      .every((p) => Number.isFinite(p.clientX) && p.clientX >= 0 && p.clientX <= 100_000),
  ).toBe(true)
  for (const value of [NaN, Infinity, -Infinity, Number.MAX_VALUE, -Number.MAX_VALUE]) {
    const result = [...paintPointerPath(point(-value), point(value), rect, value)]
    expect(result.length).toBeLessThanOrEqual(MAX_PAINT_PATH_SAMPLES + 1)
    expect(result.at(-1)).toEqual(point(value))
  }
  expect([...paintPointerPath(point(0), point(10), { ...rect, right: 0 }, 1)]).toEqual([point(10)])
})

test('yielded paths own their coordinates and do not revisit mutable caller fields', () => {
  const from = point(0),
    to = point(9),
    bounds = { ...rect }
  const path = paintPointerPath(from, to, bounds, 4)
  const first = path.next().value!
  expect(first).toEqual(point(3))
  Object.assign(first, { clientX: -100 })
  from.clientX = 100
  to.clientX = 999
  bounds.right = 0
  expect([...path]).toEqual([point(6), point(9)])
})
