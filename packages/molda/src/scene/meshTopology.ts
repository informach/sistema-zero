import { newId } from '../core/id'
import type { SceneMeshGeometry } from './document'
import { requireScene, id as validateId } from './validation'

export const meshEdgeKey = (a: string, b: string) => JSON.stringify(a < b ? [a, b] : [b, a])

export function meshIdAllocator(mesh: SceneMeshGeometry, nextId: () => string = newId) {
  const taken = new Set([...Object.keys(mesh.vertices), ...Object.keys(mesh.faces)])
  return () => {
    const id = validateId(nextId(), 'id')
    requireScene(id !== '__proto__', 'id', 'Essa identidade é reservada. Tente novamente.')
    requireScene(!taken.has(id), 'id', 'Essa identidade já está em uso.')
    taken.add(id)
    return id
  }
}

export interface SceneHalfEdge {
  faceId: string
  corner: number
  a: string
  b: string
}

/** Linear incidence index. A non-manifold edge keeps every incident face, not a quadratic clique. */
export function indexMeshEdges(mesh: SceneMeshGeometry) {
  const edges = new Map<string, SceneHalfEdge[]>()
  const byFace = new Map<string, string[]>()
  for (const [faceId, face] of Object.entries(mesh.faces)) {
    const keys: string[] = []
    for (let corner = 0; corner < face.corners.length; corner++) {
      const a = face.corners[corner]?.vertexId
      const b = face.corners[(corner + 1) % face.corners.length]?.vertexId
      if (!a || !b) throw new Error('Canto ausente.')
      const key = meshEdgeKey(a, b)
      keys.push(key)
      const incident = edges.get(key) ?? []
      incident.push({ faceId, corner, a, b })
      edges.set(key, incident)
    }
    byFace.set(faceId, keys)
  }
  return { edges, byFace }
}

export function meshFaceRegion(
  index: ReturnType<typeof indexMeshEdges>,
  seeds: readonly string[],
  allowed?: ReadonlySet<string>,
  cross?: ReadonlySet<string>,
) {
  const chosen = new Set(
    seeds.filter((id) => index.byFace.has(id) && (!allowed || allowed.has(id))),
  )
  const queue = [...chosen]
  const crossed = new Set<string>()
  for (let i = 0; i < queue.length; i++) {
    for (const edge of index.byFace.get(queue[i] ?? '') ?? []) {
      if (cross && !cross.has(edge)) continue
      if (crossed.has(edge)) continue
      crossed.add(edge)
      for (const { faceId } of index.edges.get(edge) ?? []) {
        if (chosen.has(faceId) || (allowed && !allowed.has(faceId))) continue
        chosen.add(faceId)
        queue.push(faceId)
      }
    }
  }
  return queue
}
