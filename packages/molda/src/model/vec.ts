/**
 * Álgebra de `Vec3` compartilhada pela base das faces (`frame.ts`), pela malha
 * (`mesh.ts`, `meshFrame.ts`) e pela geometria. Fica num módulo sem dependências
 * para nenhum deles importar o outro em ciclo.
 */
import type { Vec3 } from '../core/model'

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2])
}

export function normalize(v: Vec3): Vec3 {
  const size = length(v) || 1
  return [v[0] / size, v[1] / size, v[2] / size]
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

/** Scale before the cross product so small authorial triangles do not underflow. */
export function triangleUnitNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = sub(b, a)
  const ac = sub(c, a)
  const extent = Math.max(...ab.map(Math.abs), ...ac.map(Math.abs))
  if (extent === 0) return [0, 0, 0]
  return normalize(
    cross(
      [ab[0] / extent, ab[1] / extent, ab[2] / extent],
      [ac[0] / extent, ac[1] / extent, ac[2] / extent],
    ),
  )
}

export function scale(v: Vec3, k: number): Vec3 {
  return [v[0] * k, v[1] * k, v[2] * k]
}
