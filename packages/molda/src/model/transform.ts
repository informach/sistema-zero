/**
 * A matriz de uma peça (giro em torno do pivô), pura: `M = T(pivô) · R · T(-pivô)`
 * com `R = Rx · Ry · Rz` (graus), a MESMA convenção do Euler 'XYZ' do three
 * (testado contra `Matrix4.makeRotationFromEuler`). Column-major como o three:
 * `m[0..3]` é a primeira coluna.
 */
import type { MoldaModelAsset, MoldaPart, Vec3 } from '../core/model'
import { partCenter } from './shapes'

export type Mat4 = Float64Array

export function partPivot(part: Pick<MoldaPart, 'from' | 'to' | 'origin'>): Vec3 {
  return part.origin ? [...part.origin] : partCenter(part)
}

function rad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** R = Rx · Ry · Rz, como 3×3 row-major [r00, r01, r02, r10, ...]. */
export function rotationMatrixXYZ(rxDeg: number, ryDeg: number, rzDeg: number): number[] {
  const a = Math.cos(rad(rxDeg))
  const b = Math.sin(rad(rxDeg))
  const c = Math.cos(rad(ryDeg))
  const d = Math.sin(rad(ryDeg))
  const e = Math.cos(rad(rzDeg))
  const f = Math.sin(rad(rzDeg))
  return [
    c * e,
    -c * f,
    d,
    a * f + b * e * d,
    a * e - b * f * d,
    -b * c,
    b * f - a * e * d,
    b * e + a * f * d,
    a * c,
  ]
}

export function partMatrix(part: MoldaPart): Mat4 {
  const [px, py, pz] = partPivot(part)
  const r = rotationMatrixXYZ(part.rotation[0], part.rotation[1], part.rotation[2])
  const r00 = r[0] as number
  const r01 = r[1] as number
  const r02 = r[2] as number
  const r10 = r[3] as number
  const r11 = r[4] as number
  const r12 = r[5] as number
  const r20 = r[6] as number
  const r21 = r[7] as number
  const r22 = r[8] as number
  // Translação final = pivô - R · pivô.
  const tx = px - (r00 * px + r01 * py + r02 * pz)
  const ty = py - (r10 * px + r11 * py + r12 * pz)
  const tz = pz - (r20 * px + r21 * py + r22 * pz)
  return Float64Array.from([r00, r10, r20, 0, r01, r11, r21, 0, r02, r12, r22, 0, tx, ty, tz, 1])
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  const [x, y, z] = p
  return [
    (m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z + (m[12] as number),
    (m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z + (m[13] as number),
    (m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z + (m[14] as number),
  ]
}

/** Só a parte de giro (direções): sem translação. */
export function transformDirection(m: Mat4, v: Vec3): Vec3 {
  const [x, y, z] = v
  return [
    (m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z,
    (m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z,
    (m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z,
  ]
}

/** Os 8 cantos da caixa da peça, já girados (espaço do modelo). */
export function partCorners(part: MoldaPart): Vec3[] {
  const m = partMatrix(part)
  const [x0, y0, z0] = part.from
  const [x1, y1, z1] = part.to
  const corners: Vec3[] = []
  for (const x of [x0, x1]) {
    for (const y of [y0, y1]) {
      for (const z of [z0, z1]) corners.push(transformPoint(m, [x, y, z]))
    }
  }
  return corners
}

export interface Bounds {
  min: Vec3
  max: Vec3
}

export function partBounds(part: MoldaPart): Bounds {
  const min: Vec3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const max: Vec3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  for (const corner of partCorners(part)) {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i] as number, corner[i] as number)
      max[i] = Math.max(max[i] as number, corner[i] as number)
    }
  }
  return { min, max }
}

/** Caixa envolvente de todas as peças; `null` para modelo vazio. */
export function modelBounds(model: Pick<MoldaModelAsset, 'parts'>): Bounds | null {
  if (model.parts.length === 0) return null
  const min: Vec3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const max: Vec3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  for (const part of model.parts) {
    const bounds = partBounds(part)
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i] as number, bounds.min[i] as number)
      max[i] = Math.max(max[i] as number, bounds.max[i] as number)
    }
  }
  return { min, max }
}
