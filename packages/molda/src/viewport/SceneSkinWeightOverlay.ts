import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Group,
  Mesh,
  Points,
  PointsMaterial,
  SkinnedMesh,
} from 'three'
import type { SceneMeshGeometry } from '../scene/document'
import type { indexSceneDocument } from '../scene/documentIndex'
import { SCENE_SKIN_LIMITS, type SceneSkinBinding } from '../scene/skin'
import { writeSceneSkinWeightColor } from '../scene/skinWeightColors'
import { requireScene } from '../scene/validation'
import type { SceneSkinPaintPreview } from '../state/sceneSkinPaintGesture'
import { markSceneAttributeUpload } from './sceneAttributeUpload'
import type { SceneRenderResource } from './sceneRenderResource'

export interface SceneSkinWeightTarget {
  nodeId: string
  jointId: string
}
interface Prepared {
  target: SceneSkinWeightTarget
  vertices: SceneMeshGeometry['vertices']
  weights: SceneSkinBinding['weights']
  positions: Float32Array
  colors: Float32Array
  offsets: ReadonlyMap<string, number>
}

/** Form-base colors have a detached, reversible draft. No authorial/model GPU attributes are borrowed. */
export class SceneSkinWeightOverlay {
  readonly root = new Group()
  private current: Prepared | null = null
  private geometry: BufferGeometry | null = null
  private attributes: { position: BufferAttribute; color: BufferAttribute } | null = null
  private material: PointsMaterial | null = null
  private instances = new Map<string, Points>()
  private disposed = false
  private draft: { token: object; touched: Set<number> } | null = null
  private readonly closed = new WeakSet<object>()

  constructor() {
    this.root.name = 'molda-skin-weight-points'
  }

