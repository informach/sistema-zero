import { describe, expect, test } from 'bun:test'
import { Euler, Matrix3, Matrix4, Quaternion, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  quaternionFromEulerRadians,
  quaternionFromEulerXYZ,
  transformNormal,
  transformPoint,
} from './matrix'

function near(actual: ArrayLike<number>, expected: ArrayLike<number>, epsilon = 1e-9): void {
  expect(actual.length).toBe(expected.length)
  for (let i = 0; i < actual.length; i += 1) {
    expect(Math.abs((actual[i] ?? 0) - (expected[i] ?? 0))).toBeLessThan(epsilon)
  }
}

describe('scene affine transforms', () => {
  /**
   * A conversão de graus não pode mudar de resultado num refactor. Era um SHA-256 dos bits
   * dos 4.000 Float64, e isso NÃO se sustenta: `Math.sin`/`Math.cos` têm precisão definida
   * pela implementação, e o Bun do Windows e o do Linux divergem no último bit — o golden
   * gravado aqui reprovou na primeira vez que este arquivo rodou no CI (Linux). O que vale
   * é a propriedade: a mesma matemática do oráculo independente, dentro de poucos ULP.
   */
  test('degree XYZ keeps matching the independent oracle across 1000 deterministic rotations', () => {
    for (let i = 0; i < 1000; i++) {
      const degrees: Vec3 = [i * 1.123, -i * 2.347, 89.99 + i / 7]
      const rotation = quaternionFromEulerXYZ(degrees)
      const radians = degrees.map((value) => (value * Math.PI) / 180) as unknown as Vec3
      near(rotation, new Quaternion().setFromEuler(new Euler(...radians, 'XYZ')).toArray(), 1e-12)
      expect(Math.abs(Math.hypot(...rotation) - 1)).toBeLessThan(1e-14)
    }
  })
  test('explicit XYZ/ZYX radian rotation matches the independent Three oracle', () => {
    expect(() => quaternionFromEulerRadians([0, 0, 0], JSON.parse('"ZXY"'))).toThrow(TypeError)
    for (const order of ['XYZ', 'ZYX'] as const) {
      for (let i = 0; i < 200; i++) {
        const radians: Vec3 = [i / 13 - 7, i / 29, -i / 37]
        const original: Vec3 = [...radians]
        const rotation = quaternionFromEulerRadians(radians, order)
        near(rotation, new Quaternion().setFromEuler(new Euler(...radians, order)).toArray(), 1e-14)
        expect(Math.abs(Math.hypot(...rotation) - 1)).toBeLessThan(1e-14)
        expect(radians).toEqual(original)
      }
    }
  })
  test('TRS matches an independent implementation without snapping imported angles', () => {
    for (let i = 0; i < 100; i += 1) {
      const angles: Vec3 = [i * 1.123, i * -2.347, 89.99 + i / 7]
      const translation: Vec3 = [i / 13, -i / 17, 0.12345]
      const scale: Vec3 = [i % 2 ? -2 : 0.5, 1 + i / 10, 0.001]
      const rotation = quaternionFromEulerXYZ(angles)
      const [rx, ry, rz] = angles.map((value) => (value * Math.PI) / 180)
      const expectedRotation = new Quaternion().setFromEuler(new Euler(rx, ry, rz, 'XYZ'))
      near(rotation, expectedRotation.toArray())
      const matrix = composeTransform({ kind: 'trs', translation, rotation, scale })
      const expected = new Matrix4().compose(
        new Vector3(...translation),
        expectedRotation,
        new Vector3(...scale),
      )
      near(matrix, expected.elements)
      near(affineInverse(matrix) ?? [], expected.clone().invert().elements, 1e-7)
      near(affineMultiply(matrix, affineInverse(matrix) ?? identityMatrix()), identityMatrix())
      near(transformPoint(matrix, [1, 2, 3]), new Vector3(1, 2, 3).applyMatrix4(expected).toArray())
    }
  })

  test('nested rotated non-uniform scales preserve shear and normals', () => {
    const a = composeTransform({
      kind: 'trs',
      translation: [1, 2, 3],
      rotation: quaternionFromEulerXYZ([12.3, 34.56, 78.9]),
      scale: [-2, 3, 0.25],
    })
    const b = composeTransform({
      kind: 'trs',
      translation: [-4, 5, 2],
      rotation: quaternionFromEulerXYZ([0, 47.8, 0]),
      scale: [1, 2, 3],
    })
    const matrix = affineMultiply(a, b)
    const expected = new Matrix4().fromArray(a).multiply(new Matrix4().fromArray(b))
    near(matrix, expected.elements)
    near(affineInverse(matrix) ?? [], expected.clone().invert().elements)
    near(
      transformNormal(matrix, [0, 0, 1]) ?? [],
      new Vector3(0, 0, 1).applyNormalMatrix(new Matrix3().getNormalMatrix(expected)).toArray(),
    )
    const before: AffineMatrix = [...matrix]
    const copy = composeTransform({ kind: 'affine', matrix })
    expect(copy).not.toBe(matrix)
    expect(copy).toEqual(before)
  })

  test('inverse rejects singular transforms but accepts tiny well-conditioned scales', () => {
    const singular: AffineMatrix = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    expect(affineInverse(singular)).toBeNull()
    expect(transformNormal(singular, [0, 1, 0])).toBeNull()
    const tiny = composeTransform({
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1e-9, -1e-9, 1e-9],
    })
    near(affineMultiply(tiny, affineInverse(tiny) ?? identityMatrix()), identityMatrix())
  })

  test('invalid canonical transforms are refused, never repaired on read', () => {
    expect(() =>
      composeTransform({
        kind: 'trs',
        translation: [0, 0, 0],
        rotation: [0, 0, 0, 0],
        scale: [1, 1, 1],
      }),
    ).toThrow()
    expect(() =>
      composeTransform({
        kind: 'trs',
        translation: [Number.NaN, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      }),
    ).toThrow()
    const perspective = identityMatrix()
    perspective[3] = 1
    expect(() => composeTransform({ kind: 'affine', matrix: perspective })).toThrow()
    const sparse = identityMatrix()
    Reflect.deleteProperty(sparse, '2')
    expect(() => composeTransform({ kind: 'affine', matrix: sparse })).toThrow()
    expect(() =>
      composeTransform({
        kind: 'trs',
        translation: [0, 0, 0],
        rotation: [0, 0, 0, 1.0000001],
        scale: [1, 1, 1],
      }),
    ).not.toThrow()
  })
})
