import type { SceneMeshGeometry, Vec2 } from './document'
import { indexMeshEdges, meshEdgeKey, meshFaceRegion } from './meshTopology'
import { requireScene } from './validation'

export function meshUvFaces(mesh: SceneMeshGeometry, ids: readonly string[]) {
  const selected = [...new Set(ids)]
  for (const id of selected)
    requireScene(Object.hasOwn(mesh.faces, id), 'faces', 'Essa face mudou. Escolha novamente.')
  return selected
}

/** UV connectivity is derived from exact per-corner coordinates, never welded by proximity. */
export function indexMeshUv(mesh: SceneMeshGeometry) {
  const topology = indexMeshEdges(mesh)
  const joined = new Set<string>()
  for (const [key, edges] of topology.edges) {
    if (edges.length !== 2) continue
    const [a, b] = edges
    if (!a || !b || a.a !== b.b || a.b !== b.a) continue
    const left = mesh.faces[a.faceId]!
    const right = mesh.faces[b.faceId]!
    if (left.materialId !== right.materialId) continue
    const a0 = left.corners[a.corner]!.uv
    const a1 = left.corners[(a.corner + 1) % left.corners.length]!.uv
    const b0 = right.corners[b.corner]!.uv
    const b1 = right.corners[(b.corner + 1) % right.corners.length]!.uv
    if (a0.every((v, i) => v === b1[i]) && a1.every((v, i) => v === b0[i])) joined.add(key)
  }
  const remaining = new Set(Object.keys(mesh.faces))
  const islands: string[][] = []
  const byFace = new Map<string, number>()
  for (const id of remaining) {
    const island = meshFaceRegion(topology, [id], undefined, joined)
    for (const face of island) {
      remaining.delete(face)
      byFace.set(face, islands.length)
    }
    islands.push(island)
  }
  return { islands, byFace, seams: [...topology.edges.keys()].filter((key) => !joined.has(key)) }
}

/** Existing canonical seams incident to the chosen faces; used inside the unfolding worker. */
export function meshUvSelectedSeams(mesh: SceneMeshGeometry, ids: readonly string[]) {
  const selected = meshUvFaces(mesh, ids)
  const existing = new Set(indexMeshUv(mesh).seams),
    chosen = new Set<string>()
  for (const id of selected) {
    const face = mesh.faces[id]!
    face.corners.forEach((corner, i) => {
      const key = meshEdgeKey(
        corner.vertexId,
        face.corners[(i + 1) % face.corners.length]!.vertexId,
      )
      if (existing.has(key)) chosen.add(key)
    })
  }
  return [...chosen]
}

/** Finite bounds without spreading a potentially million-corner mesh onto the JS stack. */
export function meshUvBounds(
  mesh: SceneMeshGeometry,
  ids: readonly string[] = Object.keys(mesh.faces),
) {
  const min: Vec2 = [Infinity, Infinity]
  const max: Vec2 = [-Infinity, -Infinity]
  for (const id of meshUvFaces(mesh, ids))
    for (const { uv } of mesh.faces[id]!.corners)
      for (const axis of [0, 1] as const) {
        min[axis] = Math.min(min[axis], uv[axis])
        max[axis] = Math.max(max[axis], uv[axis])
      }
  return min[0] === Infinity ? { min: [0, 0] as Vec2, max: [1, 1] as Vec2 } : { min, max }
}

/** Only UV changes. Positions, identities, corner order, materials and untouched references survive. */
export function mapMeshUv(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  map: (uv: Vec2, faceId: string, corner: number) => Vec2,
): SceneMeshGeometry {
  const selected = meshUvFaces(mesh, ids)
  const faces = { ...mesh.faces }
  let changed = false
  for (const id of selected) {
    const face = mesh.faces[id]!
    const corners = face.corners.map((corner, i) => {
      const uv = map(corner.uv, id, i)
      requireScene(
        uv.length === 2 && uv.every(Number.isFinite),
        'uv',
        'Esse ajuste ultrapassa o espaço da textura.',
      )
      return uv.every((v, axis) => v === corner.uv[axis]) ? corner : { ...corner, uv }
    })
    if (corners.some((corner, i) => corner !== face.corners[i])) {
      faces[id] = { ...face, corners }
      changed = true
    }
  }
  return changed ? { ...mesh, faces } : mesh
}
