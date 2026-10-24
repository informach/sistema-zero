import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { cross, length } from '../model/vec'
import type { SceneMeshGeometry } from './document'
import { SCENE_LIMITS } from './limits'
import { createMeshFaceFromCycle, meshHoleMaterials } from './meshComponentOperations'
import {
  meshComponentEdges,
  meshComponentVertices,
  type SceneComponentSelection,
} from './meshComponents'
import { createMeshLooseEdge } from './meshCut'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { requireScene } from './validation'

type Selection = Pick<SceneComponentSelection, 'mode' | 'ids'>
interface MeshCreationPlan {
  materials: string[]
  apply(
    material?: string,
    nextId?: () => string,
  ): {
    mesh: SceneMeshGeometry
    faceIds: string[]
    mode: 'edge' | 'face'
    ids: string[]
  }
}

/** Topological order preserves concave contours; spatial order completes missing sides. */
function creationCycle(
  mesh: SceneMeshGeometry,
  vertices: string[],
  constraints: readonly (readonly [string, string])[],
  strict: boolean,
) {
  const adjacency = new Map(vertices.map((id) => [id, new Set<string>()]))
  for (const [a, b] of constraints) {
    adjacency.get(a)!.add(b)
    adjacency.get(b)!.add(a)
  }
  const degrees = [...adjacency.values()].map((neighbors) => neighbors.size)
  requireScene(
    !strict || degrees.every((n) => n <= 2),
    'edges',
    'Escolha um contorno sem ramificações.',
  )
  const ends = vertices.filter((id) => adjacency.get(id)!.size === 1)
  if (
    degrees.every((n) => n === 2) ||
    (ends.length === 2 && degrees.every((n) => n > 0 && n <= 2))
  ) {
    const cycle: string[] = []
    let current: string | undefined = ends[0] ?? vertices[0]
    const visited = new Set<string>()
    while (current !== undefined && !visited.has(current)) {
      cycle.push(current)
      visited.add(current)
      current = [...adjacency.get(current)!].find((id) => !visited.has(id))
    }
    requireScene(cycle.length === vertices.length, 'edges', 'Escolha um único contorno por vez.')
    return cycle
  }

  const origin = mesh.vertices[vertices[0]!]!
  const extent = Math.max(
    ...vertices.flatMap((id) => mesh.vertices[id]!.map((n, axis) => Math.abs(n - origin[axis]!))),
  )
  requireScene(
    extent > 0 && Number.isFinite(extent),
    'vertices',
    'Esses pontos não delimitam uma face.',
  )
  const points = vertices.map((id): Vec3 => {
    const p = mesh.vertices[id]!
    return [(p[0] - origin[0]) / extent, (p[1] - origin[1]) / extent, (p[2] - origin[2]) / extent]
  })
  const farthest = points.reduce((a, b) => (length(a) >= length(b) ? a : b))
  const normal = points
    .map((p) => cross(farthest, p))
    .reduce((a, b) => (length(a) >= length(b) ? a : b))
  requireScene(
    Math.hypot(...normal) > 1e-12,
    'vertices',
    'Escolha pontos que não estejam todos na mesma linha.',
  )
  const axis = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)))
  const flat = points.map((p) =>
    axis === 0 ? [p[1], p[2]] : axis === 1 ? [p[0], p[2]] : [p[0], p[1]],
  )
  const center = [0, 1].map((i) => flat.reduce((sum, p) => sum + p[i]!, 0) / flat.length)
  const cycle = vertices
    .map((id, i) => ({
      id,
      angle: Math.atan2(flat[i]![1]! - center[1]!, flat[i]![0]! - center[0]!),
    }))
    .sort((a, b) => a.angle - b.angle || a.id.localeCompare(b.id))
    .map(({ id }) => id)
  const sides = new Set(cycle.map((a, i) => meshEdgeKey(a, cycle[(i + 1) % cycle.length]!)))
  requireScene(
    !strict || constraints.every(([a, b]) => sides.has(meshEdgeKey(a, b))),
    'edges',
    'Essas linhas não delimitam uma única face. Escolha as linhas do contorno.',
  )
  return cycle
}

/** The plan resolves topology once; material choice and publication stay in the preview owner. */
export function prepareMeshCreation(
  mesh: SceneMeshGeometry,
  selection: Selection,
): MeshCreationPlan {
  requireScene(
    selection.mode !== 'face',
    'selection',
    'Escolha pontos ou linhas para criar a face.',
  )
  const vertices = meshComponentVertices(mesh, selection)
  requireScene(
    vertices.length >= 2 && vertices.length <= SCENE_LIMITS.faceCorners,
    'vertices',
    'Escolha dois pontos para criar uma linha, ou pelo menos três para criar uma face.',
  )
  if (vertices.length === 2) {
    requireScene(
      selection.mode === 'vertex',
      'selection',
      'Escolha pelo menos duas linhas para criar uma face.',
    )
    return {
      materials: [],
      apply(_material?: string, _nextId = newId) {
        return {
          mesh: createMeshLooseEdge(mesh, vertices),
          faceIds: [],
          mode: 'edge',
          ids: [meshEdgeKey(vertices[0]!, vertices[1]!)],
        }
      },
    }
  }
  const edges = meshComponentEdges(mesh)
  const chosen = new Set(vertices)
  const constraints =
    selection.mode === 'edge'
      ? [...new Set(selection.ids)].map((id) => edges.get(id)!)
      : [...edges.values()].filter(([a, b]) => chosen.has(a) && chosen.has(b))
  const edgePair = selection.mode === 'edge' && selection.ids.length === 2
  const edgeIndex = edgePair ? indexMeshEdges(mesh).edges : null
  const borderPair = edgePair && selection.ids.every((id) => edgeIndex?.get(id)?.length === 1)
  const boundaryPair = borderPair && vertices.length === 4
  const first = boundaryPair ? edgeIndex!.get(selection.ids[0]!)![0]! : null
  const second = boundaryPair ? edgeIndex!.get(selection.ids[1]!)![0]! : null
  const cycle =
    first && second
      ? [first.b, first.a, second.b, second.a]
      : creationCycle(mesh, vertices, constraints, selection.mode === 'edge')
  const border = cycle.map((a, i) => meshEdgeKey(a, cycle[(i + 1) % cycle.length]!))
  const choices = meshHoleMaterials(mesh, border)
  // Two border lines close an opening: the new face continues the first line's face. Lines
  // inside the surface may touch faces painted differently, so the choice stays with the child.
  const firstBorder = borderPair ? edgeIndex!.get(selection.ids[0]!)![0]! : null
  const edgeMaterial = firstBorder ? (mesh.faces[firstBorder.faceId]!.materialId ?? '') : undefined
  return {
    materials: borderPair ? [] : choices,
    apply(material?: string, nextId = newId) {
      const result = createMeshFaceFromCycle(mesh, cycle, material ?? edgeMaterial, nextId, {
        allowNonPlanar: boundaryPair,
      })
      return { ...result, mode: 'face', ids: result.faceIds }
    },
  }
}
