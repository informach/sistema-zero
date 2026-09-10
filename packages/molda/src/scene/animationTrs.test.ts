import { expect, test } from 'bun:test'
import type { SceneAnimationLocalPose } from './animationPose'
import { animationTrs } from './animationTrs'
import { type AffineMatrix, composeTransform, quaternionFromEulerXYZ } from './matrix'

test('derived TRS decomposition preserves reference scale signs across every quaternion branch', () => {
  for (const angles of [
    [12.123456789, 23, 34],
    [170, 0, 0],
    [0, 170, 0],
    [0, 0, 170],
    [-179, 64, 72],
  ] as [number, number, number][]) {
    for (const signs of [
      [1, 1, 1],
      [-1, 1, 1],
      [1, -1, 1],
      [-1, -1, -1],
    ] as const) {
      const reference: SceneAnimationLocalPose = {
        space: 'local-delta',
        translation: [1.123456789123, -2, 3],
        rotation: quaternionFromEulerXYZ(angles),
        scale: [signs[0] * 2, signs[1] * 3, signs[2] * 4],
      }
      const matrix = composeTransform({ kind: 'trs', ...reference }),
        original = structuredClone(reference)
      const next = animationTrs(matrix, reference)
      const actual = composeTransform({ kind: 'trs', ...next })
      for (let i = 0; i < 16; i++) expect(actual[i]).toBeCloseTo(matrix[i]!, 12)
      expect(next.scale.map(Math.sign)).toEqual([...signs])
      expect(next.translation).toEqual(reference.translation)
      expect(reference).toEqual(original)
    }
  }
})

test('shear, perspective, handedness flips and zero scales are refused instead of approximating a rotation', () => {
  const reference: SceneAnimationLocalPose = {
    space: 'local-delta',
    translation: [1e200, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  }
  const original = composeTransform({ kind: 'trs', ...reference })
  for (const [index, value] of [
    [4, 1e-10],
    [3, 0.1],
    [0, -1],
    [0, 0],
    [0, NaN],
  ] as const) {
    const matrix: AffineMatrix = [...original]
    matrix[index] = value
    expect(() => animationTrs(matrix, reference)).toThrow()
  }
  // A huge neighboring scale must not hide shear in a tiny axis.
  const matrix: AffineMatrix = [1e200, 0, 0, 0, 1e-10, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  expect(() => animationTrs(matrix, reference)).toThrow('inclinaria')
})
