import { expect, test } from 'bun:test'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { solveTwoBoneReach, type TwoBoneReachInput } from './twoBoneReach'

const straight: TwoBoneReachInput = {
  root: [0, 0, 0],
  middle: [1, 0, 0],
  tip: [2, 0, 0],
  target: [1, 1, 0],
  hint: [0, 1, 0],
}
function separation(a: Vec3, b: Vec3) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}
function lengths(input: TwoBoneReachInput) {
  const result = solveTwoBoneReach(input)
  expect(separation(result.middle, input.root) / separation(input.middle, input.root)).toBeCloseTo(
    1,
    12,
  )
  expect(separation(result.tip, result.middle) / separation(input.tip, input.middle)).toBeCloseTo(
    1,
    12,
  )
  return result
}

test('reachable target and hint choose the bend without stretching, and all returned data is owned', () => {
  const input = structuredClone(straight),
    source = structuredClone(input),
    result = lengths(input)
  expect(result.status).toBe('reached')
  expect(result.bend).toBe('hint')
  expect(result.direction).toBe('target')
  expect(result.tip).toEqual([1, 1, 0])
  for (const [i, value] of [0, 1, 0].entries()) expect(result.middle[i]!).toBeCloseTo(value, 12)
  result.middle[0] = 999
  result.tip[0] = 999
  expect(input).toEqual(source)
  const opposite = lengths({ ...straight, hint: [1, 0, 0] })
  expect(opposite.middle[0]).toBeCloseTo(1, 12)
  expect(opposite.middle[1]).toBeCloseTo(0, 12)
})

test('unreachable targets report the outer and inner reach boundaries instead of changing lengths', () => {
  for (const second of [1, 3]) {
    const source: TwoBoneReachInput = { ...straight, tip: [1 + second, 0, 0] },
      far = lengths({ ...source, target: [100, 0, 0] })
    expect(far.status).toBe('too-far')
    expect(far.tip).toEqual([1 + second, 0, 0])
    const close = lengths({ ...source, target: [0.1, 0, 0] })
    expect(close.status).toBe(second === 1 ? 'reached' : 'too-close')
    expect(close.tip[0]).toBeCloseTo(second === 1 ? 0.1 : 2, 12)
    if (second === 3) expect(close.middle[0]).toBeCloseTo(-1, 12)
  }
})

test('coincident targets, straight chains and absent or parallel hints resolve deterministically', () => {
  const folded = lengths({ ...straight, target: [0, 0, 0] })
  expect(folded.tip).toEqual([0, 0, 0])
  expect(folded.middle).toEqual([0, 1, 0])
  expect(folded.direction).toBe('pose')
  const pose: TwoBoneReachInput = {
      ...straight,
      middle: [0, 1, 0],
      tip: [1, 1, 0],
      target: [1, 0, 0],
      hint: [10, 0, 0],
    },
    kept = lengths(pose)
  expect(kept.bend).toBe('pose')
  expect(kept.middle[1]).toBeGreaterThan(0)
  const axis = lengths({ ...straight, target: [1, 0, 0], hint: [0, 0, 0] })
  expect(axis.bend).toBe('axis')
  expect(axis.middle[1]).toBeGreaterThan(0)
  expect(axis.middle[2]).toBe(0)
  expect(solveTwoBoneReach({ ...straight, target: [1, 0, 0], hint: [100, 0, 0] })).toEqual(axis)
  const unchanged: TwoBoneReachInput = { ...pose, hint: undefined, target: [...pose.tip] },
    result = solveTwoBoneReach(unchanged)
  expect(result.middle).toEqual(unchanged.middle)
  expect(result.tip).toEqual(unchanged.tip)
  expect(result.middle).not.toBe(unchanged.middle)
  expect(result.tip).not.toBe(unchanged.tip)
})

