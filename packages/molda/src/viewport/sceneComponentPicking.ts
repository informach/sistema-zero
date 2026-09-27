import { type Camera, Matrix4, Mesh, Raycaster, Vector2, Vector3, Vector4 } from 'three'
import type { SceneMeshGeometry } from '../scene/document'
import { meshComponentEdges, type SceneComponentSelection } from '../scene/meshComponents'
import { pointInSelection, type SceneSelectionRegion } from '../scene/regionSelection'
import { SceneOcclusionQuery } from './sceneOcclusionQuery'
import type { SceneRenderResource } from './sceneRenderResource'

/** Pixel picking uses CSS pixels, not world-unit ray thresholds that change with zoom/DPR. */
export class SceneComponentPicker {
  private disposed = false

  private occlusion(resource: SceneRenderResource, camera: Camera) {
    return new SceneOcclusionQuery(
      resource.root.children
        .filter((object) => object.visible)
        .filter((object) => object instanceof Mesh),
      camera,
    )
  }

  /** Complete-corner containment. Shared vertices are projected/raycast once per instance. */
  region(
    resource: SceneRenderResource,
    mesh: SceneMeshGeometry,
    selection: SceneComponentSelection,
    camera: Camera,
    region: SceneSelectionRegion,
    through: boolean,
  ): string[] {
    if (this.disposed) return []
    camera.updateMatrixWorld(true)
    const visible = through ? null : this.occlusion(resource, camera)
    try {
      const edges = selection.mode === 'edge' ? meshComponentEdges(mesh) : null
      const chosen = new Set<string>()
      for (const object of resource.root.children) {
        const instance = resource.instanceFor(object)
        if (!object.visible || instance?.sourceNodeId !== selection.nodeId || instance.locked)
          continue
        const contained = new Set<string>()
        for (const [id, point] of Object.entries(mesh.vertices)) {
          const world = new Vector3(...point).applyMatrix4(object.matrixWorld)
          const projected = world.clone().project(camera)
          if (!projected.toArray().every(Number.isFinite) || projected.z < -1 || projected.z > 1)
            continue
          if (!pointInSelection([(projected.x + 1) / 2, (1 - projected.y) / 2], region)) continue
          if (visible && !visible.visible(world)) continue
          contained.add(id)
        }
        if (selection.mode === 'vertex') for (const id of contained) chosen.add(id)
        else if (edges)
          for (const [id, endpoints] of edges) {
            if (endpoints.every((id) => contained.has(id))) chosen.add(id)
          }
        else
          for (const [id, face] of Object.entries(mesh.faces)) {
            if (face.corners.every((corner) => contained.has(corner.vertexId))) chosen.add(id)
          }
      }
      return [...chosen]
    } finally {
      visible?.dispose()
    }
  }

  pick(
    resource: SceneRenderResource,
    mesh: SceneMeshGeometry,
    selection: SceneComponentSelection,
    camera: Camera,
    pointer: { x: number; y: number; width: number; height: number; radius: number },
    through = false,
  ): string | null {
    if (this.disposed || selection.mode === 'face' || pointer.width <= 0 || pointer.height <= 0)
      return null
    const objects = resource.root.children.filter((object) => object.visible)
    camera.updateMatrixWorld(true)
    const visible = through ? null : this.occlusion(resource, camera)
    try {
      const projection = new Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      )
      const ray = new Raycaster()
      const edges = selection.mode === 'edge' ? meshComponentEdges(mesh) : null
      const best = { id: null as string | null, pixels: Infinity, depth: Infinity }
      const consider = (id: string, world: Vector3, pixels: number) => {
        if (pixels > pointer.radius || !Number.isFinite(pixels)) return
        const projected = world.clone().project(camera)
        ray.setFromCamera(new Vector2(projected.x, projected.y), camera)
        const depth = world.clone().sub(ray.ray.origin).dot(ray.ray.direction)
        if (depth < 0 || !Number.isFinite(depth)) return
        if (visible && !visible.visible(world)) return
        if (
          pixels < best.pixels - 0.25 ||
          (Math.abs(pixels - best.pixels) <= 0.25 && depth < best.depth)
        ) {
          best.id = id
          best.pixels = pixels
          best.depth = depth
        }
      }
      const screen = (clip: Vector4) =>
        new Vector2(
          ((clip.x / clip.w) * 0.5 + 0.5) * pointer.width,
          (0.5 - (clip.y / clip.w) * 0.5) * pointer.height,
        )
      const cursor = new Vector2(pointer.x, pointer.y)
      for (const object of objects) {
        const instance = resource.instanceFor(object)
        if (instance?.sourceNodeId !== selection.nodeId || instance.locked) continue
        const points = new Map(
          Object.entries(mesh.vertices).map(([id, point]) => {
            const world = new Vector3(...point).applyMatrix4(object.matrixWorld)
            const clip = new Vector4(world.x, world.y, world.z, 1).applyMatrix4(projection)
            return [id, { world, clip }] as const
          }),
        )
        if (!edges) {
          for (const [id, { world, clip }] of points) {
            if (
              clip.w <= 0 ||
              !clip.toArray().every(Number.isFinite) ||
              Math.max(Math.abs(clip.x), Math.abs(clip.y), Math.abs(clip.z)) > clip.w
            )
              continue
            consider(id, world, screen(clip).distanceTo(cursor))
          }
          continue
        }
        for (const [id, [a, b]] of edges) {
          const from = points.get(a)
          const to = points.get(b)
          if (!from || !to) continue
          const clipped = clipSegment(from.clip, to.clip)
          if (!clipped) continue
          const [start, end] = clipped
          const aClip = from.clip.clone().lerp(to.clip, start)
          const bClip = from.clip.clone().lerp(to.clip, end)
          if (aClip.w <= 0 || bClip.w <= 0) continue
          const aScreen = screen(aClip)
          const bScreen = screen(bClip)
          const segment = bScreen.clone().sub(aScreen)
          const length = segment.lengthSq()
          const t = length
            ? Math.max(0, Math.min(1, cursor.clone().sub(aScreen).dot(segment) / length))
            : 0
          const pixels = aScreen.addScaledVector(segment, t).distanceTo(cursor)
          // Perspective-correct interpolation recovers the point under the projected segment.
          const local = (t * aClip.w) / ((1 - t) * bClip.w + t * aClip.w)
          consider(id, from.world.clone().lerp(to.world, start + local * (end - start)), pixels)
        }
      }
      return best.id
    } finally {
      visible?.dispose()
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
  }
}

/** Clip before projection: edges crossing the camera/near plane must never wrap across the screen. */
function clipSegment(a: Vector4, b: Vector4): [number, number] | null {
  if (![...a.toArray(), ...b.toArray()].every(Number.isFinite)) return null
  let start = 0
  let end = 1
  for (const axis of ['x', 'y', 'z'] as const) {
    for (const sign of [-1, 1]) {
      const from = a.w + sign * a[axis]
      const to = b.w + sign * b[axis]
      if (from < 0 && to < 0) return null
      if (from < 0) start = Math.max(start, from / (from - to))
      else if (to < 0) end = Math.min(end, from / (from - to))
    }
  }
  return start <= end ? [start, end] : null
}
