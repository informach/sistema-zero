import {
  BufferAttribute,
  BufferGeometry,
  type Camera,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  SkinnedMesh,
  Vector2,
  Vector3,
} from 'three'
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh'

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
          setBoundsTree(geometry, new MeshBVH(geometry, options))
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

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.targets.length = 0
    for (const geometry of this.geometries.values()) {
      setBoundsTree(geometry, undefined)
      geometry.dispose()
    }
    this.geometries.clear()
    this.material.dispose()
  }
}
