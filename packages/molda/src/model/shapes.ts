/**
 * As FORMAS de peça e o que cada uma tem de faces pintáveis. A parte pura do
 * motor: só matemática sobre `from/to`, sem three.js — o sanitize precisa disto
 * para saber o tamanho da pele de cada face, e os testes rodam sem WebGL.
 *
 * Coordenadas: y para cima (chão = 0), 1 unidade = 1 célula da grade.
 * - box: 6 faces.
 * - wedge (rampa): a altura cheia fica em `z = from.z` e cai a zero em `z = to.z`;
 *   5 faces (`px`/`nx` são triângulos dentro de uma pele retangular).
 * - cylinder: eixo y; `side` é a faixa em volta, `top`/`bottom` as tampas.
 * - sphere: uma pele só, equiretangular (`around`).
 */

import { clampInt, MOLDA_LIMITS } from '../core/limits'
import type { FaceId, MeshFaceKey, MoldaPart, ShapeId, Vec3 } from '../core/model'
import { meshFaceFrame } from './meshFrame'

/**
 * As faces das FORMAS. A malha (`mesh`) não tem lista fixa: as faces dela vêm da
 * própria peça (`partFaces`), então aqui fica vazia de propósito.
 */
export const FACES_BY_SHAPE: Record<ShapeId, readonly FaceId[]> = {
  box: ['px', 'nx', 'py', 'ny', 'pz', 'nz'],
  wedge: ['ny', 'nz', 'slope', 'px', 'nx'],
  cylinder: ['side', 'top', 'bottom'],
  sphere: ['around'],
  mesh: [],
}

/** As faces pintáveis DESTA peça: as da forma, ou as chaves da malha. */
export function partFaces(part: Pick<MoldaPart, 'shape' | 'mesh'>): readonly FaceId[] {
  if (part.shape === 'mesh') return part.mesh ? (Object.keys(part.mesh.faces) as MeshFaceKey[]) : []
  return FACES_BY_SHAPE[part.shape]
}

export function shapeHasFace(shape: ShapeId, face: string): face is FaceId {
  return (FACES_BY_SHAPE[shape] as readonly string[]).includes(face)
}

/** Tamanho da caixa da peça (sempre positivo depois do sanitize). */
export function partSize(part: Pick<MoldaPart, 'from' | 'to'>): Vec3 {
  return [part.to[0] - part.from[0], part.to[1] - part.from[1], part.to[2] - part.from[2]]
}

/** Centro da caixa (o pivô padrão). */
export function partCenter(part: Pick<MoldaPart, 'from' | 'to'>): Vec3 {
  return [
    (part.from[0] + part.to[0]) / 2,
    (part.from[1] + part.to[1]) / 2,
    (part.from[2] + part.to[2]) / 2,
  ]
}

/**
 * Quantas UNIDADES de mundo a pele de uma face cobre, [largura, altura] no
 * sentido (s, t) da face. `null` para face que a forma não tem.
 */
export function faceUnits(shape: ShapeId, size: Vec3, face: FaceId): [number, number] | null {
  const [sx, sy, sz] = size
  switch (shape) {
    case 'box':
      switch (face) {
        case 'px':
        case 'nx':
          return [sz, sy]
        case 'py':
        case 'ny':
          return [sx, sz]
        case 'pz':
        case 'nz':
          return [sx, sy]
        default:
          return null
      }
    case 'wedge':
      switch (face) {
        case 'ny':
          return [sx, sz]
        case 'nz':
          return [sx, sy]
        case 'slope':
          return [sx, Math.hypot(sy, sz)]
        case 'px':
        case 'nx':
          return [sz, sy]
        default:
          return null
      }
    case 'cylinder':
      switch (face) {
        case 'side':
          return [(Math.PI * (sx + sz)) / 2, sy]
        case 'top':
        case 'bottom':
          return [sx, sz]
        default:
          return null
      }
    case 'sphere':
      return face === 'around' ? [(Math.PI * (sx + sz)) / 2, (Math.PI * sy) / 2] : null
    case 'mesh':
      // A malha mede pela base de cada face (ver `faceSkinSize`), não pela caixa.
      return null
  }
}

/** Unidades × texels por unidade, clampado à faixa de pele. */
export function skinDim(units: number, texelsPerUnit: number): number {
  return clampInt(Math.round(units * texelsPerUnit), MOLDA_LIMITS.minSkin, MOLDA_LIMITS.maxSkin)
}

/**
 * O tamanho que a pele de uma face TEM de ter para esta peça e esta resolução.
 * É a régua única do sanitize (re-amostra o que divergir) e do editor (cria a
 * pele já no tamanho certo).
 */
export function faceSkinSize(
  part: Pick<MoldaPart, 'shape' | 'from' | 'to' | 'mesh'>,
  face: FaceId,
  texelsPerUnit: number,
): { width: number; height: number } | null {
  if (part.shape === 'mesh') {
    if (!part.mesh || !face.startsWith('f_')) return null
    const frame = meshFaceFrame(part.mesh, face as MeshFaceKey)
    if (!frame) return null
    return { width: skinDim(frame.su, texelsPerUnit), height: skinDim(frame.tv, texelsPerUnit) }
  }
  const units = faceUnits(part.shape, partSize(part), face)
  if (!units) return null
  return { width: skinDim(units[0], texelsPerUnit), height: skinDim(units[1], texelsPerUnit) }
}
