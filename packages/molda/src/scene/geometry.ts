import type { Vec3 } from '../core/model'
import { triangleUnitNormal } from '../model/vec'
import type { SceneGeometry, Vec2 } from './document'
import { parametricMesh } from './parametricGeometry'
import { triangulateFace } from './triangulate'
import { requireScene } from './validation'

export interface SceneGeometryBuffers {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  /** Authorial corner index for each expanded draw vertex; never persisted or uploaded. */
  cornerIndices: Uint32Array
  faceIds: string[]
  /** null uses the node's default material. */
  materialIds: Array<string | null>
  issues: Array<{ faceId: string; code: 'degenerate' | 'self-intersection' | 'precision' }>
}

/** Derived only. No sanitizer, snap, source mutation or loss of per-corner UVs. */
export function buildSceneGeometry(geometry: SceneGeometry): SceneGeometryBuffers {
  const derived =
    geometry.kind === 'mesh' ? { mesh: geometry, surfaceByFace: null } : parametricMesh(geometry)
  const mesh = derived.mesh
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const cornerIndices: number[] = []
  const faceIds: string[] = []
  const materialIds: Array<string | null> = []
  const issues: SceneGeometryBuffers['issues'] = []
  for (const [key, face] of Object.entries(mesh.faces)) {
    const faceId = derived.surfaceByFace?.get(key) ?? key
    const points = face.corners.map((corner) => {
      const point = mesh.vertices[corner.vertexId]
      if (!point || !Object.hasOwn(mesh.vertices, corner.vertexId))
        throw new Error('Vértice ausente.')
      return point
    })
    const result = triangulateFace(points)
    if (result.status !== 'ok') {
      issues.push({ faceId, code: result.status })
      continue
    }
    for (const triangle of result.triangles) {
      const corners = triangle.map((index) => ({
        point: points[index],
        uv: face.corners[index]?.uv,
      }))
      const [a, b, c] = corners
      if (!a?.point || !b?.point || !c?.point) throw new Error('Triângulo incompleto.')
      const normal = triangleUnitNormal(a.point, b.point, c.point)
      cornerIndices.push(...triangle)
      for (const corner of corners) {
        if (!corner.point || !corner.uv) throw new Error('Canto incompleto.')
        positions.push(...corner.point)
        normals.push(...normal)
        uvs.push(...corner.uv)
      }
      faceIds.push(faceId)
      materialIds.push(face.materialId ?? null)
    }
  }
  const result: SceneGeometryBuffers = {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    uvs: Float32Array.from(uvs),
    cornerIndices: Uint32Array.from(cornerIndices),
    faceIds,
    materialIds,
    issues,
  }
  return validateBuffers(result)
}

function validateBuffers(buffers: SceneGeometryBuffers): SceneGeometryBuffers {
  requireScene(
    [buffers.positions, buffers.normals, buffers.uvs].every((buffer) =>
      buffer.every(Number.isFinite),
    ),
    'geometry',
    'A geometria excede a precisão de desenho.',
  )
  const collapsed = new Set<string>()
  const p = buffers.positions
  for (let triangle = 0; triangle < buffers.faceIds.length; triangle++) {
    const start = triangle * 9
    const x1 = (p[start + 3] ?? 0) - (p[start] ?? 0)
    const y1 = (p[start + 4] ?? 0) - (p[start + 1] ?? 0)
    const z1 = (p[start + 5] ?? 0) - (p[start + 2] ?? 0)
    const x2 = (p[start + 6] ?? 0) - (p[start] ?? 0)
    const y2 = (p[start + 7] ?? 0) - (p[start + 1] ?? 0)
    const z2 = (p[start + 8] ?? 0) - (p[start + 2] ?? 0)
    // Products of finite Float32 inputs fit in Float64, including its subnormal range.
    if (y1 * z2 === z1 * y2 && z1 * x2 === x1 * z2 && x1 * y2 === y1 * x2)
      collapsed.add(buffers.faceIds[triangle] ?? '')
  }
  if (!collapsed.size) return buffers
  const kept = buffers.faceIds.flatMap((id, triangle) => (collapsed.has(id) ? [] : [triangle]))
  const keep = (source: Float32Array, stride: number) => {
    const result = new Float32Array(kept.length * stride)
    kept.forEach((triangle, target) => {
      result.set(source.subarray(triangle * stride, (triangle + 1) * stride), target * stride)
    })
    return result
  }
  const cornerIndices = new Uint32Array(kept.length * 3)
  kept.forEach((triangle, target) => {
    cornerIndices.set(buffers.cornerIndices.subarray(triangle * 3, triangle * 3 + 3), target * 3)
  })
  return {
    positions: keep(buffers.positions, 9),
    normals: keep(buffers.normals, 9),
    uvs: keep(buffers.uvs, 6),
    cornerIndices,
    faceIds: kept.map((triangle) => buffers.faceIds[triangle] ?? ''),
    materialIds: kept.map((triangle) => buffers.materialIds[triangle] ?? null),
    issues: [
      ...buffers.issues,
      ...[...collapsed].map((faceId) => ({ faceId, code: 'precision' as const })),
    ],
  }
}

/** Read the same per-corner UV used for rendering/export during picking and painting. */
export function triangleUv(
  buffers: SceneGeometryBuffers,
  triangle: number,
  barycentric: Vec3,
): Vec2 {
  requireScene(
    Number.isInteger(triangle) && triangle >= 0 && triangle < buffers.faceIds.length,
    'triangle',
    'Triângulo ausente.',
  )
  const offset = triangle * 6
  return [
    (buffers.uvs[offset] ?? 0) * barycentric[0] +
      (buffers.uvs[offset + 2] ?? 0) * barycentric[1] +
      (buffers.uvs[offset + 4] ?? 0) * barycentric[2],
    (buffers.uvs[offset + 1] ?? 0) * barycentric[0] +
      (buffers.uvs[offset + 3] ?? 0) * barycentric[1] +
      (buffers.uvs[offset + 5] ?? 0) * barycentric[2],
  ]
}
