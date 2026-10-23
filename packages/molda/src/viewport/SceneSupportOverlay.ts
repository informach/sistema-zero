import {
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { SCENE_LIMITS } from '../scene/limits'
import { requireScene } from '../scene/validation'
import type { SceneSupportPoint } from './sceneSupports'

/** Bounded, owned draw buffers. No document attributes, model geometry or Skeleton references. */
export class SceneSupportOverlay {
  readonly root = new Group()
  private readonly positions: BufferAttribute
  private readonly selectedPositions: BufferAttribute
  private readonly linePositions: BufferAttribute
  private readonly geometry: BufferGeometry
  private readonly selectedGeometry: BufferGeometry
  private readonly lineGeometry: BufferGeometry
  private readonly boneGeometry = new CylinderGeometry(0.16, 0.3, 1, 8)
  private readonly boneMaterial = new MeshBasicMaterial({
    color: 0x8b3fd9,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.9,
  })
  private readonly bones: InstancedMesh
  private readonly material = new PointsMaterial({
    color: 0xffffff,
    size: 16,
    sizeAttenuation: false,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  private readonly selectedMaterial = new PointsMaterial({
    color: 0xffd657,
    size: 23,
    sizeAttenuation: false,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  private readonly lineMaterial = new LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    depthTest: false,
    depthWrite: false,
  })
  private points: ReadonlyArray<{ id: string; locked: boolean }> = []
  private disposed = false

  constructor(private readonly capacity: number = SCENE_LIMITS.nodes) {
    requireScene(
      Number.isSafeInteger(capacity) && capacity > 0 && capacity <= SCENE_LIMITS.nodes,
      'supports',
      'Apoios fora do orçamento.',
    )
    this.positions = new BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(
      DynamicDrawUsage,
    )
    this.selectedPositions = new BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(
      DynamicDrawUsage,
    )
    this.linePositions = new BufferAttribute(new Float32Array(capacity * 6), 3).setUsage(
      DynamicDrawUsage,
    )
    this.geometry = new BufferGeometry().setAttribute('position', this.positions)
    this.selectedGeometry = new BufferGeometry().setAttribute('position', this.selectedPositions)
    this.lineGeometry = new BufferGeometry().setAttribute('position', this.linePositions)
    this.bones = new InstancedMesh(this.boneGeometry, this.boneMaterial, capacity)
    this.bones.count = 0
    this.bones.frustumCulled = false
    for (const [material, border] of [
      [this.material, 0x8b3fd9],
      [this.selectedMaterial, 0x8b3fd9],
    ] as const) {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.guideBorder = { value: new Color(border) }
        shader.fragmentShader = `uniform vec3 guideBorder;\n${shader.fragmentShader}`.replace(
          '#include <map_particle_fragment>',
          `
            float radius = length(gl_PointCoord - vec2(0.5));
            if (radius > 0.5) discard;
            diffuseColor.rgb = mix(diffuseColor.rgb, guideBorder, step(0.32, radius));
          `,
        )
      }
      material.customProgramCacheKey = () => 'molda-support-circle-v1'
    }
    const lines = new LineSegments(this.lineGeometry, this.lineMaterial),
      points = new Points(this.geometry, this.material),
      selected = new Points(this.selectedGeometry, this.selectedMaterial)
    this.root.name = 'molda-support-guides'
    this.root.visible = false
    for (const [i, object] of [lines, this.bones, points, selected].entries()) {
      object.frustumCulled = false
      object.renderOrder = 20 + i
      this.root.add(object)
    }
    this.geometry.setDrawRange(0, 0)
    this.selectedGeometry.setDrawRange(0, 0)
    this.lineGeometry.setDrawRange(0, 0)
  }

  update(points: readonly SceneSupportPoint[]) {
    requireScene(!this.disposed, 'supports', 'Os guias já foram liberados.')
    requireScene(points.length <= this.capacity, 'supports', 'Apoios fora do orçamento.')
    // Validate before touching any live buffer. Typed presentation data has no caller-owned arrays retained.
    for (const [i, point] of points.entries()) {
      requireScene(
        point.position.every((value) => Number.isFinite(Math.fround(value))),
        'supports',
        'Apoio fora da precisão de desenho.',
      )
      requireScene(
        point.parent === null ||
          (Number.isSafeInteger(point.parent) && point.parent >= 0 && point.parent < i),
        'supports',
        'Ligação de apoio inválida.',
      )
    }
    let pointChanged = false,
      selectedChanged = false,
      lineChanged = false,
      chosen = 0,
      lines = 0,
      boneCount = 0
    const start = new Vector3(),
      end = new Vector3(),
      direction = new Vector3(),
      middle = new Vector3(),
      rotation = new Quaternion(),
      scale = new Vector3(),
      matrix = new Matrix4(),
      up = new Vector3(0, 1, 0)
    const write = (attribute: BufferAttribute, slot: number, point: readonly number[]) => {
      let changed = false
      for (let axis = 0; axis < 3; axis++) {
        const value = Math.fround(point[axis]!),
          index = slot * 3 + axis
        if (attribute.array[index] !== value) {
          attribute.array[index] = value
          changed = true
        }
      }
      return changed
    }
    for (const [i, point] of points.entries()) {
      pointChanged = write(this.positions, i, point.position) || pointChanged
      if (point.selected)
        selectedChanged = write(this.selectedPositions, chosen++, point.position) || selectedChanged
      if (point.parent !== null) {
        start.fromArray(points[point.parent]!.position)
        end.fromArray(point.position)
        direction.subVectors(end, start)
        const length = direction.length()
        if (length > 0) {
          rotation.setFromUnitVectors(up, direction.multiplyScalar(1 / length))
          middle.addVectors(start, end).multiplyScalar(0.5)
          const radius = Math.max(0.025, Math.min(length * 0.15, 0.4))
          scale.set(radius, length, radius)
          matrix.compose(middle, rotation, scale)
          this.bones.setMatrixAt(boneCount, matrix)
        } else {
          matrix.makeScale(0, 0, 0)
          this.bones.setMatrixAt(boneCount, matrix)
        }
        boneCount++
        lineChanged =
          write(this.linePositions, lines++, points[point.parent]!.position) || lineChanged
        lineChanged = write(this.linePositions, lines++, point.position) || lineChanged
      }
    }
    if (pointChanged) this.positions.needsUpdate = true
    if (selectedChanged) this.selectedPositions.needsUpdate = true
    if (lineChanged) this.linePositions.needsUpdate = true
    if (lineChanged || this.bones.count !== boneCount) this.bones.instanceMatrix.needsUpdate = true
    this.bones.count = boneCount
    const changed =
      pointChanged ||
      selectedChanged ||
      lineChanged ||
      this.geometry.drawRange.count !== points.length ||
      this.selectedGeometry.drawRange.count !== chosen ||
      this.lineGeometry.drawRange.count !== lines ||
      this.root.visible !== points.length > 0
    this.geometry.setDrawRange(0, points.length)
    this.selectedGeometry.setDrawRange(0, chosen)
    this.lineGeometry.setDrawRange(0, lines)
    this.points = points.map(({ id, locked }) => ({ id, locked }))
    this.root.visible = points.length > 0
    return changed
  }

  hide() {
    const changed = this.root.visible
    this.root.visible = false
    this.points = []
    return changed
  }

  /** Explicit x-ray guides use a 44×44 CSS-pixel target; screen distance, depth, then ASCII ID break ties. */
  pick(
    camera: Camera,
    screen: { x: number; y: number; width: number; height: number },
  ): string | null {
    if (this.disposed || !this.root.visible) return null
    const { x, y, width, height } = screen
    if (
      ![x, y, width, height].every(Number.isFinite) ||
      width <= 0 ||
      height <= 0 ||
      x < 0 ||
      y < 0 ||
      x > width ||
      y > height
    )
      return null
    camera.updateMatrixWorld(true)
    const projected = new Vector3()
    let best: { id: string; distance: number; depth: number } | null = null
    for (const [i, point] of this.points.entries()) {
      if (point.locked) continue
      projected.fromBufferAttribute(this.positions, i).project(camera)
      if (
        ![projected.x, projected.y, projected.z].every(Number.isFinite) ||
        Math.abs(projected.x) > 1 ||
        Math.abs(projected.y) > 1 ||
        Math.abs(projected.z) > 1
      )
        continue
      const dx = ((projected.x + 1) * width) / 2 - x,
        dy = ((1 - projected.y) * height) / 2 - y,
        distance = dx * dx + dy * dy
      if (Math.abs(dx) > 22 || Math.abs(dy) > 22) continue
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance &&
          (projected.z < best.depth || (projected.z === best.depth && point.id < best.id)))
      ) {
        best = { id: point.id, distance, depth: projected.z }
      }
    }
    return best?.id ?? null
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.hide()
    this.geometry.dispose()
    this.selectedGeometry.dispose()
    this.lineGeometry.dispose()
    this.boneGeometry.dispose()
    this.material.dispose()
    this.selectedMaterial.dispose()
    this.lineMaterial.dispose()
    this.boneMaterial.dispose()
    this.root.clear()
  }
}
