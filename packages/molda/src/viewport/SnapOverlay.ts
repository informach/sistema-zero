import {
  BufferGeometry,
  type Camera,
  DataTexture,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  NearestFilter,
  Points,
  PointsMaterial,
  RGBAFormat,
  UnsignedByteType,
  type Vector2,
  Vector3,
} from 'three'
import type { MoldaModelAsset, Vec3 } from '../core/model'
import {
  resolveSnapAnchor,
  type SnapAnchor,
  SnapAnchorCache,
  snapSourceAnchors,
  snapTargetAnchors,
} from '../model/snap'
import type { ViewportSnapState } from './types'

const SOURCE_COLOR = 0xffc928
const TARGET_COLOR = 0x35d07f
const MARKER_TEXTURE_SIZE = 32

function markerTexture(shape: 'circle' | 'diamond'): DataTexture {
  const pixels = new Uint8Array(MARKER_TEXTURE_SIZE * MARKER_TEXTURE_SIZE * 4)
  const center = (MARKER_TEXTURE_SIZE - 1) / 2
  const radius = MARKER_TEXTURE_SIZE * 0.38
  for (let y = 0; y < MARKER_TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < MARKER_TEXTURE_SIZE; x += 1) {
      const dx = Math.abs(x - center)
      const dy = Math.abs(y - center)
      const inside = shape === 'circle' ? dx * dx + dy * dy <= radius * radius : dx + dy <= radius
      if (!inside) continue
      const offset = (y * MARKER_TEXTURE_SIZE + x) * 4
      pixels[offset] = 255
      pixels[offset + 1] = 255
      pixels[offset + 2] = 255
      pixels[offset + 3] = 255
    }
  }
  const texture = new DataTexture(
    pixels,
    MARKER_TEXTURE_SIZE,
    MARKER_TEXTURE_SIZE,
    RGBAFormat,
    UnsignedByteType,
  )
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.needsUpdate = true
  return texture
}

function markerPoints(color: number, shape: 'circle' | 'diamond', size: number): Points {
  const material = new PointsMaterial({
    color,
    map: markerTexture(shape),
    alphaTest: 0.2,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    size,
    sizeAttenuation: false,
  })
  const points = new Points(new BufferGeometry(), material)
  points.frustumCulled = false
  points.renderOrder = 20
  return points
}

function setPoints(points: Points, anchors: readonly SnapAnchor[]): void {
  const positions = new Float32Array(anchors.length * 3)
  anchors.forEach((anchor, index) => {
    positions[index * 3] = anchor.point[0]
    positions[index * 3 + 1] = anchor.point[1]
    positions[index * 3 + 2] = anchor.point[2]
  })
  points.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  points.geometry.computeBoundingSphere()
  points.visible = anchors.length > 0
}

function singleAnchor(point: Vec3, ref: SnapAnchor['ref']): SnapAnchor[] {
  return [{ point, ref }]
}

