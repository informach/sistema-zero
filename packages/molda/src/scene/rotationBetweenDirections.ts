import type { Vec3 } from '../core/model'
import type { Quaternion } from './matrix'
import { requireScene, tuple } from './validation'

function unit(input: Vec3): Vec3 {
  const value = tuple(input, 3, 'direction'),
    length = Math.hypot(...value)
  requireScene(
    length > 0 && Number.isFinite(length),
    'direction',
    'A direção precisa ter comprimento finito maior que zero.',
  )
  return [value[0]! / length, value[1]! / length, value[2]! / length]
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

/** Shortest rotation, with a deterministic axis for the exactly opposite direction. */
export function rotationBetweenDirections(from: Vec3, to: Vec3): Quaternion {
  const a = unit(from),
    b = unit(to),
    normal = cross(a, b),
    sine = Math.hypot(...normal),
    cosine = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  if (sine === 0) {
    if (cosine >= 0) return [0, 0, 0, 1]
    let index = 0
    for (let i = 1; i < 3; i++) if (Math.abs(a[i]!) < Math.abs(a[index]!)) index = i
    const basis: Vec3 = [0, 0, 0]
    basis[index] = 1
    const axis = unit(cross(a, basis))
    return [axis[0], axis[1], axis[2], 0]
  }
  // acos(dot) loses the small transverse component near parallel/opposite directions.
  const half = Math.atan2(sine, cosine) / 2,
    weight = Math.sin(half)
  return [
    (normal[0] / sine) * weight,
    (normal[1] / sine) * weight,
    (normal[2] / sine) * weight,
    Math.cos(half),
  ]
}