test('law-of-cosines solution is covariant under rigid/reflected uniform transforms and wide numeric scales', () => {
  for (let i = 1; i <= 128; i++) {
    const angle = i * 0.17,
      input: TwoBoneReachInput = {
        root: [0, 0, 0],
        middle: [1, 0, 0],
        tip: [2.5, 0, 0],
        target: [
          Math.cos(angle) * (0.6 + (i % 18) / 10),
          Math.sin(angle) * (0.6 + (i % 18) / 10),
          0,
        ],
        hint: [0, 0, 1],
      },
      result = lengths(input),
      scale = (i % 2 ? -1 : 1) * (0.25 + i / 10),
      matrix = new Matrix4().compose(
        new Vector3(3, -7, 11),
        new Quaternion().setFromEuler(new Euler(angle, angle / 3, -angle / 2)),
        new Vector3(scale, scale, scale),
      ),
      transformed = (value: Vec3): Vec3 => new Vector3(...value).applyMatrix4(matrix).toArray(),
      next = lengths({
        root: transformed(input.root),
        middle: transformed(input.middle),
        tip: transformed(input.tip),
        target: transformed(input.target),
        hint: transformed(input.hint!),
      })
    expect(next.status).toBe('reached')
    const expected = transformed(result.middle)
    for (let axis = 0; axis < 3; axis++) expect(next.middle[axis]!).toBeCloseTo(expected[axis]!, 10)
  }
  for (const scale of [1e-150, 1e-100, 1e100, 1e150]) {
    const scaled = (point: Vec3) => point.map((value) => value * scale) as Vec3,
      result = lengths({
        root: scaled(straight.root),
        middle: scaled(straight.middle),
        tip: scaled(straight.tip),
        target: scaled(straight.target),
        hint: scaled(straight.hint!),
      })
    expect(result.middle[0] / scale).toBeCloseTo(0, 12)
    expect(result.middle[1] / scale).toBeCloseTo(1, 12)
    expect(result.tip).toEqual(scaled(straight.target))
  }
})

test('invalid, zero-length and numerically unresolvable chains refuse without repairing the source', () => {
  for (const patch of [
    { middle: [0, 0, 0] },
    { tip: [1, 0, 0] },
    { target: [Number.NaN, 0, 0] },
    { hint: [Number.POSITIVE_INFINITY, 0, 0] },
    { root: [-1.7e308, 0, 0], middle: [1.7e308, 0, 0] },
    {
      root: [1e16, 0, 0],
      middle: [1e16 + 2, 0, 0],
      tip: [1e16 + 4, 0, 0],
      target: [1e16, 1, 0],
      hint: [1e16 + 2, 0, 0],
    },
  ] satisfies Partial<TwoBoneReachInput>[]) {
    const input = { ...straight, ...patch },
      source = structuredClone(input)
    expect(() => solveTwoBoneReach(input)).toThrow()
    expect(input).toEqual(source)
  }
  const extra = { ...straight, extra: true }
  expect(() => solveTwoBoneReach(extra)).toThrow('Campo desconhecido')
})

test('unequal lengths and almost folded or extended targets retain both distances without iterative drift', () => {
  for (let i = 1; i <= 192; i++) {
    const first = 0.5 + (i % 19) * 0.37,
      second = 0.5 + (i % 23) * 0.29,
      minimum = Math.abs(first - second),
      maximum = first + second,
      fraction = [0, 1e-12, 0.2, 0.5, 1 - 1e-12, 1][i % 6]!,
      distance = minimum + (maximum - minimum) * fraction,
      angle = i * 0.1,
      input: TwoBoneReachInput = {
        root: [0, 0, 0],
        middle: [first, 0, 0],
        tip: [first + second, 0, 0],
        target: [distance * Math.cos(angle), distance * Math.sin(angle), 0],
        hint: [0, 0, 1],
      },
      result = lengths(input)
    expect(result.middle[2]).toBeGreaterThanOrEqual(0)
    expect(separation(result.tip, input.target) / maximum).toBeLessThan(1e-12)
    expect(solveTwoBoneReach(input)).toEqual(result)
  }
  const nearParallel = lengths({ ...straight, target: [1, 0, 0], hint: [1, 1e-18, 0] })
  expect(nearParallel.bend).toBe('axis')
  const usable = lengths({ ...straight, target: [1, 0, 0], hint: [1, 1e-10, 0] })
  expect(usable.bend).toBe('hint')
})
