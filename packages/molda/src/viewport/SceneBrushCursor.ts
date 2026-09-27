import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three'
import type { Vec3 } from '../core/model'

export interface SceneBrushSurface {
  point: Vec3
  normal: Vec3
}

/** A world-size tangent guide, not a prediction of geodesic coverage. Owns only its small line buffers. */
export class SceneBrushCursor {
  readonly root = new Group()
  private line: LineSegments<BufferGeometry, LineBasicMaterial> | null = null
  private readonly normal = new Vector3()
  private readonly axis = new Vector3(0, 0, 1)
  private disposed = false

  constructor() {
    this.root.name = 'molda-skin-brush-cursor'
    this.root.visible = false
  }

  show(surface: SceneBrushSurface | null, radius: number | null): boolean {
    if (this.disposed) return false
    const normalLength = surface ? Math.hypot(...surface.normal) : 0
    if (
      !surface ||
      radius === null ||
      radius <= 0 ||
      !Number.isFinite(Math.fround(radius)) ||
      Math.fround(radius) === 0 ||
      !surface.point.every((value) => Number.isFinite(Math.fround(Math.abs(value) + radius))) ||
      !surface.normal.every(Number.isFinite) ||
      !Number.isFinite(normalLength) ||
      normalLength === 0
    )
      return this.clear()
    const { point, normal } = surface
    if (
      this.root.visible &&
      this.root.position.x === point[0] &&
      this.root.position.y === point[1] &&
      this.root.position.z === point[2] &&
      this.normal.x === normal[0] &&
      this.normal.y === normal[1] &&
      this.normal.z === normal[2] &&
      this.root.scale.x === radius
    )
      return false
    if (!this.line) {
      const positions = new Float32Array(64 * 6),
        colors = new Float32Array(positions.length),
        geometry = new BufferGeometry(),
        material = new LineBasicMaterial({
          vertexColors: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        })
      for (let segment = 0; segment < 64; segment++)
        for (let end = 0; end < 2; end++) {
          const angle = ((segment + end) * Math.PI * 2) / 64,
            offset = segment * 6 + end * 3,
            color = Math.floor(segment / 2) % 2
          positions[offset] = Math.cos(angle)
          positions[offset + 1] = Math.sin(angle)
          colors.fill(color, offset, offset + 3)
        }
      geometry.setAttribute('position', new BufferAttribute(positions, 3))
      geometry.setAttribute('color', new BufferAttribute(colors, 3))
      this.line = new LineSegments(geometry, material)
      this.line.frustumCulled = false
      this.line.renderOrder = 2
      this.root.add(this.line)
    }
    this.normal.set(...normal)
    this.root.position.set(...point)
    this.root.quaternion.setFromUnitVectors(
      this.axis,
      new Vector3(normal[0] / normalLength, normal[1] / normalLength, normal[2] / normalLength),
    )
    this.root.scale.setScalar(radius)
    this.root.visible = true
    return true
  }

  clear(): boolean {
    const changed = this.root.visible
    this.root.visible = false
    return changed
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.clear()
    this.line?.geometry.dispose()
    this.line?.material.dispose()
    this.line = null
    this.root.clear()
    this.root.removeFromParent()
  }
}
