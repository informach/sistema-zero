import type { ShapeFaceId, Vec3 } from '../core/model'
import type { ScenePrimitiveGeometry, SceneUvTransform, Vec2 } from './document'
import type { MeshCutPlane } from './meshPlaneCut'
import { primitiveMesh } from './primitiveMesh'
import { requireScene, tuple } from './validation'

/** Exact axis cuts retain native boxes, their local origin, and each exterior UV function. */
export function splitSceneBox(
  source: ScenePrimitiveGeometry & { kind: 'box' },
  plane: MeshCutPlane,
  capId: string,
): [ScenePrimitiveGeometry, ScenePrimitiveGeometry] | null {
  tuple(plane.origin, 3, 'plane.origin')
  tuple(plane.normal, 3, 'plane.normal')
  requireScene(
    Math.hypot(...plane.normal) > 0 && Number.isFinite(Math.hypot(...plane.normal)),
    'plane',
    'Escolha um plano de corte válido.',
  )
  const axes = ([0, 1, 2] as const).filter((axis) => plane.normal[axis] !== 0)
  if (axes.length !== 1) return null
  const axis = axes[0]!,
    at = plane.origin[axis]
  requireScene(
    Number.isFinite(at) && at > source.from[axis] && at < source.to[axis],
    'cut',
    'O plano precisa atravessar o volume da peça.',
  )
  const original = primitiveMesh(source).mesh
  const halves = [false, true].map((upper): ScenePrimitiveGeometry => {
    const from: Vec3 = [...source.from],
      to: Vec3 = [...source.to]
    if (upper) from[axis] = at
    else to[axis] = at
    const result: ScenePrimitiveGeometry = { ...source, from, to, surfaces: {} }
    const shape = primitiveMesh(result).mesh
    const capFace = `${upper ? 'n' : 'p'}${'xyz'[axis]}`
    for (const [faceId, face] of Object.entries(shape.faces)) {
      if (faceId === capFace) {
        result.surfaces[faceId as ShapeFaceId] = {
          materialId: capId,
          uv: { origin: [0, 0], u: [1, 0], v: [0, 1] },
        }
        continue
      }
      const old = original.faces[faceId]!,
        origin = original.vertices[old.corners[0]!.vertexId]!
      const uEnd = original.vertices[old.corners[3]!.vertexId]!,
        vEnd = original.vertices[old.corners[1]!.vertexId]!
      const uAxis = ([0, 1, 2] as const).find((i) => uEnd[i] !== origin[i])!
      const vAxis = ([0, 1, 2] as const).find((i) => vEnd[i] !== origin[i])!
      const sample = (point: Vec3): Vec2 => {
        const u = (point[uAxis] - origin[uAxis]) / (uEnd[uAxis] - origin[uAxis])
        const v = (point[vAxis] - origin[vAxis]) / (vEnd[vAxis] - origin[vAxis])
        return [0, 1].map(
          (i) =>
            old.corners[0]!.uv[i]! +
            u * (old.corners[3]!.uv[i]! - old.corners[0]!.uv[i]!) +
            v * (old.corners[1]!.uv[i]! - old.corners[0]!.uv[i]!),
        ) as Vec2
      }
      const a = sample(shape.vertices[face.corners[0]!.vertexId]!),
        b = sample(shape.vertices[face.corners[3]!.vertexId]!),
        c = sample(shape.vertices[face.corners[1]!.vertexId]!)
      const uv: SceneUvTransform = {
        origin: a,
        u: [b[0] - a[0], b[1] - a[1]],
        v: [c[0] - a[0], c[1] - a[1]],
      }
      result.surfaces[faceId as ShapeFaceId] = {
        ...(old.materialId === undefined ? {} : { materialId: old.materialId }),
        uv,
      }
    }
    return result
  }) as [ScenePrimitiveGeometry, ScenePrimitiveGeometry]
  return plane.normal[axis] > 0 ? halves : [halves[1], halves[0]]
}
