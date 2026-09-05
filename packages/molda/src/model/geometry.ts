/**
 * A GEOMETRIA de uma peça, pura (sem three.js): triângulos NÃO indexados com
 * normal PLANA por triângulo (low poly de verdade), índices CCW vistos de
 * fora, e UV LOCAL por face (u, v em [0, 1], origem no canto superior
 * esquerdo). O atlas do export remapeia a UV local para a região da face.
 *
 * Coordenadas da CAIXA (`from`/`to`), antes do giro: o viewport translada
 * pelo pivô e gira o mesh; o export aplica a matriz da peça.
 *
 * - box: 12 triângulos.
 * - wedge (rampa): 8 (altura cheia em `z = from.z`, zero em `z = to.z`;
 *   `px`/`nx` são triângulos dentro da pele retangular).
 * - cylinder: 16 segmentos = 32 (lado) + 16 + 16.
 * - sphere: 12 × 6 = 120 (os polos são triângulos).
 */
import type { FaceId, MoldaModelAsset, MoldaPart, ShapeId, Vec3 } from '../core/model'
import { cross, type FaceFrame, faceUvToPoint, normalize, planarFaceFrame, sub } from './frame'
import { partSize } from './shapes'

export const CYLINDER_SEGMENTS = 16
export const SPHERE_SEGMENTS_AROUND = 12
export const SPHERE_SEGMENTS_DOWN = 6

export interface FaceRange {
  /** Índice do primeiro triângulo da face. */
  start: number
  count: number
}

export interface PartGeometry {
  /** 9 números por triângulo. */
  positions: Float32Array
  /** 9 por triângulo (a mesma normal nos 3 vértices). */
  normals: Float32Array
  /** 6 por triângulo: (u, v) local da face. */
  uvs: Float32Array
  faceOfTriangle: FaceId[]
  faceRanges: Partial<Record<FaceId, FaceRange>>
  triangleCount: number
}

export function triangleCountOf(shape: ShapeId): number {
  switch (shape) {
    case 'box':
      return 12
    case 'wedge':
      return 8
    case 'cylinder':
      return CYLINDER_SEGMENTS * 4
    case 'sphere':
      return SPHERE_SEGMENTS_AROUND * (SPHERE_SEGMENTS_DOWN * 2 - 2)
  }
}

export function modelTriangleCount(model: Pick<MoldaModelAsset, 'parts'>): number {
  return model.parts.reduce((sum, part) => sum + triangleCountOf(part.shape), 0)
}

type Uv = [number, number]

class GeometryBuilder {
  private readonly positions: number[] = []
  private readonly normals: number[] = []
  private readonly uvs: number[] = []
  readonly faceOfTriangle: FaceId[] = []
  readonly faceRanges: Partial<Record<FaceId, FaceRange>> = {}

  triangle(face: FaceId, a: Vec3, b: Vec3, c: Vec3, uva: Uv, uvb: Uv, uvc: Uv): void {
    const normal = normalize(cross(sub(b, a), sub(c, a)))
    for (const point of [a, b, c]) this.positions.push(point[0], point[1], point[2])
    for (let i = 0; i < 3; i += 1) this.normals.push(normal[0], normal[1], normal[2])
    for (const uv of [uva, uvb, uvc]) this.uvs.push(uv[0], uv[1])
    const index = this.faceOfTriangle.length
    this.faceOfTriangle.push(face)
    const range = this.faceRanges[face]
    if (range) range.count += 1
    else this.faceRanges[face] = { start: index, count: 1 }
  }

  /** Quadrilátero de uma base plana: TL → BL → BR e TL → BR → TR (CCW de fora). */
  quad(frame: FaceFrame): void {
    const tl = faceUvToPoint(frame, 0, 0)
    const tr = faceUvToPoint(frame, 1, 0)
    const bl = faceUvToPoint(frame, 0, 1)
    const br = faceUvToPoint(frame, 1, 1)
    this.triangle(frame.face, tl, bl, br, [0, 0], [0, 1], [1, 1])
    this.triangle(frame.face, tl, br, tr, [0, 0], [1, 1], [1, 0])
  }

  build(): PartGeometry {
    return {
      positions: Float32Array.from(this.positions),
      normals: Float32Array.from(this.normals),
      uvs: Float32Array.from(this.uvs),
      faceOfTriangle: this.faceOfTriangle,
      faceRanges: this.faceRanges,
      triangleCount: this.faceOfTriangle.length,
    }
  }
}

function frameOf(part: MoldaPart, face: FaceId): FaceFrame {
  const frame = planarFaceFrame(part, face)
  if (!frame) throw new Error(`face ${face} sem base plana na forma ${part.shape}`)
  return frame
}

function buildBox(part: MoldaPart, out: GeometryBuilder): void {
  for (const face of ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const) out.quad(frameOf(part, face))
}

