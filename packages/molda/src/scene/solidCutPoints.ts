import type { Vec3 } from '../core/model'
import { cross, dot, normalize, sub } from '../model/vec'
import type { SceneMeshGeometry } from './document'
import { meshFaceFrame } from './meshFaceFrame'
import type { MeshCutPlane } from './meshPlaneCut'
import { indexMeshEdges } from './meshTopology'
import { number, requireScene, tuple } from './validation'

export interface SceneCutPoint {
  edgeId: string
  t: number
}

export function sceneCutPoint(
  mesh: SceneMeshGeometry,
  point: SceneCutPoint,
  topology = indexMeshEdges(mesh),
): Vec3 {
  number(point.t, 'point.t', 0, 1)
  const edge = topology.edges.get(point.edgeId)?.[0]
  requireScene(edge, 'point', 'Escolha uma aresta da peça.')
  const [a, b] = [edge.a, edge.b].sort()
  const start = mesh.vertices[a!]!,
    end = mesh.vertices[b!]!
  return [0, 1, 2].map((axis) => (1 - point.t) * start[axis]! + point.t * end[axis]!) as Vec3
}

/** Two points on one face define a perpendicular cut; three define a free plane. */
export function sceneSolidCutPlane(
  mesh: SceneMeshGeometry,
  points: readonly SceneCutPoint[],
  topology = indexMeshEdges(mesh),
): MeshCutPlane {
  requireScene(
    points.length >= 2 && points.length <= 64,
    'points',
    'Marque de 2 a 64 pontos nas arestas da peça.',
  )
  const positions = points.map((point) => sceneCutPoint(mesh, point, topology))
  const a = positions[0]!,
    b = positions[1]!,
    line = sub(b, a)
  const extent = Math.hypot(...line)
  requireScene(extent > 0, 'points', 'Marque dois pontos em lugares diferentes.')
  let normal: Vec3
  if (points.length === 2) {
    requireScene(
      points[0]!.edgeId !== points[1]!.edgeId,
      'points',
      'Escolha outra aresta da mesma face.',
    )
    const edges = topology.edges
    const common = edges
      .get(points[0]!.edgeId)!
      .filter((edge) => edges.get(points[1]!.edgeId)!.some((other) => other.faceId === edge.faceId))
    requireScene(
      common.length === 1,
      'points',
      'Para dois pontos, escolha arestas da mesma face. Ou marque um terceiro ponto para inclinar o corte.',
    )
    normal = normalize(cross(line, meshFaceFrame(mesh, common[0]!.faceId).normal))
  } else {
    const third = sub(positions[2]!, a)
    normal = cross(normalize(line), normalize(third))
    requireScene(
      Math.hypot(...normal) > 1e-10,
      'points',
      'O terceiro ponto precisa sair da linha dos dois primeiros.',
    )
    normal = normalize(normal)
  }
  requireScene(Math.hypot(...normal) > 0, 'points', 'Os pontos não definem um plano de corte.')
  for (const position of positions.slice(3))
    requireScene(
      Math.abs(dot(sub(position, a), normal)) <=
        Math.max(extent, Math.hypot(...sub(position, a))) * 1e-9,
      'points',
      'Esse ponto sai do plano do corte. Use Corrigir ponto para voltar.',
    )
  return validateSceneSolidCutPlane(mesh, { origin: a, normal })
}

/** Numeric and picked planes share the same finite, normalized, volume-crossing contract. */
export function validateSceneSolidCutPlane(
  mesh: SceneMeshGeometry,
  plane: MeshCutPlane,
): MeshCutPlane {
  const origin = tuple(plane.origin, 3, 'plane.origin') as Vec3,
    raw = tuple(plane.normal, 3, 'plane.normal') as Vec3,
    magnitude = Math.max(...raw.map(Math.abs))
  requireScene(magnitude > 0, 'plane.normal', 'Escolha uma direção diferente de zero para o corte.')
  const scaled = raw.map((n) => n / magnitude),
    length = Math.hypot(...scaled),
    normal = scaled.map((n) => n / length) as Vec3
  let minimum = Infinity,
    maximum = -Infinity,
    scale = 0
  for (const point of Object.values(mesh.vertices)) {
    const delta = sub(point, origin),
      distance = number(dot(delta, normal), 'plane')
    minimum = Math.min(minimum, distance)
    maximum = Math.max(maximum, distance)
    scale = Math.max(scale, Math.hypot(...delta))
  }
  requireScene(
    minimum < -scale * Number.EPSILON * 32 && maximum > scale * Number.EPSILON * 32,
    'points',
    'O plano precisa atravessar o volume da peça.',
  )
  return { origin: [...origin], normal }
}
