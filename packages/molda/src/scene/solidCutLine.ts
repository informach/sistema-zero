import type { Vec3 } from '../core/model'
import { cross, dot, normalize, sub } from '../model/vec'
import type { SceneMeshGeometry } from './document'
import { meshFaceFrame } from './meshFaceFrame'
import type { MeshCutPlane } from './meshPlaneCut'
import { indexMeshEdges } from './meshTopology'
import { validateSceneSolidCutPlane } from './solidCutPoints'
import { requireScene } from './validation'

/** One straight line or one closed, planar loop can determine a cut through a solid. */
export function sceneSolidCutLinePlane(
  mesh: SceneMeshGeometry,
  edgeIds: readonly string[],
): MeshCutPlane {
  const chosen = [...new Set(edgeIds)]
  requireScene(chosen.length > 0, 'line', 'Escolha uma linha ou um loop fechado.')
  const topology = indexMeshEdges(mesh)
  if (chosen.length === 1) {
    const incident = topology.edges.get(chosen[0]!)
    requireScene(incident?.length === 2, 'line', 'Escolha uma linha interna de uma face plana.')
    const first = meshFaceFrame(mesh, incident[0]!.faceId)
    const second = meshFaceFrame(mesh, incident[1]!.faceId)
    requireScene(
      dot(first.normal, second.normal) > 1 - 1e-10 &&
        Math.abs(dot(sub(second.origin, first.origin), first.normal)) <=
          Math.max(first.extent, second.extent) * 1e-10,
      'line',
      'Essa linha fica numa dobra. Escolha um loop fechado ou crie uma linha dentro de uma face plana.',
    )
    const a = mesh.vertices[incident[0]!.a]!
    const b = mesh.vertices[incident[0]!.b]!
    const normal = cross(normalize(sub(b, a)), first.normal)
    requireScene(Math.hypot(...normal) > 0, 'line', 'Essa linha não define um corte.')
    return validateSceneSolidCutPlane(mesh, { origin: a, normal })
  }

  const adjacent = new Map<string, string[]>()
  for (const id of chosen) {
    const incident = topology.edges.get(id)
    requireScene(incident?.length === 2, 'line', 'Escolha um loop de linhas da peça.')
    for (const [a, b] of [
      [incident[0]!.a, incident[0]!.b] as const,
      [incident[0]!.b, incident[0]!.a] as const,
    ]) {
      const neighbors = adjacent.get(a) ?? []
      neighbors.push(b)
      adjacent.set(a, neighbors)
    }
  }
  requireScene(
    [...adjacent.values()].every((neighbors) => neighbors.length === 2),
    'line',
    'As linhas precisam formar um loop fechado, sem pontas ou ramificações.',
  )
  const ordered: Vec3[] = []
  const seen = new Set<string>()
  const start = adjacent.keys().next().value
  requireScene(start !== undefined, 'line', 'Escolha um loop fechado para separar a peça.')
  let current = start
  let previous: string | null = null
  while (!seen.has(current)) {
    seen.add(current)
    ordered.push(mesh.vertices[current]!)
    const next = adjacent.get(current)!.find((id) => id !== previous)!
    previous = current
    current = next
  }
  requireScene(
    current === start && seen.size === adjacent.size,
    'line',
    'Escolha um único loop fechado para separar a peça.',
  )
  const origin = ordered[0]!
  const offsets = ordered.map((point) => sub(point, origin))
  let extent = 0
  for (const point of offsets) for (const value of point) extent = Math.max(extent, Math.abs(value))
  requireScene(extent > 0, 'line', 'Esse loop não define um plano de corte.')
  const scaled = offsets.map((point) => point.map((value) => value / extent) as Vec3)
  const normalSum: Vec3 = [0, 0, 0]
  for (let i = 0; i < scaled.length; i++) {
    const crossProduct = cross(scaled[i]!, scaled[(i + 1) % scaled.length]!)
    for (const axis of [0, 1, 2] as const) normalSum[axis] += crossProduct[axis]
  }
  requireScene(Math.hypot(...normalSum) > 1e-12, 'line', 'Esse loop não define um plano de corte.')
  const normal = normalize(normalSum)
  requireScene(
    offsets.every((point) => Math.abs(dot(point, normal)) <= extent * Number.EPSILON * 32),
    'line',
    'O loop precisa estar no mesmo plano para separar a peça.',
  )
  return validateSceneSolidCutPlane(mesh, { origin, normal })
}