function buildWedge(part: MoldaPart, out: GeometryBuilder): void {
  out.quad(frameOf(part, 'ny'))
  out.quad(frameOf(part, 'nz'))
  out.quad(frameOf(part, 'slope'))
  // Triângulos laterais: a pele é o retângulo inteiro; só metade dele existe.
  const px = frameOf(part, 'px')
  out.triangle(
    'px',
    faceUvToPoint(px, 1, 0),
    faceUvToPoint(px, 0, 1),
    faceUvToPoint(px, 1, 1),
    [1, 0],
    [0, 1],
    [1, 1],
  )
  const nx = frameOf(part, 'nx')
  out.triangle(
    'nx',
    faceUvToPoint(nx, 0, 0),
    faceUvToPoint(nx, 0, 1),
    faceUvToPoint(nx, 1, 1),
    [0, 0],
    [0, 1],
    [1, 1],
  )
}

function buildCylinder(part: MoldaPart, out: GeometryBuilder): void {
  const [sx, , sz] = partSize(part)
  const [x0, y0, z0] = part.from
  const [, y1] = part.to
  const cx = x0 + sx / 2
  const cz = z0 + sz / 2
  const rx = sx / 2
  const rz = sz / 2
  // θ = 0 em +z, crescendo para +x: visto de fora, `s` cresce para a direita.
  const ring = (i: number, y: number): Vec3 => {
    const theta = (i / CYLINDER_SEGMENTS) * Math.PI * 2
    return [cx + rx * Math.sin(theta), y, cz + rz * Math.cos(theta)]
  }
  for (let i = 0; i < CYLINDER_SEGMENTS; i += 1) {
    const u0 = i / CYLINDER_SEGMENTS
    const u1 = (i + 1) / CYLINDER_SEGMENTS
    const tl = ring(i, y1)
    const tr = ring(i + 1, y1)
    const bl = ring(i, y0)
    const br = ring(i + 1, y0)
    out.triangle('side', tl, bl, br, [u0, 0], [u0, 1], [u1, 1])
    out.triangle('side', tl, br, tr, [u0, 0], [u1, 1], [u1, 0])
  }
  const top = frameOf(part, 'top')
  const bottom = frameOf(part, 'bottom')
  const uvOn = (frame: FaceFrame, p: Vec3): Uv => {
    const local = sub(p, frame.origin)
    return [
      (local[0] * frame.s[0] + local[1] * frame.s[1] + local[2] * frame.s[2]) / frame.su,
      (local[0] * frame.t[0] + local[1] * frame.t[1] + local[2] * frame.t[2]) / frame.tv,
    ]
  }
  const topCenter: Vec3 = [cx, y1, cz]
  const bottomCenter: Vec3 = [cx, y0, cz]
  for (let i = 0; i < CYLINDER_SEGMENTS; i += 1) {
    const a = ring(i, y1)
    const b = ring(i + 1, y1)
    out.triangle('top', topCenter, a, b, uvOn(top, topCenter), uvOn(top, a), uvOn(top, b))
    const c = ring(i, y0)
    const d = ring(i + 1, y0)
    out.triangle(
      'bottom',
      bottomCenter,
      d,
      c,
      uvOn(bottom, bottomCenter),
      uvOn(bottom, d),
      uvOn(bottom, c),
    )
  }
}

function buildSphere(part: MoldaPart, out: GeometryBuilder): void {
  const [sx, sy, sz] = partSize(part)
  const [x0, y0, z0] = part.from
  const cx = x0 + sx / 2
  const cy = y0 + sy / 2
  const cz = z0 + sz / 2
  const rx = sx / 2
  const ry = sy / 2
  const rz = sz / 2
  const point = (i: number, j: number): Vec3 => {
    const theta = (i / SPHERE_SEGMENTS_AROUND) * Math.PI * 2
    const phi = (j / SPHERE_SEGMENTS_DOWN) * Math.PI
    return [
      cx + rx * Math.sin(phi) * Math.sin(theta),
      cy + ry * Math.cos(phi),
      cz + rz * Math.sin(phi) * Math.cos(theta),
    ]
  }
  for (let j = 0; j < SPHERE_SEGMENTS_DOWN; j += 1) {
    const v0 = j / SPHERE_SEGMENTS_DOWN
    const v1 = (j + 1) / SPHERE_SEGMENTS_DOWN
    for (let i = 0; i < SPHERE_SEGMENTS_AROUND; i += 1) {
      const u0 = i / SPHERE_SEGMENTS_AROUND
      const u1 = (i + 1) / SPHERE_SEGMENTS_AROUND
      const tl = point(i, j)
      const tr = point(i + 1, j)
      const bl = point(i, j + 1)
      const br = point(i + 1, j + 1)
      // No polo de cima TL == TR (só o 1º triângulo vale); no de baixo BL == BR.
      if (j < SPHERE_SEGMENTS_DOWN - 1) {
        out.triangle('around', tl, bl, br, [u0, v0], [u0, v1], [u1, v1])
      }
      if (j > 0) out.triangle('around', tl, br, tr, [u0, v0], [u1, v1], [u1, v0])
    }
  }
}

/** Geometria da peça em coordenadas da caixa (sem giro, sem pivô). */
export function buildPartGeometry(part: MoldaPart): PartGeometry {
  const out = new GeometryBuilder()
  switch (part.shape) {
    case 'box':
      buildBox(part, out)
      break
    case 'wedge':
      buildWedge(part, out)
      break
    case 'cylinder':
      buildCylinder(part, out)
      break
    case 'sphere':
      buildSphere(part, out)
      break
  }
  return out.build()
}
