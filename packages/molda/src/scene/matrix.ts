/** Pure, column-major affine math. Canonical data uses numbers, not GPU TypedArrays. */
import type { Vec3 } from '../core/model'

export type Quaternion = [number, number, number, number]
export const UNIT_QUATERNION_TOLERANCE = 1e-6
export type AffineMatrix = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

/** One local transform. Affine retains shear that cannot be represented by TRS. */
export type SceneTransform =
  | { kind: 'trs'; translation: Vec3; rotation: Quaternion; scale: Vec3 }
  | { kind: 'affine'; matrix: AffineMatrix }

export function identityMatrix(): AffineMatrix {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

function finiteTuple(values: readonly number[], length: number): boolean {
  if (values.length !== length) return false
  // Iteration visits holes too; Array.every would accept a sparse canonical tuple.
  for (const value of values) if (!Number.isFinite(value)) return false
  return true
}

export function quaternionFromEulerXYZ([x, y, z]: Vec3): Quaternion {
  const halfRadians = Math.PI / 360
  return quaternionFromEulerHalfAngles(x * halfRadians, y * halfRadians, z * halfRadians, 'XYZ')
}

/** Radian input keeps the caller's source-unit conversion separate from rotation composition. */
export function quaternionFromEulerRadians([x, y, z]: Vec3, order: 'XYZ' | 'ZYX'): Quaternion {
  if (order !== 'XYZ' && order !== 'ZYX')
    throw new TypeError('A ordem de rotação precisa ser XYZ ou ZYX.')
  return quaternionFromEulerHalfAngles(x / 2, y / 2, z / 2, order)
}

function quaternionFromEulerHalfAngles(
  x: number,
  y: number,
  z: number,
  order: 'XYZ' | 'ZYX',
): Quaternion {
  const cx = Math.cos(x)
  const sx = Math.sin(x)
  const cy = Math.cos(y)
  const sy = Math.sin(y)
  const cz = Math.cos(z)
  const sz = Math.sin(z)
  if (order === 'ZYX')
    return [
      sx * cy * cz - cx * sy * sz,
      cx * sy * cz + sx * cy * sz,
      cx * cy * sz - sx * sy * cz,
      cx * cy * cz + sx * sy * sz,
    ]
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ]
}

export function composeTransform(transform: SceneTransform): AffineMatrix {
  if (transform.kind === 'affine') {
    const matrix = transform.matrix
    if (
      !finiteTuple(matrix, 16) ||
      matrix[3] !== 0 ||
      matrix[7] !== 0 ||
      matrix[11] !== 0 ||
      matrix[15] !== 1
    )
      throw new TypeError('A transformação precisa ser uma matriz afim finita.')
    return [...matrix]
  }
  const { translation: t, rotation: q, scale: s } = transform
  if (
    !finiteTuple(t, 3) ||
    !finiteTuple(q, 4) ||
    !finiteTuple(s, 3) ||
    Math.abs(Math.hypot(...q) - 1) > UNIT_QUATERNION_TOLERANCE
  )
    throw new TypeError('A transformação precisa de valores finitos e rotação unitária.')
  const [x, y, z, w] = q
  const xx = 2 * x * x
  const yy = 2 * y * y
  const zz = 2 * z * z
  const xy = 2 * x * y
  const xz = 2 * x * z
  const yz = 2 * y * z
  const wx = 2 * w * x
  const wy = 2 * w * y
  const wz = 2 * w * z
  const result: AffineMatrix = [
    (1 - yy - zz) * s[0],
    (xy + wz) * s[0],
    (xz - wy) * s[0],
    0,
    (xy - wz) * s[1],
    (1 - xx - zz) * s[1],
    (yz + wx) * s[1],
    0,
    (xz + wy) * s[2],
    (yz - wx) * s[2],
    (1 - xx - yy) * s[2],
    0,
    ...t,
    1,
  ]
  if (!result.every(Number.isFinite))
    throw new RangeError('A transformação excedeu o limite numérico.')
  return result
}

export function affineMultiply(a: Readonly<AffineMatrix>, b: Readonly<AffineMatrix>): AffineMatrix {
  const result = identityMatrix()
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      result[column * 4 + row] =
        (a[row] as number) * (b[column * 4] as number) +
        (a[4 + row] as number) * (b[column * 4 + 1] as number) +
        (a[8 + row] as number) * (b[column * 4 + 2] as number) +
        (column === 3 ? (a[12 + row] as number) : 0)
    }
  }
  if (!result.every(Number.isFinite))
    throw new RangeError('A transformação excedeu o limite numérico.')
  return result
}

/** Null for singular/ill-conditioned transforms; never fabricate an identity inverse. */
export function affineInverse(m: Readonly<AffineMatrix>): AffineMatrix | null {
  const [a, d, g, , b, e, h, , c, f, i] = m
  const determinant = affineDeterminant(m)
  const volume = Math.hypot(a, d, g) * Math.hypot(b, e, h) * Math.hypot(c, f, i)
  if (!Number.isFinite(determinant) || Math.abs(determinant) <= volume * 1e-12) return null
  const result: AffineMatrix = [
    (e * i - f * h) / determinant,
    (f * g - d * i) / determinant,
    (d * h - e * g) / determinant,
    0,
    (c * h - b * i) / determinant,
    (a * i - c * g) / determinant,
    (b * g - a * h) / determinant,
    0,
    (b * f - c * e) / determinant,
    (c * d - a * f) / determinant,
    (a * e - b * d) / determinant,
    0,
    0,
    0,
    0,
    1,
  ]
  const offset = transformDirection(result, [m[12], m[13], m[14]])
  result[12] = -offset[0]
  result[13] = -offset[1]
  result[14] = -offset[2]
  return result.every(Number.isFinite) ? result : null
}

/** Orientation includes negative scales and procedural mirrors, not just a mirror flag. */
export function affineDeterminant(m: Readonly<AffineMatrix>): number {
  const [a, d, g, , b, e, h, , c, f, i] = m
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
}

/** Also accepts legacy Float64Array and derived GPU buffers, without making copies. */
export function transformPoint(m: ArrayLike<number>, [x, y, z]: Vec3): Vec3 {
  return [
    (m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z + (m[12] as number),
    (m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z + (m[13] as number),
    (m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z + (m[14] as number),
  ]
}

/** Directions are not normals when there is scale/shear; use transformNormal for those. */
export function transformDirection(m: ArrayLike<number>, [x, y, z]: Vec3): Vec3 {
  return [
    (m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z,
    (m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z,
    (m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z,
  ]
}

export function transformNormal(m: Readonly<AffineMatrix>, [x, y, z]: Vec3): Vec3 | null {
  const inverse = affineInverse(m)
  if (!inverse) return null
  const normal: Vec3 = [
    inverse[0] * x + inverse[1] * y + inverse[2] * z,
    inverse[4] * x + inverse[5] * y + inverse[6] * z,
    inverse[8] * x + inverse[9] * y + inverse[10] * z,
  ]
  const length = Math.hypot(...normal)
  return length > 0 && Number.isFinite(length)
    ? [normal[0] / length, normal[1] / length, normal[2] / length]
    : null
}
