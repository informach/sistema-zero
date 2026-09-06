/**
 * A base (s, t) de uma face de MALHA, no mesmo contrato das faces planas das formas
 * (`frame.ts`): a face vira uma "face de caixa" para o atlas, a pele, a pintura e o
 * picking. Regra: `s` = do primeiro ao ÚLTIMO ponto do ciclo (a "direita" olhando de
 * fora), normal de Newell, `t = cross(s, normal)` (o "para baixo"; invariante
 * `cross(s, t) == -normal` como nas formas), e a pele cobre o RETÂNGULO envolvente
 * dos pontos projetados na base. Num quad retangular [TL, BL, BR, TR] isso é
 * idêntico ao `planarFaceFrame` da caixa; num triângulo é o precedente da rampa
 * (`px`/`nx` são triângulos numa pele retangular).
 */
import type { MeshFaceKey, MoldaMesh, Vec3 } from '../core/model'
import type { FaceFrame } from './frame'
import { faceNormal, faceVertices } from './mesh'
import { add, cross, dot, length, normalize, scale, sub } from './vec'

const DEGENERATE = 1e-9

export function meshFaceFrame(mesh: MoldaMesh, face: MeshFaceKey): FaceFrame | null {
  const points = faceVertices(mesh, face)
  if (!points || points.length < 3) return null
  const p0 = points[0] as Vec3
  const last = points[points.length - 1] as Vec3
  const normal = faceNormal(points)
  if (length(normal) < DEGENERATE) return null
  const edge = sub(last, p0)
  // `s` no plano da face (a aresta pode inclinar num quad torto).
  const inPlane = sub(edge, scale(normal, dot(edge, normal)))
  if (length(inPlane) < DEGENERATE) return null
  const s = normalize(inPlane)
  const t = normalize(cross(s, normal))
  let minS = Number.POSITIVE_INFINITY
  let maxS = Number.NEGATIVE_INFINITY
  let minT = Number.POSITIVE_INFINITY
  let maxT = Number.NEGATIVE_INFINITY
  for (const p of points) {
    const d = sub(p, p0)
    const ps = dot(d, s)
    const pt = dot(d, t)
    minS = Math.min(minS, ps)
    maxS = Math.max(maxS, ps)
    minT = Math.min(minT, pt)
    maxT = Math.max(maxT, pt)
  }
  const su = maxS - minS
  const tv = maxT - minT
  if (su < DEGENERATE || tv < DEGENERATE) return null
  const origin = add(add(p0, scale(s, minS)), scale(t, minT))
  return { face, origin, s, t, su, tv, normal: cross(t, s) }
}

/** Os pontos da face em (u, v) da base (0..1 no retângulo da pele). */
export function faceLocalPolygon(
  frame: FaceFrame,
  points: readonly Vec3[],
): Array<[number, number]> {
  return points.map((p) => {
    const d = sub(p, frame.origin)
    return [dot(d, frame.s) / frame.su, dot(d, frame.t) / frame.tv]
  })
}

function distanceToSegment(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  const t =
    lengthSq < 1e-18
      ? 0
      : Math.min(Math.max(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq, 0), 1)
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/**
 * Ponto dentro do polígono (par-ímpar) ou a menos de `tolerance` de uma aresta:
 * a régua de "esta face contém o ponto" da pintura e do picking, que também vale
 * para face côncava.
 */
export function polygonContains(
  polygon: readonly [number, number][],
  point: [number, number],
  tolerance = 0.02,
): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i] as [number, number]
    const b = polygon[j] as [number, number]
    if (distanceToSegment(point, a, b) <= tolerance) return true
    const crosses = a[1] > point[1] !== b[1] > point[1]
    if (crosses && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside
    }
  }
  return inside
}
