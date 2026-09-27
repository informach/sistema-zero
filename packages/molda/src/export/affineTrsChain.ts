import type { Vec3 } from '../core/model'
import {
  type AffineMatrix,
  affineMultiply,
  composeTransform,
  type SceneTransform,
} from '../scene/matrix'
import { rotationQuaternion } from '../scene/rotationQuaternion'
import { requireScene } from '../scene/validation'

type Trs = Extract<SceneTransform, { kind: 'trs' }>
const tolerance = 1e-12
const failure =
  'Esses eixos não puderam ser convertidos para GLB com precisão. O projeto original continua intacto.'
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
function unit(a: Vec3): Vec3 {
  const length = Math.hypot(...a)
  requireScene(length > 0 && Number.isFinite(length), 'transform', failure)
  return a.map((n) => n / length) as Vec3
}
function rotate(columns: Vec3[], p: number, q: number, c: number, s: number) {
  const a = columns[p]!,
    b = columns[q]!
  columns[p] = a.map((n, i) => c * n - s * b[i]!) as Vec3
  columns[q] = a.map((n, i) => s * n + c * b[i]!) as Vec3
}

/**
 * Export-only factorization A = U S Vᵀ: two legal glTF TRS nodes retain an affine
 * local transform (including shear). Never replace authorial data with this chain.
 * One-sided Jacobi rotates columns without forming AᵀA, then checks reconstruction
 * per source column. Singular bases are completed only in their zero-scale axes.
 */
export function affineTrsChain(matrix: AffineMatrix): readonly [Trs, Trs] {
  composeTransform({ kind: 'affine', matrix })
  const b: Vec3[] = [0, 1, 2].map((i) => [matrix[i * 4]!, matrix[i * 4 + 1]!, matrix[i * 4 + 2]!])
  const v: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  for (let sweep = 0; sweep < 32; sweep++) {
    let changed = false
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      const left = b[p]!,
        right = b[q]!
      const lp = Math.hypot(...left),
        lq = Math.hypot(...right)
      requireScene(Number.isFinite(lp) && Number.isFinite(lq), 'transform', failure)
      if (lp === 0 || lq === 0) continue
      const correlation = dot(unit(left), unit(right))
      if (Math.abs(correlation) <= 8 * Number.EPSILON) continue
      const magnitude = Math.max(lp, lq),
        a = lp / magnitude,
        d = lq / magnitude
      const g = correlation * a * d,
        difference = d * d - a * a
      const denominator = difference + (difference < 0 ? -1 : 1) * Math.hypot(difference, 2 * g)
      if (g === 0 || denominator === 0) continue
      const t = (2 * g) / denominator,
        c = 1 / Math.hypot(1, t),
        s = c * t
      rotate(b, p, q, c, s)
      rotate(v, p, q, c, s)
      changed = true
    }
    if (!changed) break
  }
  const scales = b.map((column) => Math.hypot(...column)) as Vec3
  const largest = Math.max(...scales)
  const axes = b.map((column, i): Vec3 => (scales[i] === 0 ? [0, 0, 0] : unit(column)))
  // Numerical null-space residuals can be removed only when reconstruction below
  // proves the source columns survive; a tiny independent source axis cannot vanish.
  for (let p = 0; p < 3; p++)
    for (let q = p + 1; q < 3; q++) {
      if (Math.abs(dot(axes[p]!, axes[q]!)) <= tolerance) continue
      const small = scales[p]! <= scales[q]! ? p : q
      requireScene(scales[small]! <= largest * 64 * Number.EPSILON, 'transform', failure)
      scales[small] = 0
      axes[small] = [0, 0, 0]
    }
  const alive = [0, 1, 2].filter((i) => scales[i] !== 0)
  if (alive.length === 0) axes.splice(0, 3, [1, 0, 0], [0, 1, 0], [0, 0, 1])
  else if (alive.length === 1) {
    const i = alive[0]!,
      axis = axes[i]!
    const candidates: Vec3[] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    const reference = candidates.reduce((best, next) =>
      Math.abs(dot(next, axis)) < Math.abs(dot(best, axis)) ? next : best,
    )
    const projection = dot(reference, axis)
    axes[(i + 1) % 3] = unit(reference.map((n, j) => n - projection * axis[j]!) as Vec3)
    axes[(i + 2) % 3] = unit(cross(axis, axes[(i + 1) % 3]!))
  } else if (alive.length === 2) {
    const missing = [0, 1, 2].find((i) => scales[i] === 0)!
    axes[missing] = unit(cross(axes[(missing + 1) % 3]!, axes[(missing + 2) % 3]!))
  }
  if (dot(axes[0]!, cross(axes[1]!, axes[2]!)) < 0) {
    scales[0] = -scales[0]
    axes[0] = axes[0]!.map((n) => -n) as Vec3
  }
  const first: Trs = {
    kind: 'trs',
    translation: [matrix[12], matrix[13], matrix[14]],
    rotation: rotationQuaternion(axes[0]!, axes[1]!, axes[2]!),
    scale: scales,
  }
  const transpose = [0, 1, 2].map((i): Vec3 => [v[0]![i]!, v[1]![i]!, v[2]![i]!])
  const second: Trs = {
    kind: 'trs',
    translation: [0, 0, 0],
    rotation: rotationQuaternion(transpose[0]!, transpose[1]!, transpose[2]!),
    scale: [1, 1, 1],
  }
  const rebuilt = affineMultiply(composeTransform(first), composeTransform(second))
  for (let column = 0; column < 3; column++) {
    const magnitude = Math.hypot(
      matrix[column * 4]!,
      matrix[column * 4 + 1]!,
      matrix[column * 4 + 2]!,
    )
    for (let row = 0; row < 3; row++) {
      const error = Math.abs(rebuilt[column * 4 + row]! - matrix[column * 4 + row]!)
      requireScene(
        magnitude === 0 ? error === 0 : error / magnitude <= tolerance,
        'transform',
        failure,
      )
    }
  }
  return [first, second]
}
