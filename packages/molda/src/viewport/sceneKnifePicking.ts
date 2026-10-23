import { type Camera, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry } from '../scene/document'
import type { MeshKnifePoint } from '../scene/meshKnife'
import { symmetrySourceIds } from '../scene/meshSymmetry'
import { indexMeshEdges } from '../scene/meshTopology'
import type { SceneComponentPicker } from './sceneComponentPicking'
import type { SceneCutPicker } from './sceneCutPicking'
import type { SceneRenderResource } from './sceneRenderResource'
import { sceneSurfaceHit } from './sceneSurfaceHit'

/** Only the nearest visible authorial surface is cut. Snapping reuses the viewport's queries. */
export function pickSceneKnifePoint({
  canvas,
  camera,
  resource,
  mesh,
  nodeId,
  pointer,
  midpoint,
  edgesOnly = false,
  closePoint,
  edges,
  vertices,
}: {
  canvas: HTMLCanvasElement
  camera: Camera
  resource: SceneRenderResource
  mesh: SceneMeshGeometry
  nodeId: string
  pointer: { clientX: number; clientY: number }
  midpoint: boolean
  edgesOnly?: boolean
  closePoint?: { point: MeshKnifePoint; position: Vec3 } | null
  edges: SceneCutPicker
  vertices: SceneComponentPicker
}): MeshKnifePoint | null {
  const rect = canvas.getBoundingClientRect()
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    pointer.clientX < rect.left ||
    pointer.clientX > rect.right ||
    pointer.clientY < rect.top ||
    pointer.clientY > rect.bottom
  )
    return null
  const hit = sceneSurfaceHit(canvas, camera, resource, pointer)
  const instance = hit ? resource.instanceFor(hit.object) : null
  if (hit && (instance?.sourceNodeId !== nodeId || instance.id !== nodeId || instance.locked))
    return null
  const screen = {
    x: pointer.clientX - rect.left,
    y: pointer.clientY - rect.top,
    width: rect.width,
    height: rect.height,
  }
  if (closePoint && hit) {
    const world = new Vector3(...closePoint.position).applyMatrix4(hit.object.matrixWorld)
    const projected = world.clone().project(camera)
    if (
      projected.z >= -1 &&
      projected.z <= 1 &&
      Math.hypot(
        screen.x - ((projected.x + 1) * rect.width) / 2,
        screen.y - ((1 - projected.y) * rect.height) / 2,
      ) <= 12 &&
      edges.visible(resource, mesh, nodeId, camera, world)
    )
      return closePoint.point
  }
  const vertex =
    !edgesOnly &&
    vertices.pick(
      resource,
      mesh,
      { nodeId, mode: 'vertex', ids: [] },
      camera,
      {
        ...screen,
        radius: 12,
      },
      false,
      true,
    )
  if (vertex) return { kind: 'vertex', vertexId: symmetrySourceIds(mesh, 'vertex', [vertex])[0]! }
  const edge = edges.pick(resource, mesh, nodeId, camera, screen, midpoint)
  if (edge) {
    const incident = indexMeshEdges(mesh).edges.get(edge.edgeId)![0]!
    const [a, b] = [incident.a, incident.b].sort() as [string, string]
    const [sa, sb] = [a, b].map((id) => symmetrySourceIds(mesh, 'vertex', [id])[0]!)
    return {
      kind: 'edge',
      edgeId: symmetrySourceIds(mesh, 'edge', [edge.edgeId])[0]!,
      t: sa! < sb! ? edge.t : 1 - edge.t,
    }
  }
  if (edgesOnly || !hit || hit.faceIndex === undefined || hit.faceIndex === null) return null
  const faceId = resource.componentFaceFor(hit.object, hit.faceIndex)
  if (!faceId) return null
  const point = hit.object.worldToLocal(hit.point.clone())
  const sourceFace = symmetrySourceIds(mesh, 'face', [faceId])[0]!,
    local: [number, number, number] = [point.x, point.y, point.z]
  if (sourceFace !== faceId && mesh.symmetry)
    local[mesh.symmetry.axis] = 2 * mesh.symmetry.center - local[mesh.symmetry.axis]
  return { kind: 'face', faceId: sourceFace, point: local }
}
