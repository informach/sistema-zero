import type { Transformacao } from './documento'

/** Pré-compõe um giro no Y do mundo, conservando a convenção Euler XYZ do documento. */
export function girarNaVertical(
  r: Transformacao['rotacao'],
  angulo: number,
): Transformacao['rotacao'] {
  if (![r.x, r.y, r.z, angulo].every(Number.isFinite))
    throw new RangeError('O giro precisa ter valores finitos')
  if (r.x === 0 && r.z === 0) return { ...r, y: r.y + angulo }
  const c1 = Math.cos(r.x / 2),
    c2 = Math.cos(r.y / 2),
    c3 = Math.cos(r.z / 2)
  const s1 = Math.sin(r.x / 2),
    s2 = Math.sin(r.y / 2),
    s3 = Math.sin(r.z / 2)
  const qx = s1 * c2 * c3 + c1 * s2 * s3,
    qy = c1 * s2 * c3 - s1 * c2 * s3
  const qz = c1 * c2 * s3 + s1 * s2 * c3,
    qw = c1 * c2 * c3 - s1 * s2 * s3
  const c = Math.cos(angulo / 2),
    s = Math.sin(angulo / 2)
  let x = c * qx + s * qz,
    y = c * qy + s * qw,
    z = c * qz - s * qx,
    w = c * qw - s * qy
  const tamanho = Math.hypot(x, y, z, w)
  x /= tamanho
  y /= tamanho
  z /= tamanho
  w /= tamanho
  const m13 = 2 * (x * z + y * w)
  const ry = Math.asin(Math.max(-1, Math.min(1, m13)))
  if (Math.abs(m13) < 0.9999999)
    return {
      x: Math.atan2(-2 * (y * z - x * w), 1 - 2 * (x * x + y * y)),
      y: ry,
      z: Math.atan2(-2 * (x * y - z * w), 1 - 2 * (y * y + z * z)),
    }
  return { x: Math.atan2(2 * (y * z + x * w), 1 - 2 * (x * x + z * z)), y: ry, z: 0 }
}
