import {
  Bone,
  Box3,
  BufferAttribute,
  type BufferGeometry,
  DetachedBindMode,
  type Material,
  Matrix4,
  Skeleton,
  SkinnedMesh,
  Sphere,
} from 'three'
import type { Bounds } from '../model/transform'
import type { SceneMeshGeometry } from '../scene/document'
import type { SceneGeometryBuffers } from '../scene/geometry'
import type { AffineMatrix } from '../scene/matrix'
import { SCENE_SKIN_LIMITS } from '../scene/skin'
import { prepareSceneSkinDraw, type SceneSkinDraw, sceneSkinDrawBounds } from '../scene/skinDraw'
import { type PreparedSceneSkin, sceneSkinPalette } from '../scene/skinPose'
import { requireScene } from '../scene/validation'

/** Internal draw resource.
 * One owned geometry/skeleton per binding; mirrors can share the same local deformation.
 * Flat bones hold the pure palette, so scene hierarchy/timeline remain authoritative.
 */
export class SceneSkinResource {
  readonly geometry: BufferGeometry
  readonly skeleton: Skeleton
  private prepared: PreparedSceneSkin | null
  private draw: SceneSkinDraw | null
  private palette: Float64Array | null = null
  private readonly meshes = new Set<SkinnedMesh>()
  private readonly box = new Box3()
  private readonly sphere = new Sphere()

  constructor(
    prepared: PreparedSceneSkin,
    source: SceneMeshGeometry,
    buffers: SceneGeometryBuffers,
    base: BufferGeometry,
  ) {
    const draw = prepareSceneSkinDraw(prepared, source, buffers)
    const count = buffers.positions.length / 3
    requireScene(
      base.index === null,
      'skin',
      'O desenho precisa usar os cantos expandidos da malha.',
    )
    for (const [name, array, size] of [
      ['position', buffers.positions, 3],
      ['normal', buffers.normals, 3],
      ['uv', buffers.uvs, 2],
    ] as const) {
      const attribute = base.getAttribute(name)
      requireScene(
        attribute instanceof BufferAttribute &&
          attribute.array === array &&
          attribute.itemSize === size &&
          attribute.count === count,
        'skin',
        'A geometria de desenho pertence a outra malha.',
      )
    }
    this.prepared = prepared
    this.draw = draw
    // Disposing a geometry deletes its attributes' GPU buffers. Never borrow those of base.
    this.geometry = base.clone()
    const uv = this.geometry.getAttribute('uv') as BufferAttribute
    uv.onUpload(() => uv.clearUpdateRanges())
    this.geometry.setAttribute('skinIndex', new BufferAttribute(draw.indices, 4))
    this.geometry.setAttribute('skinWeight', new BufferAttribute(draw.weights, 4))
    const bones = prepared.joints.map(() => {
      const bone = new Bone()
      bone.matrixAutoUpdate = false
      return bone
    })
    this.skeleton = new Skeleton(
      bones,
      bones.map(() => new Matrix4()),
    )
  }

  /** Caller owns placement/materials and must set a pose before displaying the mesh. */
  createMesh<T extends Material | Material[]>(material: T): SkinnedMesh<BufferGeometry, T> {
    requireScene(
      this.prepared && this.palette,
      'skin',
      'Prepare a pose antes de mostrar o esqueleto.',
    )
    requireScene(
      this.meshes.size < SCENE_SKIN_LIMITS.bindings,
      'skin',
      'Há cópias demais deste esqueleto.',
    )
    const mesh = new SkinnedMesh(this.geometry, material)
    mesh.bindMode = DetachedBindMode
    mesh.bind(this.skeleton, new Matrix4())
    mesh.matrixAutoUpdate = false
    mesh.boundingBox = this.box.clone()
    mesh.boundingSphere = this.sphere.clone()
    this.meshes.add(mesh)
    return mesh
  }

  releaseMesh(mesh: SkinnedMesh): void {
    if (this.meshes.delete(mesh)) mesh.removeFromParent()
  }

  /** Owned CPU bounds snapshot. No vertex scan and no mutable Three object escapes. */
  localBounds(): Bounds | null {
    requireScene(this.prepared, 'skin', 'Esqueleto já descartado.')
    return this.box.isEmpty()
      ? null
      : {
          min: [this.box.min.x, this.box.min.y, this.box.min.z],
          max: [this.box.max.x, this.box.max.y, this.box.max.z],
        }
  }

  /** Prepare every binding first, then apply synchronously. No live mutation during preflight.
   * The closure owns its data; an intervening pose/disposal invalidates it.
   */
  preparePose(worldMatrices: ReadonlyMap<string, Readonly<AffineMatrix>>): () => boolean {
    requireScene(this.prepared && this.draw, 'skin', 'Esqueleto já descartado.')
    const palette = sceneSkinPalette(this.prepared, worldMatrices)
    requireScene(
      palette.every((value) => Number.isFinite(Math.fround(value))),
      'pose',
      'Essa pose ultrapassa a precisão de desenho.',
    )
    const previous = this.palette,
      changed = !previous || palette.some((value, i) => value !== previous[i]),
      bounds = changed ? sceneSkinDrawBounds(this.draw, palette) : null
    let consumed = false
    return () => {
      requireScene(this.prepared, 'skin', 'Esqueleto já descartado.')
      if (consumed) return false
      requireScene(this.palette === previous, 'pose', 'A pose preparada pertence a outro instante.')
      consumed = true
      if (!changed) return false
      for (const [i, bone] of this.skeleton.bones.entries()) {
        bone.matrix.fromArray(palette, i * 16)
        bone.matrixWorld.copy(bone.matrix)
      }
      this.box.makeEmpty()
      if (bounds) {
        this.box.min.fromArray(bounds.min)
        this.box.max.fromArray(bounds.max)
      }
      this.box.getBoundingSphere(this.sphere)
      for (const mesh of this.meshes) {
        mesh.boundingBox!.copy(this.box)
        mesh.boundingSphere!.copy(this.sphere)
      }
      // Also updates an allocated bone texture, without replacing its buffers.
      this.skeleton.update()
      this.palette = palette
      return true
    }
  }

  setPose(worldMatrices: ReadonlyMap<string, Readonly<AffineMatrix>>): boolean {
    return this.preparePose(worldMatrices)()
  }

  dispose(): void {
    if (!this.prepared) return
    this.prepared = null
    this.draw = null
    this.palette = null
    for (const mesh of this.meshes) mesh.removeFromParent()
    this.meshes.clear()
    this.geometry.dispose()
    this.skeleton.dispose()
  }
}
