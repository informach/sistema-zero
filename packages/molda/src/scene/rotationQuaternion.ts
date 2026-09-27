import type { Vec3 } from '../core/model'
import type { Quaternion } from './matrix'

/** Unit quaternion from an already validated right-handed orthonormal derived basis. */
export function rotationQuaternion(x: Vec3, y: Vec3, z: Vec3): Quaternion {
  const [m11, m21, m31] = x,
    [m12, m22, m32] = y,
    [m13, m23, m33] = z
  const trace = m11 + m22 + m33
  let rotation: Quaternion
  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1)
    rotation = [(m32 - m23) / s, (m13 - m31) / s, (m21 - m12) / s, s / 4]
  } else if (m11 > m22 && m11 > m33) {
    const s = 2 * Math.sqrt(1 + m11 - m22 - m33)
    rotation = [s / 4, (m12 + m21) / s, (m13 + m31) / s, (m32 - m23) / s]
  } else if (m22 > m33) {
    const s = 2 * Math.sqrt(1 + m22 - m11 - m33)
    rotation = [(m12 + m21) / s, s / 4, (m23 + m32) / s, (m13 - m31) / s]
  } else {
    const s = 2 * Math.sqrt(1 + m33 - m11 - m22)
    rotation = [(m13 + m31) / s, (m23 + m32) / s, s / 4, (m21 - m12) / s]
  }
  const length = Math.hypot(...rotation)
  if (!Number.isFinite(length) || length === 0) throw new RangeError('Base de rotação inválida.')
  return rotation.map((value) => value / length) as Quaternion
}
