import { expect, test } from 'bun:test'
import { Quaternion, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { rotationBetweenDirections } from './rotationBetweenDirections'

test('shortest rotations preserve directions near parallel/opposite, across magnitude, and have deterministic exact half turns', () => {
  const samples: Vec3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [1, 1e-10, 0],
    [-1, 1e-10, 0],
    [1, 2, -3],
  ]
  for (const from of samples)
    for (const to of samples)
      for (const scale of [1e-150, 1, 1e150]) {
        const a = from.map((n) => n * scale) as Vec3,
          b = to.map((n) => n / scale) as Vec3,
          rotation = rotationBetweenDirections(a, b),
          q = new Quaternion().fromArray(rotation),
          actual = new Vector3(...from).normalize().applyQuaternion(q),
          expected = new Vector3(...to).normalize()
        expect(q.length()).toBeCloseTo(1, 14)
        expect(actual.distanceTo(expected)).toBeLessThan(2e-15)
        expect(rotationBetweenDirections(a, b)).toEqual(rotation)
        if (a.every((n, i) => n === b[i])) expect(rotation).toEqual([0, 0, 0, 1])
      }
  expect(rotationBetweenDirections([Number.MIN_VALUE, 0, 0], [0, Number.MIN_VALUE, 0])).toEqual(
    rotationBetweenDirections([1, 0, 0], [0, 1, 0]),
  )
})

test('invalid and overflowing direction magnitudes refuse without mutating either input', () => {
  const good: Vec3 = [1, 2, 3]
  for (const bad of [
    [0, 0, 0],
    [NaN, 1, 0],
    [Infinity, 0, 0],
    [Number.MAX_VALUE, Number.MAX_VALUE, 0],
  ] as Vec3[]) {
    expect(() => rotationBetweenDirections(good, bad)).toThrow()
    expect(() => rotationBetweenDirections(bad, good)).toThrow()
    expect(good).toEqual([1, 2, 3])
  }
})
