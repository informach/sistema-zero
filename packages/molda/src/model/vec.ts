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

export function scale(v: Vec3, k: number): Vec3 {
  return [v[0] * k, v[1] * k, v[2] * k]
}

export function vecEquals(a: Vec3, b: Vec3, eps = 0): boolean {
  return (
    Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps && Math.abs(a[2] - b[2]) <= eps
  )
}
