import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry, Vec2 } from './document'
import { SCENE_LIMITS } from './limits'
import { requireMeshOperationBudget } from './meshComponentOperations'
import {
  meshComponentEdges,
  meshComponentVertices,
  type SceneComponentSelection,
} from './meshComponents'
import { indexMeshEdges, meshEdgeKey, meshIdAllocator } from './meshTopology'
import { triangulateFace } from './triangulate'
import { requireScene, tuple } from './validation'

/** Extend edges into faces or points into loose edges, without moving their source geometry. */
export function extrudeMeshComponents(
  mesh: SceneMeshGeometry,
  selection: Pick<SceneComponentSelection, 'mode' | 'ids'>,
  offset: Vec3,
  nextId: () => string = newId,
) {
  requireScene(selection.mode !== 'face', 'selection', 'Escolha linhas ou pontos para puxar.')
  const selected = new Set(selection.ids)
  const chosen = [...selected]
  requireScene(chosen.length, 'selection', 'Escolha uma linha ou um ponto para puxar.')
  const used = meshComponentVertices(mesh, { ...selection, ids: chosen })
  tuple(offset, 3, 'offset')
  if (offset.every((n) => n === 0)) return { mesh, ids: chosen, faceIds: [] }
  requireMeshOperationBudget(mesh, used.length, selection.mode === 'edge' ? chosen.length * 2 : 0)
  requireScene(
    selection.mode !== 'vertex' || mesh.looseEdges.length + used.length <= SCENE_LIMITS.looseEdges,
    'mesh',
    'Esse ajuste ultrapassa o limite de linhas da malha. Escolha menos pontos.',
  )
  const allocate = meshIdAllocator(mesh, nextId)
  const copied = new Map<string, string>()
  const vertices = { ...mesh.vertices }
  for (const id of used) {
    const before = mesh.vertices[id]!
    const point: Vec3 = [before[0] + offset[0], before[1] + offset[1], before[2] + offset[2]]
    tuple(point, 3, 'point')
    requireScene(
      point.some((n, axis) => n !== before[axis]),
      'offset',
      'Puxe por uma distância maior. Esse valor não muda a posição dos pontos.',
    )
    const copy = allocate()
    vertices[copy] = point
    copied.set(id, copy)
  }
  if (selection.mode === 'vertex')
    return {
      mesh: {
        ...mesh,
        vertices,
        looseEdges: [
          ...mesh.looseEdges,
          ...used.map((id): [string, string] => [id, copied.get(id)!]),
        ],
      },
      ids: used.map((id) => copied.get(id)!),
      faceIds: [],
    }

  const edges = meshComponentEdges(mesh)
  const topology = indexMeshEdges(mesh)
  const faces = { ...mesh.faces }
  const ids: string[] = []
  const faceIds: string[] = []
  const uv: Vec2[] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]
  for (const key of chosen) {
    const incident = topology.edges.get(key)?.[0]
    const [a, b] = incident ? [incident.b, incident.a] : edges.get(key)!
    const corners = [a, b, copied.get(b)!, copied.get(a)!].map((vertexId, i) => ({
      vertexId,
      uv: uv[i]!,
    }))
    requireScene(
      triangulateFace(corners.map((c) => vertices[c.vertexId]!)).status === 'ok',
      'offset',
      'Puxe em outra direção. Mover ao longo da linha não cria uma face.',
    )
    const source = incident ? mesh.faces[incident.faceId] : undefined
    const faceId = allocate()
    faces[faceId] = { ...(source ?? {}), corners }
    faceIds.push(faceId)
    ids.push(meshEdgeKey(copied.get(a)!, copied.get(b)!))
  }
  // A formerly loose source edge is now represented by its new face.
  const looseEdges = mesh.looseEdges.filter(([a, b]) => !selected.has(meshEdgeKey(a, b)))
  return { mesh: { ...mesh, vertices, faces, looseEdges }, ids, faceIds }
}