/** Marcadores do fluxo de dois toques, completamente isolados do mesh do modelo. */
export class SnapOverlay {
  readonly group = new Group()
  private readonly cache = new SnapAnchorCache()
  private readonly sourcePoints = markerPoints(SOURCE_COLOR, 'circle', 11)
  private readonly chosenSource = markerPoints(SOURCE_COLOR, 'circle', 15)
  private readonly targetPoints = markerPoints(TARGET_COLOR, 'diamond', 12)
  private readonly hoveredTarget = markerPoints(TARGET_COLOR, 'diamond', 17)
  private readonly line = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({
      color: TARGET_COLOR,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    }),
  )
  private state: ViewportSnapState = { phase: 'inactive' }
  private model: MoldaModelAsset | null = null
  private sourceAnchors: SnapAnchor[] = []
  private targetAnchors: SnapAnchor[] = []
  private sourcePoint: Vec3 | null = null
  private targetPartId: string | null = null

  constructor() {
    this.group.renderOrder = 20
    this.line.frustumCulled = false
    this.line.renderOrder = 19
    this.group.add(
      this.line,
      this.sourcePoints,
      this.chosenSource,
      this.targetPoints,
      this.hoveredTarget,
    )
    this.clear()
  }

  setState(model: MoldaModelAsset, state: ViewportSnapState): void {
    this.model = model
    this.state = state
    this.targetPartId = null
    this.targetAnchors = []
    setPoints(this.targetPoints, [])
    setPoints(this.hoveredTarget, [])
    this.hideLine()
    if (state.phase === 'inactive') {
      this.clear()
      return
    }
    if (state.phase === 'source') {
      this.sourceAnchors = snapSourceAnchors(model, state.primaryId, state.movingIds, this.cache)
      this.sourcePoint = null
      setPoints(this.sourcePoints, this.sourceAnchors)
      setPoints(this.chosenSource, [])
      return
    }
    this.sourceAnchors = []
    this.sourcePoint = resolveSnapAnchor(model, state.source.ref, this.cache)
    setPoints(this.sourcePoints, [])
    setPoints(
      this.chosenSource,
      this.sourcePoint ? singleAnchor(this.sourcePoint, state.source.ref) : [],
    )
  }

  setTargetPart(partId: string | null): void {
    if (!this.model || this.state.phase !== 'target') return
    if (partId === this.targetPartId) return
    this.targetPartId = partId
    this.targetAnchors = partId
      ? snapTargetAnchors(this.model, partId, this.state.movingIds, this.cache)
      : []
    setPoints(this.targetPoints, this.targetAnchors)
    this.setHoveredTarget(null)
  }

  pickSource(
    ndc: Vector2,
    camera: Camera,
    width: number,
    height: number,
    radius: number,
  ): SnapAnchor | null {
    return this.pick(this.sourceAnchors, ndc, camera, width, height, radius)
  }

  pickTarget(
    ndc: Vector2,
    camera: Camera,
    width: number,
    height: number,
    radius: number,
  ): SnapAnchor | null {
    return this.pick(this.targetAnchors, ndc, camera, width, height, radius)
  }

  setHoveredTarget(anchor: SnapAnchor | null): void {
    setPoints(this.hoveredTarget, anchor ? [anchor] : [])
    if (!anchor || !this.sourcePoint) {
      this.hideLine()
      return
    }
    const positions = new Float32Array([...this.sourcePoint, ...anchor.point])
    this.line.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.line.geometry.computeBoundingSphere()
    this.line.visible = true
  }

  dispose(): void {
    for (const points of [
      this.sourcePoints,
      this.chosenSource,
      this.targetPoints,
      this.hoveredTarget,
    ]) {
      points.geometry.dispose()
      const material = points.material as PointsMaterial
      material.map?.dispose()
      material.dispose()
    }
    this.line.geometry.dispose()
    ;(this.line.material as LineBasicMaterial).dispose()
    this.group.removeFromParent()
  }

  private pick(
    anchors: readonly SnapAnchor[],
    ndc: Vector2,
    camera: Camera,
    width: number,
    height: number,
    radius: number,
  ): SnapAnchor | null {
    let best: SnapAnchor | null = null
    let bestDistance = radius
    for (const anchor of anchors) {
      const projected = new Vector3(...anchor.point).project(camera)
      if (projected.z < -1 || projected.z > 1) continue
      const distance = Math.hypot(
        ((projected.x - ndc.x) * width) / 2,
        ((projected.y - ndc.y) * height) / 2,
      )
      if (distance > bestDistance) continue
      best = anchor
      bestDistance = distance
    }
    return best
  }

  private hideLine(): void {
    this.line.visible = false
  }

  private clear(): void {
    this.sourceAnchors = []
    this.targetAnchors = []
    this.sourcePoint = null
    setPoints(this.sourcePoints, [])
    setPoints(this.chosenSource, [])
    setPoints(this.targetPoints, [])
    setPoints(this.hoveredTarget, [])
    this.hideLine()
  }
}