  /** Pure staging: a bad revision must fail before the viewport replaces its current frame. */
  prepare(
    index: ReturnType<typeof indexSceneDocument>,
    target: SceneSkinWeightTarget | null,
  ): Prepared | null {
    if (this.disposed || !target) return null
    const node = index.scene.nodes.get(target.nodeId),
      mesh = node?.kind === 'mesh' ? index.geometries.get(node.geometryId) : null,
      skin = index.skinsByNode.get(target.nodeId)
    if (
      mesh?.kind !== 'mesh' ||
      !skin ||
      !skin.joints.some((joint) => joint.nodeId === target.jointId)
    )
      return null
    const previous = this.current,
      samePoints = previous?.vertices === mesh.vertices
    if (
      samePoints &&
      previous.weights === skin.weights &&
      previous.target.nodeId === target.nodeId &&
      previous.target.jointId === target.jointId
    )
      return previous
    const ids = Object.keys(mesh.vertices)
    requireScene(
      ids.length <= SCENE_SKIN_LIMITS.weightedVertices,
      'weights',
      'Pontos fora do orçamento de desenho.',
    )
    const positions = samePoints ? previous.positions : new Float32Array(ids.length * 3),
      colors = new Float32Array(ids.length * 3)
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!,
        weight =
          skin.weights[id]!.find((influence) => influence.jointId === target.jointId)?.weight ?? 0
      requireScene(
        Number.isFinite(weight) && weight >= 0 && weight <= 1,
        'weights',
        'A força não pode ser desenhada com segurança.',
      )
      if (!samePoints) {
        const point = mesh.vertices[id]!
        for (let axis = 0; axis < 3; axis++) {
          const value = Math.fround(point[axis]!)
          requireScene(
            Number.isFinite(value),
            'weights',
            'Os pontos excedem a precisão de desenho. Seus pesos continuam guardados.',
          )
          positions[i * 3 + axis] = value
        }
      }
      writeSceneSkinWeightColor(colors, i * 3, weight)
    }
    return {
      target: { ...target },
      vertices: mesh.vertices,
      weights: skin.weights,
      positions,
      colors,
      offsets: samePoints ? previous.offsets : new Map(ids.map((id, i) => [id, i * 3])),
    }
  }

  show(prepared: Prepared | null, resource: SceneRenderResource, through: boolean) {
    if (this.disposed) return
    const visible = prepared
      ? resource.root.children.filter(
          (object) =>
            object.visible &&
            object instanceof Mesh &&
            !(object instanceof SkinnedMesh) &&
            resource.instanceFor(object)?.sourceNodeId === prepared.target.nodeId,
        )
      : []
    if (!prepared || !visible.length) {
      this.clear()
      return
    }
    if (this.current !== prepared) this.preview(null)
    if (
      !this.geometry ||
      !this.attributes ||
      this.attributes.position.count * 3 !== prepared.positions.length
    ) {
      this.clear()
      this.attributes = {
        position: new BufferAttribute(prepared.positions.slice(), 3).setUsage(DynamicDrawUsage),
        color: new BufferAttribute(prepared.colors.slice(), 3).setUsage(DynamicDrawUsage),
      }
      this.geometry = new BufferGeometry()
        .setAttribute('position', this.attributes.position)
        .setAttribute('color', this.attributes.color)
      this.material = new PointsMaterial({
        vertexColors: true,
        size: 8,
        sizeAttenuation: false,
        toneMapped: false,
        fog: false,
        transparent: true,
        depthWrite: false,
      })
      for (const attribute of Object.values(this.attributes))
        attribute.onUpload(() => attribute.clearUpdateRanges())
    } else {
      for (const [name, values] of [
        ['position', prepared.positions],
        ['color', prepared.colors],
      ] as const) {
        if (values === (name === 'position' ? this.current?.positions : this.current?.colors))
          continue
        const attribute = this.attributes[name]
        let start = Infinity,
          end = -Infinity
        for (let i = 0; i < values.length; i++) {
          if (attribute.array[i] === values[i]) continue
          attribute.array[i] = values[i]!
          start = Math.min(start, i)
          end = i + 1
        }
        markSceneAttributeUpload(attribute, start, end)
      }
    }
    this.material!.depthTest = !through
    const active = new Set<string>()
    for (const object of visible) {
      const instance = resource.instanceFor(object)!
      active.add(instance.id)
      let points = this.instances.get(instance.id)
      if (!points) {
        points = new Points(this.geometry, this.material!)
        points.name = instance.id
        points.matrixAutoUpdate = false
        // Full affine/shear transforms must not be culled by an underestimated transformed sphere.
        points.frustumCulled = false
        points.renderOrder = 1
        this.instances.set(instance.id, points)
        this.root.add(points)
      }
      points.matrix.fromArray(instance.worldMatrix)
      points.matrixWorldNeedsUpdate = true
    }
    for (const [id, points] of this.instances)
      if (!active.has(id)) {
        points.removeFromParent()
        this.instances.delete(id)
      }
    this.current = prepared
    this.root.updateMatrixWorld(true)
  }

  /** Atomic local deltas. An empty first packet opens a token; closed tokens cannot be replayed. */
  preview(preview: SceneSkinPaintPreview | null): boolean {
    const prepared = this.current,
      attribute = this.attributes?.color
    if (this.disposed || !prepared || !attribute) return false
    if (!preview) {
      const draft = this.draft
      this.draft = null
      if (!draft) return false
      this.closed.add(draft.token)
      let start = Infinity,
        end = -Infinity
      for (const offset of draft.touched)
        for (let axis = 0; axis < 3; axis++) {
          const at = offset + axis
          if (attribute.array[at] === prepared.colors[at]) continue
          attribute.array[at] = prepared.colors[at]!
          start = Math.min(start, at)
          end = Math.max(end, at + 1)
        }
      markSceneAttributeUpload(attribute, start, end)
      return end > start
    }
    const skin = preview.source.skins?.find((skin) => skin.nodeId === preview.nodeId),
      node = preview.source.nodes.find((node) => node.id === preview.nodeId),
      mesh =
        node?.kind === 'mesh'
          ? preview.source.geometries.find((mesh) => mesh.id === node.geometryId)
          : null
    if (
      preview.nodeId !== prepared.target.nodeId ||
      preview.jointId !== prepared.target.jointId ||
      skin?.weights !== prepared.weights ||
      mesh?.kind !== 'mesh' ||
      mesh.vertices !== prepared.vertices ||
      this.closed.has(preview.token)
    )
      return false
    if (preview.token !== this.draft?.token) {
      if (preview.delta.size) return false
      const changed = this.preview(null)
      this.draft = { token: preview.token, touched: new Set() }
      return changed
    }
    // Finish validation before touching the live attribute or its pending upload range.
    for (const [id, weight] of preview.delta) {
      requireScene(prepared.offsets.has(id), 'weights', 'Esse ponto não existe mais.')
      requireScene(
        Number.isFinite(weight) && weight >= 0 && weight <= 1,
        'weights',
        'A força não pode ser desenhada com segurança.',
      )
    }
    let start = Infinity,
      end = -Infinity
    const color = new Float32Array(3)
    for (const [id, weight] of preview.delta) {
      const offset = prepared.offsets.get(id)!
      writeSceneSkinWeightColor(color, 0, weight)
      for (let axis = 0; axis < 3; axis++) {
        const at = offset + axis
        if (attribute.array[at] === color[axis]) continue
        attribute.array[at] = color[axis]!
        this.draft.touched.add(offset)
        start = Math.min(start, at)
        end = Math.max(end, at + 1)
      }
    }
    markSceneAttributeUpload(attribute, start, end)
    return end > start
  }

  private clear() {
    if (this.draft) this.closed.add(this.draft.token)
    this.draft = null
    this.root.clear()
    this.instances.clear()
    this.geometry?.dispose()
    this.material?.dispose()
    this.geometry = null
    this.attributes = null
    this.material = null
    this.current = null
  }
  dispose() {
    if (this.disposed) return
    this.clear()
    this.disposed = true
  }
}
