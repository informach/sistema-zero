import type { SceneGeometry } from '../scene/document'
import { buildSceneGeometry } from '../scene/geometry'
import { requireScene } from '../scene/validation'
import type { GlbBinary } from './GlbBinary'
import type { SceneGlbIssue } from './sceneGlbReport'

/** Attribute/index accessors are shared even when nodes bind different default materials. */
export function prepareSceneGlbGeometry(
  geometry: SceneGeometry,
  binary: GlbBinary,
  issues: SceneGlbIssue[],
) {
  const built = buildSceneGeometry(geometry)
  for (const issue of built.issues)
    issues.push({
      code: 'face-omitted',
      sourceId: geometry.id,
      faceId: issue.faceId,
      reason: issue.code,
    })
  if (geometry.kind === 'mesh') {
    const used = new Set(
      Object.values(geometry.faces).flatMap((face) =>
        face.corners.map((corner) => corner.vertexId),
      ),
    )
    const vertices = Object.keys(geometry.vertices).filter((id) => !used.has(id)).length
    if (vertices || geometry.looseEdges.length)
      issues.push({
        code: 'loose-geometry',
        sourceId: geometry.id,
        edges: geometry.looseEdges.length,
        vertices,
      })
  }
  if (!built.faceIds.length) return null
  requireScene(
    built.positions.length / 3 < 65535,
    'export.geometry',
    'A malha ultrapassa o orçamento de índices do GLB.',
  )
  const attributes = {
    POSITION: binary.floats(built.positions, 'VEC3', true, 34962),
    NORMAL: binary.floats(built.normals, 'VEC3', false, 34962),
    TEXCOORD_0: binary.floats(
      built.uvs.map((value, component) => (component % 2 === 0 ? value : 1 - value)),
      'VEC2',
      false,
      34962,
    ),
  }
  const groups = new Map<string | null, number[]>()
  for (const [triangle, material] of built.materialIds.entries()) {
    const indices = groups.get(material) ?? []
    indices.push(triangle * 3, triangle * 3 + 1, triangle * 3 + 2)
    groups.set(material, indices)
  }
  return {
    built,
    triangles: built.faceIds.length,
    groups: [...groups].map(([materialId, indices]) => ({
      materialId,
      indices: binary.indices(Uint16Array.from(indices)),
      attributes,
    })),
  }
}
