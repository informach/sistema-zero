/**
 * De um PONTO na superfície ao TEXEL da pele: a inversa do gerador da
 * geometria (o mesmo caminho para face plana e curva). O palco pega o ponto do
 * `Raycaster` do three; o espelho de pintura e os testes usam o
 * `pickTexelAtPoint` puro (que peça e que face contêm o ponto).
 *
 * ⚠️ O `hit.uv` do three NÃO serve: face sem pele tem UV degenerada (o centro
 * do swatch). Por isso tudo passa pelo ponto local.
 */
import type { FaceId, MoldaModelAsset, MoldaPart, Vec3 } from '../core/model'
import { cross, dot, planarFaceFrame, pointToFaceUv, sub } from './frame'
import { buildPartGeometry } from './geometry'
import { FACES_BY_SHAPE, faceSkinSize, partSize } from './shapes'
import { partPivot, rotationMatrixXYZ } from './transform'
import { MIRRORED_FACE } from './twins'

export interface TexelHit {
  /** Sempre a peça FONTE (gêmeo já resolvido). */
  partId: string
  /** A face da FONTE (o espelho do gêmeo já aplicado). */
  face: FaceId
  x: number
  y: number
}

export interface RaySurfaceHit {
  partId: string
  face: FaceId
  point: Vec3
  distance: number
  triangleIndex: number
}

function normalizedDirection(direction: Vec3): Vec3 | null {
  const length = Math.hypot(direction[0], direction[1], direction[2])
  if (!Number.isFinite(length) || length <= 1e-12) return null
  return [direction[0] / length, direction[1] / length, direction[2] / length]
}

function rayHitsBox(origin: Vec3, direction: Vec3, part: MoldaPart): boolean {
  let near = 0
  let far = Number.POSITIVE_INFINITY
  for (let axis = 0; axis < 3; axis += 1) {
    const component = direction[axis] as number
    if (Math.abs(component) <= 1e-12) {
      if (
        (origin[axis] as number) < (part.from[axis] as number) ||
        (origin[axis] as number) > (part.to[axis] as number)
      ) {
        return false
      }
      continue
    }
    let a = ((part.from[axis] as number) - (origin[axis] as number)) / component
    let b = ((part.to[axis] as number) - (origin[axis] as number)) / component
    if (a > b) [a, b] = [b, a]
    near = Math.max(near, a)
    far = Math.min(far, b)
    if (near > far) return false
  }
  return far >= 0
}

function triangleDistance(origin: Vec3, direction: Vec3, a: Vec3, b: Vec3, c: Vec3): number | null {
  const edge1 = sub(b, a)
  const edge2 = sub(c, a)
  const p = cross(direction, edge2)
  const determinant = dot(edge1, p)
  // Mesmo lado padrão (`FrontSide`) usado pelo Mesh do palco.
  if (determinant <= 1e-9) return null
  const inverse = 1 / determinant
  const fromA = sub(origin, a)
  const u = dot(fromA, p) * inverse
  if (u < 0 || u > 1) return null
  const q = cross(fromA, edge1)
  const v = dot(direction, q) * inverse
  if (v < 0 || u + v > 1) return null
  const distance = dot(edge2, q) * inverse
  return distance >= 0 ? distance : null
}

/**
 * Raycast puro contra a mesma geometria triangular do palco. O slab test da
 * caixa elimina peças distantes; a interseção Möller-Trumbore escolhe o
 * triângulo frontal mais próximo, sem depender de WebGL ou do three.js.
 */
