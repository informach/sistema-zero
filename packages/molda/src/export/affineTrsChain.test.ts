import { expect, test } from 'bun:test'
import { Matrix4, Quaternion as ThreeQuaternion, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import {
  type AffineMatrix,
  composeTransform,
  identityMatrix,
  quaternionFromEulerXYZ,
} from '../scene/matrix'
import { affineTrsChain } from './affineTrsChain'

function check(matrix: AffineMatrix) {
  const original: AffineMatrix = [...matrix]
  const chain = affineTrsChain(matrix)
  const reconstructed = new Matrix4()
  for (const transform of chain) {
    expect(Math.hypot(...transform.rotation)).toBeCloseTo(1, 14)
    reconstructed.multiply(
      new Matrix4().compose(
        new Vector3(...transform.translation),
        new ThreeQuaternion(...transform.rotation),
        new Vector3(...transform.scale),
      ),
    )
  }
  for (let c = 0; c < 3; c++) {
    const length = Math.hypot(matrix[c * 4]!, matrix[c * 4 + 1]!, matrix[c * 4 + 2]!)
    for (let r = 0; r < 3; r++) {
      const error = Math.abs(reconstructed.elements[c * 4 + r]! - matrix[c * 4 + r]!)
      expect(length === 0 ? error : error / length).toBeLessThanOrEqual(1e-12)
    }
  }
  expect(chain[0].translation).toEqual([matrix[12], matrix[13], matrix[14]])
  expect(matrix).toEqual(original)
  return chain
}

test('shear and reflections become a bounded two-node TRS chain without changing the authorial matrix', () => {
  for (const shear of [-7.123456789, -1, -0.001, 0, 0.001, 1, 7.123456789]) {
    for (const scale of [-3, 0, 1, 4]) {
      const matrix: AffineMatrix = [
        scale,
        0,
        0,
        0,
        shear,
        2,
        0,
        0,
        0.25,
        0.5,
        3,
        0,
        1.123456789123,
        Number.MIN_VALUE,
        -2.987654321,
        1,
      ]
      check(matrix)
      expect(affineTrsChain(matrix)).toEqual(affineTrsChain(matrix))
    }
  }
})

test('zero axes, rank-one/two matrices and full collapse retain their shape without fabricating a nonzero scale', () => {
  for (const scale of [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, -3],
    [-2, 0, 0],
    [-2, 0, 3],
    [1, 3, 0],
  ] as Vec3[]) {
    const matrix = composeTransform({
      kind: 'trs',
      translation: [3, -2, 1],
      rotation: quaternionFromEulerXYZ([34, -73, 123]),
      scale,
    })
    check(matrix)
  }
  check([1, 2, 3, 0, 2, 4, 6, 0, -3, -6, -9, 0, 0, 0, 0, 1])
  check([1, 2, 3, 0, 4, 5, 6, 0, 5, 7, 9, 0, 0, 0, 0, 1])
})

test('independent extreme axes and tiny values survive export factorization instead of being rounded to zero', () => {
  for (const scales of [
    [1e-150, 1e150, -1],
    [Number.MIN_VALUE, 2, 3],
    [1e-300, 1e-300, 1e-300],
  ] as Vec3[]) {
    const matrix = identityMatrix()
    matrix[0] = scales[0]
    matrix[5] = scales[1]
    matrix[10] = scales[2]
    matrix[12] = 1e200
    check(matrix)
  }
})

test('500 seeded affine products, including singular and reflected transforms, match an independent Three composition oracle', () => {
  let seed = 93
  function next() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
  function transform(singular: boolean) {
    return new Matrix4().compose(
      new Vector3(next() * 20, next() * 20, next() * 20),
      new ThreeQuaternion(...quaternionFromEulerXYZ([next() * 360, next() * 360, next() * 360])),
      new Vector3(
        (next() + 0.01) * (next() < 0.5 ? -10 : 10),
        singular ? 0 : next() * 10 + 0.1,
        next() * 5 + 0.1,
      ),
    )
  }
  for (let i = 0; i < 500; i++) {
    const matrix = transform(i % 7 === 0).multiply(transform(false))
    check([...matrix.elements] as AffineMatrix)
  }
})

test('invalid affine input and unrepresentable finite column norms fail explicitly', () => {
  for (const [i, value] of [
    [3, 0.1],
    [15, 0],
    [7, Infinity],
    [2, NaN],
  ] as const) {
    const matrix = identityMatrix()
    matrix[i] = value
    expect(() => affineTrsChain(matrix)).toThrow()
  }
  const huge = identityMatrix()
  huge[0] = Number.MAX_VALUE
  huge[1] = Number.MAX_VALUE
  expect(() => affineTrsChain(huge)).toThrow('precisão')
})
