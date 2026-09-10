import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { SceneMeshFace, SceneMeshGeometry, Vec2 } from './document'
import { SCENE_LIMITS } from './limits'
import { meshFaceFrame, requireAffineFaceUv, requireConvexMeshFace } from './meshFaceFrame'
import { uvMidpoint, vertexMidpoint } from './meshMidpoint'
import { meshEdgeKey, meshIdAllocator } from './meshTopology'
import { triangulateFace } from './triangulate'
import { number, requireScene } from './validation'

function subdivideOnce(
  mesh: SceneMeshGeometry,
  selected: ReadonlySet<string>,
  nextId: () => string,
) {
  const frames = new Map<string, ReturnType<typeof meshFaceFrame>>()
  const edges = new Map<string, { a: string; b: string; id: string }>()
  for (const id of selected) {
    const frame = meshFaceFrame(mesh, id)
    // Boundary points inserted for a neighbor are collinear, not a concavity to repair.
    requireConvexMeshFace(
      frame,
      'Essa face tem uma curva para dentro. Divida em triângulos antes de criar mais pontos.',
      true,
    )
    requireAffineFaceUv(frame)
    frames.set(id, frame)
    for (let i = 0; i < frame.face.corners.length; i++) {
      const a = frame.face.corners[i]!.vertexId
      const b = frame.face.corners[(i + 1) % frame.face.corners.length]!.vertexId
      const key = meshEdgeKey(a, b)
      if (!edges.has(key)) edges.set(key, { a, b, id: '' })
    }
  }
  const edgeFor = (face: SceneMeshFace, i: number) =>
    edges.get(
      meshEdgeKey(face.corners[i]!.vertexId, face.corners[(i + 1) % face.corners.length]!.vertexId),
    )
  // Preflight the complete result, including unselected neighbors and independent edges.
  const neighbors = new Set<string>()
  let triangles = 0
  for (const [id, face] of Object.entries(mesh.faces)) {
    if (selected.has(id)) {
      triangles += face.corners.length * 2
      continue
    }
    const added = face.corners.reduce((count, _corner, i) => count + (edgeFor(face, i) ? 1 : 0), 0)
    triangles += face.corners.length - 2 + added
    if (!added) continue
    requireScene(
      face.corners.length + added <= SCENE_LIMITS.faceCorners,
      'faces',
      'Uma face vizinha teria pontos demais. Divida essa face em triângulos primeiro.',
    )
    requireAffineFaceUv(meshFaceFrame(mesh, id))
    neighbors.add(id)
  }
  requireScene(
    triangles <= SCENE_LIMITS.triangles,
    'faces',
    'Essa divisão ultrapassa o orçamento de triângulos. Escolha menos faces ou divisões.',
  )
  requireScene(
    Object.keys(mesh.vertices).length + edges.size + selected.size <= SCENE_LIMITS.vertices,
    'vertices',
    'Essa divisão ultrapassa o orçamento de pontos.',
  )
  const addedLoose = mesh.looseEdges.reduce(
    (count, [a, b]) => count + (edges.has(meshEdgeKey(a, b)) ? 1 : 0),
    0,
  )
  requireScene(
    mesh.looseEdges.length + addedLoose <= SCENE_LIMITS.looseEdges,
    'edges',
    'Essa divisão ultrapassa o orçamento de arestas.',
  )
  const allocate = meshIdAllocator(mesh, nextId)
  const vertices = { ...mesh.vertices }
  const faces = { ...mesh.faces }
  for (const edge of edges.values()) {
    edge.id = allocate()
    const a = mesh.vertices[edge.a]!
    const b = mesh.vertices[edge.b]!
    vertices[edge.id] = vertexMidpoint(a, b)
  }
  const chosen: string[] = []
  const check = (face: SceneMeshFace) =>
    requireScene(
      triangulateFace(face.corners.map((c) => vertices[c.vertexId]!)).status === 'ok',
      'faces',
      'Essa divisão ficou pequena demais para desenhar. Use menos divisões.',
    )
  for (const [id, frame] of frames) {
    const { face, points } = frame
    const center = allocate()
    vertices[center] = [0, 1, 2].map((axis) =>
      number(
        points.reduce((sum, p) => sum + p[axis]! / points.length, 0),
        'vertices',
      ),
    ) as Vec3
    const centerUv = [0, 1].map((axis) =>
      number(
        face.corners.reduce((sum, c) => sum + c.uv[axis]! / points.length, 0),
        'uv',
      ),
    ) as Vec2
    for (let i = 0; i < face.corners.length; i++) {
      const previous = (i + face.corners.length - 1) % face.corners.length
      const next = (i + 1) % face.corners.length
      const child: SceneMeshFace = {
        ...face,
        corners: [
          face.corners[i]!,
          {
            vertexId: edgeFor(face, i)!.id,
            uv: uvMidpoint(face.corners[i]!.uv, face.corners[next]!.uv),
          },
          { vertexId: center, uv: centerUv },
          {
            vertexId: edgeFor(face, previous)!.id,
            uv: uvMidpoint(face.corners[previous]!.uv, face.corners[i]!.uv),
          },
        ],
      }
      check(child)
      const childId = i === 0 ? id : allocate()
      faces[childId] = child
      chosen.push(childId)
    }
  }
  for (const id of neighbors) {
    const source = mesh.faces[id]!
    const corners: SceneMeshFace['corners'] = []
    source.corners.forEach((corner, i) => {
      corners.push(corner)
      const edge = edgeFor(source, i)
      if (edge)
        corners.push({
          vertexId: edge.id,
          uv: uvMidpoint(corner.uv, source.corners[(i + 1) % source.corners.length]!.uv),
        })
    })
    faces[id] = { ...source, corners }
    check(faces[id]!)
  }
  const looseEdges: SceneMeshGeometry['looseEdges'] = mesh.looseEdges.flatMap(([a, b]) => {
    const edge = edges.get(meshEdgeKey(a, b))
    return edge
      ? [
          [a, edge.id],
          [edge.id, b],
        ]
      : [[a, b]]
  })
  return { mesh: { ...mesh, vertices, faces, looseEdges }, selected: new Set(chosen) }
}

/** Absolute 0–3 subdivision levels. Shared boundaries remain connected, without smoothing or UV reprojection. */
export function subdivideMeshFaces(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  levels: number,
  nextId: () => string = newId,
): SceneMeshGeometry {
  number(levels, 'levels', 0, 3, true)
  const selected = new Set(ids)
  for (const id of selected)
    requireScene(Object.hasOwn(mesh.faces, id), 'faces', 'Essa face não existe mais.')
  if (!levels || !selected.size) return mesh
  let result = { mesh, selected }
  for (let level = 0; level < levels; level++)
    result = subdivideOnce(result.mesh, result.selected, nextId)
  return result.mesh
}