export function pickModelRay(
  model: Pick<MoldaModelAsset, 'parts'>,
  origin: Vec3,
  direction: Vec3,
): RaySurfaceHit | null {
  const worldDirection = normalizedDirection(direction)
  if (!worldDirection || origin.some((value) => !Number.isFinite(value))) return null
  let closest: RaySurfaceHit | null = null
  for (const part of model.parts) {
    const localOrigin = worldToBox(part, origin)
    const nextWorld: Vec3 = [
      origin[0] + worldDirection[0],
      origin[1] + worldDirection[1],
      origin[2] + worldDirection[2],
    ]
    const nextLocal = worldToBox(part, nextWorld)
    const localDirection = sub(nextLocal, localOrigin)
    if (!rayHitsBox(localOrigin, localDirection, part)) continue
    const built = buildPartGeometry(part)
    for (let triangle = 0; triangle < built.triangleCount; triangle += 1) {
      const offset = triangle * 9
      const a: Vec3 = [
        built.positions[offset] as number,
        built.positions[offset + 1] as number,
        built.positions[offset + 2] as number,
      ]
      const b: Vec3 = [
        built.positions[offset + 3] as number,
        built.positions[offset + 4] as number,
        built.positions[offset + 5] as number,
      ]
      const c: Vec3 = [
        built.positions[offset + 6] as number,
        built.positions[offset + 7] as number,
        built.positions[offset + 8] as number,
      ]
      const distance = triangleDistance(localOrigin, localDirection, a, b, c)
      if (distance === null || (closest && distance >= closest.distance)) continue
      const face = built.faceOfTriangle[triangle]
      if (!face) continue
      closest = {
        partId: part.id,
        face,
        distance,
        triangleIndex: triangle,
        point: [
          origin[0] + worldDirection[0] * distance,
          origin[1] + worldDirection[1] * distance,
          origin[2] + worldDirection[2] * distance,
        ],
      }
    }
  }
  return closest
}

/** Ponto do modelo → coordenadas da CAIXA da peça (desfaz o giro em torno do pivô). */
export function worldToBox(part: MoldaPart, point: Vec3): Vec3 {
  const pivot = partPivot(part)
  const r = rotationMatrixXYZ(part.rotation[0], part.rotation[1], part.rotation[2])
  const d = sub(point, pivot)
  // R é ortonormal: a inversa é a transposta.
  return [
    (r[0] as number) * d[0] + (r[3] as number) * d[1] + (r[6] as number) * d[2] + pivot[0],
    (r[1] as number) * d[0] + (r[4] as number) * d[1] + (r[7] as number) * d[2] + pivot[1],
    (r[2] as number) * d[0] + (r[5] as number) * d[1] + (r[8] as number) * d[2] + pivot[2],
  ]
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1
}

/** (u, v) locais de um ponto (coordenadas da caixa) sobre a face. */
export function faceUvAt(part: MoldaPart, face: FaceId, local: Vec3): [number, number] | null {
  const frame = planarFaceFrame(part, face)
  if (frame) return pointToFaceUv(frame, local)
  const [sx, sy, sz] = partSize(part)
  const [x0, y0, z0] = part.from
  const cx = x0 + sx / 2
  const cz = z0 + sz / 2
  const nx = (local[0] - cx) / (sx / 2)
  const nz = (local[2] - cz) / (sz / 2)
  // θ = 0 em +z, crescendo para +x (a mesma convenção do gerador).
  const theta = Math.atan2(nx, nz)
  const u = wrap01(theta / (Math.PI * 2))
  if (part.shape === 'cylinder' && face === 'side') {
    const v = (y0 + sy - local[1]) / sy
    return [u, Math.min(Math.max(v, 0), 1)]
  }
  if (part.shape === 'sphere' && face === 'around') {
    const cy = y0 + sy / 2
    const ny = Math.min(Math.max((local[1] - cy) / (sy / 2), -1), 1)
    const phi = Math.acos(ny)
    return [u, phi / Math.PI]
  }
  return null
}

/** O texel da pele desta face que contém o ponto local. */
export function faceTexelAt(
  part: MoldaPart,
  face: FaceId,
  local: Vec3,
  texelsPerUnit: number,
): { x: number; y: number } | null {
  const uv = faceUvAt(part, face, local)
  const size = faceSkinSize(part, face, texelsPerUnit)
  if (!uv || !size) return null
  return {
    x: Math.min(Math.max(Math.floor(uv[0] * size.width), 0), size.width - 1),
    y: Math.min(Math.max(Math.floor(uv[1] * size.height), 0), size.height - 1),
  }
}

