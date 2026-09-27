import { newId } from '../core/id'
import type { SceneMeshFace, SceneMeshGeometry } from './document'
import { mergeMeshFaces } from './meshMerge'
import { indexMeshEdges, meshFaceRegion, meshIdAllocator } from './meshTopology'
import { triangulateFace } from './triangulate'
import { choice, requireScene } from './validation'

export interface SceneFaceSelection {
  nodeId: string
  faceIds: readonly string[]
}

export type SceneFaceAction = 'remove' | 'triangulate' | 'flip' | 'detach' | 'merge'

/** Only explicitly chosen faces change. Coordinates, corner UV and paint remain authorial. */
export function editMeshFaces(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  action: SceneFaceAction,
  nextId: () => string = newId,
): SceneMeshGeometry {
  choice(action, ['remove', 'triangulate', 'flip', 'detach', 'merge'], 'action')
  if (action === 'merge') return mergeMeshFaces(mesh, ids)
  const selected = new Set(ids)
  for (const id of selected)
    requireScene(
      Object.hasOwn(mesh.faces, id),
      'faces',
      'Essa face não existe mais. Escolha novamente.',
    )
  if (!selected.size) return mesh
  const faces = { ...mesh.faces }
  const allocate = meshIdAllocator(mesh, nextId)
  if (action === 'detach') {
    const usedOutside = new Set(
      Object.entries(mesh.faces).flatMap(([id, face]) =>
        selected.has(id) ? [] : face.corners.map((c) => c.vertexId),
      ),
    )
    for (const edge of mesh.looseEdges) for (const vertex of edge) usedOutside.add(vertex)
    const copies = new Map<string, string>()
    const vertices = { ...mesh.vertices }
    for (const id of selected) {
      const face = mesh.faces[id]
      if (!face) throw new Error('Face ausente.')
      faces[id] = {
        ...face,
        corners: face.corners.map((corner) => {
          if (!usedOutside.has(corner.vertexId)) return corner
          let copy = copies.get(corner.vertexId)
          if (!copy) {
            copy = allocate()
            const point = mesh.vertices[corner.vertexId]
            if (!point) throw new Error('Vértice ausente.')
            vertices[copy] = [...point]
            copies.set(corner.vertexId, copy)
          }
          return { ...corner, vertexId: copy }
        }),
      }
    }
    return copies.size ? { ...mesh, vertices, faces } : mesh
  }
  let changed = false
  for (const id of selected) {
    const face = mesh.faces[id]
    if (!face) throw new Error('Face ausente.')
    if (action === 'remove') {
      delete faces[id]
      changed = true
      continue
    }
    if (action === 'triangulate' && face.corners.length === 3) continue
    const triangles = (value: SceneMeshFace) => {
      const result = triangulateFace(
        value.corners.map((corner) => {
          const point = mesh.vertices[corner.vertexId]
          if (!point) throw new Error('Vértice ausente.')
          return point
        }),
      )
      requireScene(
        result.status === 'ok',
        'faces',
        'A face se cruza ou não tem área. Ajuste seus pontos primeiro.',
      )
      return result.triangles
    }
    if (action === 'flip') {
      const first = face.corners[0]
      if (!first) throw new Error('Canto ausente.')
      const reversed = { ...face, corners: [first, ...face.corners.slice(1).reverse()] }
      const keys = (value: SceneMeshFace) =>
        triangles(value)
          .map((triangle) => JSON.stringify(triangle.map((i) => value.corners[i]?.vertexId).sort()))
          .sort()
      requireScene(
        JSON.stringify(keys(face)) === JSON.stringify(keys(reversed)),
        'faces',
        'Divida essa face em triângulos antes de virar, para manter a pintura no lugar.',
      )
      faces[id] = reversed
    } else {
      triangles(face).forEach((triangle, i) => {
        faces[i === 0 ? id : allocate()] = {
          ...face,
          corners: triangle.map((index) => {
            const corner = face.corners[index]
            if (!corner) throw new Error('Canto ausente.')
            return corner
          }),
        }
      })
    }
    changed = true
  }
  // Removing faces does not silently remove points or loose edges. Those are independently editable.
  return changed ? { ...mesh, faces } : mesh
}

/** Face connectivity crosses edges, not mere touching vertices. No quadratic adjacency matrix. */
export function connectedMeshFaces(mesh: SceneMeshGeometry, ids: readonly string[]): string[] {
  return meshFaceRegion(indexMeshEdges(mesh), ids)
}
