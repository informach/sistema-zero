import { type Camera, Matrix4, Mesh, Vector3, Vector4 } from 'three'
import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry } from '../scene/document'
import { indexMeshEdges } from '../scene/meshTopology'
import type { SceneCutPoint } from '../scene/solidCutPoints'
import { SceneOcclusionQuery } from './sceneOcclusionQuery'
import type { SceneRenderResource } from './sceneRenderResource'

/** Authorial edges, CSS-pixel tolerance, perspective-correct local parameter and nearest visible hit. */
function prepareSceneCutEdgePick(
  resource: SceneRenderResource,
  mesh: SceneMeshGeometry,
  nodeId: string,
  camera: Camera,
) {
  const objects = resource.root.children
    .filter((object) => object.visible)
    .filter((object) => object instanceof Mesh)
  const occlusion = new SceneOcclusionQuery(objects, camera)
  const topology = indexMeshEdges(mesh)
  return {
    dispose: () => occlusion.dispose(),
    visible: (point: Vector3) => occlusion.visible(point),
    visibleSegments: (segments: readonly (readonly [Vec3, Vec3])[]) =>
      occlusion.visibleSegments(segments),
    pick: (
      pointer: { x: number; y: number; width: number; height: number },
      midpoint: boolean,
    ): SceneCutPoint | null => {
      if (pointer.width <= 0 || pointer.height <= 0) return null
      camera.updateMatrixWorld(true)
      const projection = new Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      )
      let best: { point: SceneCutPoint; pixels: number; depth: number } | null = null
      for (const object of objects) {
        const instance = resource.instanceFor(object)
        if (instance?.sourceNodeId !== nodeId || instance.locked || instance.id !== nodeId) continue
        for (const [edgeId, edges] of topology.edges) {
          const [a, b] = [edges[0]!.a, edges[0]!.b].sort()
          const start = new Vector3(...mesh.vertices[a!]!).applyMatrix4(object.matrixWorld)
          const end = new Vector3(...mesh.vertices[b!]!).applyMatrix4(object.matrixWorld)
          const clipA = new Vector4(start.x, start.y, start.z, 1).applyMatrix4(projection)
          const clipB = new Vector4(end.x, end.y, end.z, 1).applyMatrix4(projection)
          if (clipA.w <= 0 || clipB.w <= 0) continue
          const ax = ((clipA.x / clipA.w + 1) * pointer.width) / 2,
            ay = ((1 - clipA.y / clipA.w) * pointer.height) / 2
          const bx = ((clipB.x / clipB.w + 1) * pointer.width) / 2,
            by = ((1 - clipB.y / clipB.w) * pointer.height) / 2
          const length = (bx - ax) ** 2 + (by - ay) ** 2
          if (length === 0) continue
          const screenT = Math.max(
            0,
            Math.min(1, ((pointer.x - ax) * (bx - ax) + (pointer.y - ay) * (by - ay)) / length),
          )
          const pixels = Math.hypot(
            pointer.x - ax - screenT * (bx - ax),
            pointer.y - ay - screenT * (by - ay),
          )
          if (pixels > 12) continue
          const t = midpoint
            ? 0.5
            : (screenT * clipA.w) / ((1 - screenT) * clipB.w + screenT * clipA.w)
          const world = start.clone().lerp(end, t)
          const depth = world.clone().project(camera).z
          if (depth < -1 || depth > 1 || !occlusion.visible(world)) continue
          if (
            !best ||
            pixels < best.pixels - 0.25 ||
            (Math.abs(pixels - best.pixels) <= 0.25 && depth < best.depth)
          )
            best = { point: { edgeId, t }, pixels, depth }
        }
      }
      return best?.point ?? null
    },
  }
}

/** Own the spatial query for one render revision. Orbiting reuses it; geometry/visibility invalidates it. */
export class SceneCutPicker {
  private owner: {
    mesh: SceneMeshGeometry
    nodeId: string
    camera: Camera
    resource: SceneRenderResource
  } | null = null
  private query: ReturnType<typeof prepareSceneCutEdgePick> | null = null
  pick(
    resource: SceneRenderResource,
    mesh: SceneMeshGeometry,
    nodeId: string,
    camera: Camera,
    pointer: { x: number; y: number; width: number; height: number },
    midpoint: boolean,
  ) {
    return this.acquire(resource, mesh, nodeId, camera).pick(pointer, midpoint)
  }
  visible(
    resource: SceneRenderResource,
    mesh: SceneMeshGeometry,
    nodeId: string,
    camera: Camera,
    point: Vector3,
  ) {
    return this.acquire(resource, mesh, nodeId, camera).visible(point)
  }
  visibleSegments(
    resource: SceneRenderResource,
    mesh: SceneMeshGeometry,
    nodeId: string,
    camera: Camera,
    segments: readonly (readonly [Vec3, Vec3])[],
  ) {
    return this.acquire(resource, mesh, nodeId, camera).visibleSegments(segments)
  }
  private acquire(
    resource: SceneRenderResource,
    mesh: SceneMeshGeometry,
    nodeId: string,
    camera: Camera,
  ) {
    if (
      !this.owner ||
      this.owner.mesh !== mesh ||
      this.owner.nodeId !== nodeId ||
      this.owner.camera !== camera ||
      this.owner.resource !== resource
    ) {
      this.dispose()
      this.query = prepareSceneCutEdgePick(resource, mesh, nodeId, camera)
      this.owner = { resource, mesh, nodeId, camera }
    }
    return this.query!
  }
  dispose() {
    this.query?.dispose()
    this.query = null
    this.owner = null
  }
}

export function pickSceneCutEdge(
  resource: SceneRenderResource,
  mesh: SceneMeshGeometry,
  nodeId: string,
  camera: Camera,
  pointer: { x: number; y: number; width: number; height: number },
  midpoint: boolean,
) {
  const picker = new SceneCutPicker()
  try {
    return picker.pick(resource, mesh, nodeId, camera, pointer, midpoint)
  } finally {
    picker.dispose()
  }
}