/**
 * Um toque num GÊMEO vira um toque na fonte: face espelhada e coluna invertida
 * (o gêmeo mostra a pele da fonte espelhada na horizontal).
 */
export function resolveTexelHit(
  model: Pick<MoldaModelAsset, 'parts' | 'texelsPerUnit'>,
  part: MoldaPart,
  face: FaceId,
  x: number,
  y: number,
): TexelHit {
  if (!part.mirrorOf) return { partId: part.id, face, x, y }
  const source = model.parts.find((item) => item.id === part.mirrorOf)
  if (!source) return { partId: part.id, face, x, y }
  const sourceFace = MIRRORED_FACE[face] ?? face
  const size = faceSkinSize(source, sourceFace, model.texelsPerUnit)
  const width = size?.width ?? 1
  return { partId: source.id, face: sourceFace, x: width - 1 - x, y }
}

const UV_TOLERANCE = 0.02

function radial2(part: MoldaPart, local: Vec3): number {
  const [sx, , sz] = partSize(part)
  const cx = part.from[0] + sx / 2
  const cz = part.from[2] + sz / 2
  return Math.hypot((local[0] - cx) / (sx / 2), (local[2] - cz) / (sz / 2))
}

function faceContains(part: MoldaPart, face: FaceId, local: Vec3, eps: number): boolean {
  const frame = planarFaceFrame(part, face)
  if (frame) {
    const distance = Math.abs(dot(sub(local, frame.origin), frame.normal))
    if (distance > eps) return false
    const [u, v] = pointToFaceUv(frame, local)
    if (u < -UV_TOLERANCE || u > 1 + UV_TOLERANCE || v < -UV_TOLERANCE || v > 1 + UV_TOLERANCE) {
      return false
    }
    if (part.shape === 'wedge' && face === 'px' && u + v < 1 - UV_TOLERANCE) return false
    if (part.shape === 'wedge' && face === 'nx' && v < u - UV_TOLERANCE) return false
    // As tampas do cilindro são elipses dentro do quadrado da base.
    if (part.shape === 'cylinder') return radial2(part, local) <= 1.03
    return true
  }
  const [, sy] = partSize(part)
  if (part.shape === 'cylinder' && face === 'side') {
    if (local[1] < part.from[1] - eps || local[1] > part.from[1] + sy + eps) return false
    const r = radial2(part, local)
    // A lateral é facetada: o ponto num facete fica um pouco dentro da elipse.
    return r >= 0.86 && r <= 1.05
  }
  if (part.shape === 'sphere' && face === 'around') {
    const cy = part.from[1] + sy / 2
    const r = Math.hypot(radial2(part, local), (local[1] - cy) / (sy / 2))
    return r >= 0.82 && r <= 1.06
  }
  return false
}

/**
 * Qual peça/face contém o ponto (coordenadas do modelo), e o texel. Faces
 * planas primeiro (exatas), curvas depois. `null` fora de toda superfície.
 */
export function pickTexelAtPoint(
  model: Pick<MoldaModelAsset, 'parts' | 'texelsPerUnit'>,
  point: Vec3,
  eps = 0.02,
): TexelHit | null {
  for (const part of model.parts) {
    const local = worldToBox(part, point)
    const faces = FACES_BY_SHAPE[part.shape]
    const planar = faces.filter((face) => planarFaceFrame(part, face) !== null)
    const curved = faces.filter((face) => planarFaceFrame(part, face) === null)
    for (const face of [...planar, ...curved]) {
      if (!faceContains(part, face, local, eps)) continue
      const texel = faceTexelAt(part, face, local, model.texelsPerUnit)
      if (!texel) continue
      return resolveTexelHit(model, part, face, texel.x, texel.y)
    }
  }
  return null
}
