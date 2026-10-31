import type { Vec3 } from '../core/model'
import type { Quaternion } from './matrix'

/**
 * Contas de giro dos movimentos de personagem. Eixos do personagem: X = esquerda, Y = cima,
 * Z = frente. Um giro "preso ao osso de cima" compõe como pai × filho.
 */
// ---- Giros (quatérnios [x, y, z, w]) ---------------------------------------------------------
export const DEG = Math.PI / 180
export const about = (axis: Vec3, degrees: number): Quaternion => {
  const half = (degrees * DEG) / 2
  const s = Math.sin(half)
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)]
}
export const X: Vec3 = [1, 0, 0]
export const Y: Vec3 = [0, 1, 0]
export const Z: Vec3 = [0, 0, 1]
export const IDENTITY: Quaternion = [0, 0, 0, 1]
/** a depois de b (b é aplicado primeiro). */
export function mul(a: Quaternion, b: Quaternion): Quaternion {
  const [x1, y1, z1, w1] = a
  const [x2, y2, z2, w2] = b
  return [
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
  ]
}
export const conjugate = ([x, y, z, w]: Quaternion): Quaternion => [-x, -y, -z, w]
export const unit = (q: Quaternion): Quaternion => {
  const n = Math.hypot(...q)
  return q.map((value) => value / n) as Quaternion
}
export const chain = (...turns: Quaternion[]) => turns.reduce((a, b) => mul(a, b), IDENTITY)
/** Menor giro que leva a direção `from` até `to`. */
export function arc(from: Vec3, to: Vec3): Quaternion {
  const a = normal(from)
  const b = normal(to)
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  if (d < -0.999999) return about(Math.abs(a[0]) < 0.9 ? X : Y, 180)
  const c: Vec3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  return unit([c[0], c[1], c[2], 1 + d])
}
export const normal = (a: Vec3): Vec3 => {
  const n = Math.hypot(...a) || 1
  return [a[0] / n, a[1] / n, a[2] / n]
}
/** Giro de uma matriz (colunas normalizadas: a escala do grupo não entra). */
export function rotationOf(m: ArrayLike<number>): Quaternion {
  const column = (i: number) => normal([m[i * 4]!, m[i * 4 + 1]!, m[i * 4 + 2]!])
  const [a, b, c] = [column(0), column(1), column(2)]
  const trace = a[0] + b[1] + c[2]
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1)
    return unit([(b[2] - c[1]) * s, (c[0] - a[2]) * s, (a[1] - b[0]) * s, 0.25 / s])
  }
  if (a[0] > b[1] && a[0] > c[2]) {
    const s = 2 * Math.sqrt(1 + a[0] - b[1] - c[2])
    return unit([0.25 * s, (b[0] + a[1]) / s, (c[0] + a[2]) / s, (b[2] - c[1]) / s])
  }
  if (b[1] > c[2]) {
    const s = 2 * Math.sqrt(1 + b[1] - a[0] - c[2])
    return unit([(b[0] + a[1]) / s, 0.25 * s, (c[1] + b[2]) / s, (c[0] - a[2]) / s])
  }
  const s = 2 * Math.sqrt(1 + c[2] - a[0] - b[1])
  return unit([(c[0] + a[2]) / s, (c[1] + b[2]) / s, 0.25 * s, (a[1] - b[0]) / s])
}
export function rotate(q: Quaternion, p: Vec3): Vec3 {
  const r = mul(mul(q, [p[0], p[1], p[2], 0]), conjugate(q))
  return [r[0], r[1], r[2]]
}

/** Caminho mais curto entre dois giros, de 0 (a) a 1 (b). */
export function slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
  const end = d < 0 ? (b.map((value) => -value) as Quaternion) : b
  d = Math.abs(d)
  if (d > 0.9995) return unit(a.map((value, i) => value + t * (end[i]! - value)) as Quaternion)
  const angle = Math.acos(d)
  const wa = Math.sin((1 - t) * angle) / Math.sin(angle)
  const wb = Math.sin(t * angle) / Math.sin(angle)
  return unit(a.map((value, i) => wa * value + wb * end[i]!) as Quaternion)
}

/** O mesmo giro, com o ângulo multiplicado (meia força, uma vez e meia). */
export function power(q: Quaternion, amount: number): Quaternion {
  const [x, y, z, w] = q[3] < 0 ? (q.map((value) => -value) as Quaternion) : q
  const half = Math.acos(Math.min(1, w))
  const s = Math.sin(half)
  if (s < 1e-9) return IDENTITY
  return about([x / s, y / s, z / s], (2 * half * amount) / DEG)
}

/** Giro por ângulos em graus, no espaço do personagem: torce (Y), dobra (X) e inclina (Z). */
export const turnOf = ([x, y, z]: Vec3): Quaternion => chain(about(Y, y), about(X, x), about(Z, z))

// ---- Vetores ----------------------------------------------------------------------------------
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const scale = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n]
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
