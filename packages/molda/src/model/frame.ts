/**
 * A BASE (s, t) de cada face PLANA: um canto-origem, o eixo `s` ("direita"
 * olhando a face de fora) e o eixo `t` ("para baixo"). É a régua única que faz
 * a pele ficar em pé de qualquer vista e casar com o glTF (origem da UV no
 * canto superior esquerdo, `flipY = false` no editor e no export).
 *
 * Invariante (testado em toda face de toda forma): `cross(s, t) == -normal`.
 * Faces CURVAS (lado do cilindro, bola) não têm base plana: são paramétricas
 * e vivem em `geometry.ts`.
 */
import type { FaceId, MoldaPart, Vec3 } from '../core/model'
import { partSize } from './shapes'

export interface FaceFrame {
  face: FaceId
  /** Canto superior esquerdo (visto de fora). */
  origin: Vec3
  /** Unitário: a "direita" da face. */
  s: Vec3
  /** Unitário: o "para baixo" da face. */
  t: Vec3
  /** Extensão ao longo de `s` e de `t`, em unidades da grade. */
  su: number
  tv: number
  /** Normal apontando para fora (= cross(t, s)). */
  normal: Vec3
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / length, v[1] / length, v[2] / length]
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

function frame(face: FaceId, origin: Vec3, s: Vec3, t: Vec3, su: number, tv: number): FaceFrame {
  return { face, origin, s, t, su, tv, normal: cross(t, s) }
}

/**
 * A base de uma face plana desta peça (coordenadas da CAIXA, antes do giro).
 * `null` para face curva ou que a forma não tem.
 */
export function planarFaceFrame(
  part: Pick<MoldaPart, 'shape' | 'from' | 'to'>,
  face: FaceId,
): FaceFrame | null {
  const [x0, y0, z0] = part.from
  const [x1, y1, z1] = part.to
  const [sx, sy, sz] = partSize(part)
  switch (part.shape) {
    case 'box':
    case 'cylinder': {
      if (part.shape === 'cylinder' && face !== 'top' && face !== 'bottom') return null
      switch (face) {
        case 'px':
          return frame(face, [x1, y1, z1], [0, 0, -1], [0, -1, 0], sz, sy)
        case 'nx':
          return frame(face, [x0, y1, z0], [0, 0, 1], [0, -1, 0], sz, sy)
        case 'py':
        case 'top':
          return frame(face, [x0, y1, z0], [1, 0, 0], [0, 0, 1], sx, sz)
        case 'ny':
        case 'bottom':
          return frame(face, [x0, y0, z1], [1, 0, 0], [0, 0, -1], sx, sz)
        case 'pz':
          return frame(face, [x0, y1, z1], [1, 0, 0], [0, -1, 0], sx, sy)
        case 'nz':
          return frame(face, [x1, y1, z0], [-1, 0, 0], [0, -1, 0], sx, sy)
        default:
          return null
      }
    }
    case 'wedge':
      switch (face) {
        case 'ny':
          return frame(face, [x0, y0, z1], [1, 0, 0], [0, 0, -1], sx, sz)
        case 'nz':
          return frame(face, [x1, y1, z0], [-1, 0, 0], [0, -1, 0], sx, sy)
        case 'slope':
          return frame(
            face,
            [x0, y1, z0],
            [1, 0, 0],
            normalize([0, -sy, sz]),
            sx,
            Math.hypot(sy, sz),
          )
        case 'px':
          return frame(face, [x1, y1, z1], [0, 0, -1], [0, -1, 0], sz, sy)
        case 'nx':
          return frame(face, [x0, y1, z0], [0, 0, 1], [0, -1, 0], sz, sy)
        default:
          return null
      }
    case 'sphere':
      return null
  }
}

/** Ponto da face a partir das coordenadas (u, v) em [0, 1]. */
export function faceUvToPoint(frame: FaceFrame, u: number, v: number): Vec3 {
  return add(add(frame.origin, scale(frame.s, frame.su * u)), scale(frame.t, frame.tv * v))
}

/** A inversa: (u, v) de um ponto sobre (ou perto de) a face. */
export function pointToFaceUv(frame: FaceFrame, point: Vec3): [number, number] {
  const local = sub(point, frame.origin)
  return [dot(local, frame.s) / frame.su, dot(local, frame.t) / frame.tv]
}
