import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry, Vec2 } from './document'
import { SCENE_LIMITS } from './limits'
import { prepareMeshCoplanarSelection } from './meshCoplanarSelection'
import { prepareMeshInsetRegion } from './meshInsetRegion'
import { prepareMeshRegionVertices } from './meshRegionVertices'
import { indexMeshEdges, meshIdAllocator } from './meshTopology'
import { triangulateFace } from './triangulate'
import { number, requireScene } from './validation'

/** One proportional border per connected planar selection, preserving internal edges and paint. */
export function insetMeshFaces(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  ratio: number,
  nextId: () => string = newId,
): SceneMeshGeometry {
  number(ratio, 'ratio', 0, 0.95)
  const chosen = new Set(ids)
  for (const id of chosen)
    requireScene(Object.hasOwn(mesh.faces, id), 'faces', 'Essa face não existe mais.')
  if (!ratio || !chosen.size) return mesh
  const topology = indexMeshEdges(mesh)
  const planes = prepareMeshCoplanarSelection(mesh)
  const visited = new Set<string>()
  const regions = []
  for (const seed of chosen) {
    if (visited.has(seed)) continue
    const region = planes.faces([seed], chosen)
    for (const id of region) visited.add(id)
    regions.push(prepareMeshInsetRegion(mesh, region, topology))
  }
  const regionVertices = prepareMeshRegionVertices(mesh)
  const plans = regions.map((region) => ({
    ...region,
    ...regionVertices(
      region.ids,
      region.edges.map((edge) => edge.a),
    ),
  }))
  const triangles = Object.values(mesh.faces).reduce(
    (sum, face) => sum + face.corners.length - 2,
    0,
  )
  requireScene(
    triangles + plans.reduce((sum, region) => sum + region.edges.length * 2, 0) <=
      SCENE_LIMITS.triangles,
    'faces',
    'Essa borda ultrapassa o orçamento de triângulos.',
  )
  requireScene(
    Object.keys(mesh.vertices).length +
      plans.reduce((sum, region) => sum + region.copied.size, 0) <=
      SCENE_LIMITS.vertices,
    'vertices',
    'Essa borda ultrapassa o orçamento de pontos.',
  )
  const allocate = meshIdAllocator(mesh, nextId)
  const vertices = { ...mesh.vertices }
  const faces = { ...mesh.faces }
  for (const region of plans) {
    const mapping = new Map<string, string>()
    const uvAt = (uv: Vec2): Vec2 => [
      number(uv[0] * (1 - ratio) + region.centerUv[0] * ratio, 'uv'),
      number(uv[1] * (1 - ratio) + region.centerUv[1] * ratio, 'uv'),
    ]
    for (const id of region.points) {
      const target = region.copied.has(id) ? allocate() : id
      const p = mesh.vertices[id]!
      const point: Vec3 = [
        number(p[0] * (1 - ratio) + region.center[0] * ratio, 'vertices'),
        number(p[1] * (1 - ratio) + region.center[1] * ratio, 'vertices'),
        number(p[2] * (1 - ratio) + region.center[2] * ratio, 'vertices'),
      ]
      vertices[target] = point
      mapping.set(id, target)
    }
    for (const id of region.ids) {
      const face = mesh.faces[id]!
      faces[id] = {
        ...face,
        corners: face.corners.map((c) => ({
          ...c,
          vertexId: mapping.get(c.vertexId)!,
          uv: uvAt(c.uv),
        })),
      }
    }
    for (const edge of region.edges) {
      const source = mesh.faces[edge.faceId]!
      const a = source.corners[edge.corner]!
      const b = source.corners[(edge.corner + 1) % source.corners.length]!
      const corners = [
        a,
        b,
        { ...b, vertexId: mapping.get(edge.b)!, uv: uvAt(b.uv) },
        { ...a, vertexId: mapping.get(edge.a)!, uv: uvAt(a.uv) },
      ]
      requireScene(
        triangulateFace(corners.map((c) => vertices[c.vertexId]!)).status === 'ok',
        'faces',
        'Essa borda ficou pequena demais para desenhar. Tente outro valor.',
      )
      faces[allocate()] = { ...source, corners }
    }
  }
  return { ...mesh, vertices, faces }
}
