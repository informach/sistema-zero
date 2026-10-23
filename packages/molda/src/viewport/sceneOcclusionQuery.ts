import {
  BufferAttribute,
  BufferGeometry,
  type Camera,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  SkinnedMesh,
  Vector2,
  Vector3,
  Vector4,
} from 'three'
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh'
import type { Vec3 } from '../core/model'
import {
  clipCameraPolygon,
  type Interval,
  projectedBoxOverlaps,
  subtractOcclusion,
  triangleOcclusion,
} from './sceneSegmentVisibility'

/**
 * Duas cópias de three-mesh-bvh convivem no monorepo: o `@react-three/drei` do kids
 * fixa a 0.8 e o Molda usa a 0.9, e cada uma AUMENTA `BufferGeometry` com o seu próprio
 * `boundsTree`. Quem compila este arquivo pode ter a outra augmentação vencendo, e a
 * atribuição direta reprova. Escrever por uma visão local mantém o runtime idêntico
 * (o `acceleratedRaycast` desta MESMA cópia lê o campo) sem depender de qual venceu.
 */
function setBoundsTree(geometry: BufferGeometry, tree: MeshBVH | undefined): void {
  ;(geometry as unknown as { boundsTree: MeshBVH | undefined }).boundsTree = tree
}

/** Query-scoped spatial index. No global patches, retained cache, or mutation of render resources. */
export class SceneOcclusionQuery {
  private readonly material = new MeshBasicMaterial({ side: DoubleSide })
  private readonly geometries = new Map<BufferGeometry | SkinnedMesh, BufferGeometry>()
  private readonly targets: Mesh[] = []
  private readonly trees = new Map<BufferGeometry, MeshBVH>()
  private readonly ray = new Raycaster()
  private disposed = false

  constructor(
    objects: readonly Mesh[],
    private readonly camera: Camera,
  ) {
    try {
      for (const object of objects) {
        if (!object.geometry.getAttribute('position')?.count) continue
        // A shared base geometry does not imply the same bind matrices or current skeleton.
        const key = object instanceof SkinnedMesh ? object : object.geometry
        let geometry = this.geometries.get(key)
        if (!geometry) {
          const position = object.geometry.getAttribute('position')
          geometry = new BufferGeometry().setAttribute(
            'position',
            object instanceof SkinnedMesh
              ? new BufferAttribute(new Float64Array(position.count * 3), 3)
              : position.clone(),
          )
          this.geometries.set(key, geometry)
          if (object instanceof SkinnedMesh) {
            const target = geometry.getAttribute('position'),
              point = new Vector3()
            for (let i = 0; i < position.count; i++) {
              object.getVertexPosition(i, point)
              target.setXYZ(i, point.x, point.y, point.z)
            }
          }
          if (object.geometry.index) geometry.setIndex(object.geometry.index.clone())
          geometry.setDrawRange(object.geometry.drawRange.start, object.geometry.drawRange.count)
          const options = { indirect: true, setBoundingBox: false, maxLeafTris: 10 }
          const tree = new MeshBVH(geometry, options)
          this.trees.set(geometry, tree)
          setBoundsTree(geometry, tree)
        }
        const proxy = new Mesh(geometry, this.material)
        proxy.matrixAutoUpdate = false
        proxy.matrixWorld.copy(object.matrixWorld)
        proxy.raycast = acceleratedRaycast
        this.targets.push(proxy)
      }
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  visible(world: Vector3): boolean {
    if (this.disposed) return false
    const projected = world.clone().project(this.camera)
    this.ray.setFromCamera(new Vector2(projected.x, projected.y), this.camera)
    const depth = world.clone().sub(this.ray.ray.origin).dot(this.ray.ray.direction)
    if (depth < 0 || !Number.isFinite(depth)) return false
    const hit = this.ray.intersectObjects(this.targets, false).find((hit) => {
      const z = hit.point.clone().project(this.camera).z
      return z >= -1 && z <= 1
    })
    return !hit || hit.distance >= depth - Math.max(1, depth) * 1e-7
  }

  /** Exact visible centerline fragments; overlays may keep their full CSS width above a surface. */
  visibleSegments(segments: readonly (readonly [Vec3, Vec3])[]): Array<[Vec3, Vec3]> {
    if (this.disposed) return []
    this.camera.updateMatrixWorld(true)
    const projection = new Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    )
    const result: Array<[Vec3, Vec3]> = []
    for (const [start, end] of segments) {
      const worldA = new Vector3(...start),
        worldB = new Vector3(...end)
      const clipA = new Vector4(...start, 1).applyMatrix4(projection)
      const clipB = new Vector4(...end, 1).applyMatrix4(projection)
      // Clip the line against the near/far planes before projection.
      let from = 0,
        to = 1
      for (const distance of [(p: Vector4) => p.w + p.z, (p: Vector4) => p.w - p.z]) {
        const da = distance(clipA),
          db = distance(clipB)
        if (da < 0 && db < 0) {
          to = -1
          break
        }
        if (da < 0 !== db < 0) {
          const t = da / (da - db)
          if (da < 0) from = Math.max(from, t)
          else to = Math.min(to, t)
        }
      }
      if (from >= to) continue
      const ca = clipA.clone().lerp(clipB, from),
        cb = clipA.clone().lerp(clipB, to)
      if (ca.w <= 0 || cb.w <= 0) continue
      const a = new Vector3(ca.x, ca.y, ca.z).divideScalar(ca.w)
      const b = new Vector3(cb.x, cb.y, cb.z).divideScalar(cb.w)
      let intervals: Interval[] = [[0, 1]]
      for (const target of this.targets) {
        if (!intervals.length) break
        const localProjection = projection.clone().multiply(target.matrixWorld)
        this.trees.get(target.geometry)!.shapecast({
          intersectsBounds: (box) =>
            intervals.length > 0 && projectedBoxOverlaps(box, localProjection, a, b),
          intersectsTriangle: (triangle) => {
            const polygon = clipCameraPolygon(
              [triangle.a, triangle.b, triangle.c].map((p) =>
                new Vector4(p.x, p.y, p.z, 1).applyMatrix4(localProjection),
              ),
            ).map((p) => new Vector3(p.x, p.y, p.z).divideScalar(p.w))
            for (let i = 1; i + 1 < polygon.length; i++) {
              const blocked = triangleOcclusion(a, b, [polygon[0]!, polygon[i]!, polygon[i + 1]!])
              if (blocked) intervals = subtractOcclusion(intervals, blocked)
            }
            return !intervals.length
          },
        })
      }
      const world = (screenT: number): Vec3 => {
        const t = (screenT * ca.w) / ((1 - screenT) * cb.w + screenT * ca.w)
        return worldA
          .clone()
          .lerp(worldB, from + t * (to - from))
          .toArray() as Vec3
      }
      // Adjacent triangles may leave a few ULPs at their shared edge. A zero-area
      // numerical seam must not become a full round line cap in the overlay.
      for (const [a, b] of intervals)
        if (b - a > Number.EPSILON * 32) result.push([world(a), world(b)])
    }
    return result
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.targets.length = 0
    for (const geometry of this.geometries.values()) {
      setBoundsTree(geometry, undefined)
      geometry.dispose()
    }
    this.geometries.clear()
    this.trees.clear()
    this.material.dispose()
  }
}
