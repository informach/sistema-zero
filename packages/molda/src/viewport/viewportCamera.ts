import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import type { MoldaModelAsset } from '../core/model'
import { type Bounds, modelBounds } from '../model/transform'
import { requireScene } from '../scene/validation'
import { perspectiveFitDistance } from './cameraFit'
import type { CameraView } from './types'
import { VIEW_DIRECTIONS } from './viewportMath'

function drawingNumbers(values: readonly number[]): void {
  requireScene(
    values.every((value) => Number.isFinite(Math.fround(value))),
    'camera',
    'O enquadramento excede a precisão de desenho. Sua criação não foi alterada.',
  )
}
/** Fallible projection work is staged, including the inactive camera used by named views. */
function project(
  perspective: PerspectiveCamera,
  orthographic: OrthographicCamera,
  aspect: number,
  span: number,
) {
  drawingNumbers([aspect, span])
  requireScene(
    aspect > 0 && Math.fround(aspect) > 0 && span > 0,
    'camera',
    'O tamanho da vista precisa ser positivo.',
  )
  requireScene(
    perspective.fov > 0 && perspective.fov < 180,
    'camera',
    'O campo de visão é inválido.',
  )
  perspective.aspect = aspect
  perspective.updateProjectionMatrix()
  const half = span / 2
  orthographic.left = -half * aspect
  orthographic.right = half * aspect
  orthographic.top = half
  orthographic.bottom = -half
  orthographic.updateProjectionMatrix()
  drawingNumbers([orthographic.left, orthographic.right, orthographic.top, orthographic.bottom])
  for (const camera of [perspective, orthographic]) {
    drawingNumbers([
      camera.near,
      camera.far,
      camera.zoom,
      ...camera.position.toArray(),
      ...camera.matrixWorld.elements,
      ...camera.matrixWorldInverse.elements,
      ...camera.projectionMatrix.elements,
    ])
    requireScene(
      camera.near > 0 &&
        camera.far > camera.near &&
        camera.zoom > 0 &&
        camera.projectionMatrixInverse.elements.every(Number.isFinite),
      'camera',
      'A projeção da vista é inválida.',
    )
  }
}

/** Visibility/selection are session concerns, never changes to geometry or hidden flags. */
export function framingBounds(
  model: MoldaModelAsset,
  selection?: readonly string[],
): Bounds | null {
  const ids = selection ? new Set(selection) : null
  const visible = model.parts.filter((part) => !part.hidden)
  const selected = ids
    ? visible.filter((part) => ids.has(part.id) || (part.mirrorOf && ids.has(part.mirrorOf)))
    : visible
  return modelBounds({ parts: selected.length > 0 ? selected : visible })
}

/** Camera math without a renderer, DOM, listeners, or document mutation. */
export class ViewportCamera {
  readonly perspective = new PerspectiveCamera(45, 1, 0.1, 500)
  readonly orthographic = new OrthographicCamera(-10, 10, 10, -10, 0.1, 500)
  readonly target = new Vector3(0, 2, 0)
  private freeDirection = new Vector3(16, 10, 20).normalize()
  private verticalSpan = 20
  aspect = 1
  view: CameraView = 'free'

  constructor(readonly freeProjection: 'perspective' | 'orthographic' = 'perspective') {
    this.perspective.position.set(16, 12, 20)
    this.perspective.lookAt(this.target)
    this.perspective.updateMatrixWorld(true)
    if (freeProjection === 'orthographic') {
      this.freeDirection.set(1, 1, 1).normalize()
      this.orthographic.position.copy(this.target).addScaledVector(this.freeDirection, 24)
      this.orthographic.lookAt(this.target)
      this.orthographic.updateMatrixWorld(true)
    }
  }

  get camera(): PerspectiveCamera | OrthographicCamera {
    return this.view === 'free' && this.freeProjection === 'perspective'
      ? this.perspective
      : this.orthographic
  }

  /** Public projection port consumed by the demand loop on a real resize. */
  updateProjectionMatrix(): void {
    const perspective = this.perspective.clone(),
      orthographic = this.orthographic.clone()
    project(perspective, orthographic, this.aspect, this.verticalSpan)
    this.perspective.copy(perspective, false)
    this.orthographic.copy(orthographic, false)
  }

  setView(view: CameraView, bounds: Bounds | null): void {
    const freeDirection =
      this.view === 'free'
        ? this.camera.position.clone().sub(this.target).normalize()
        : this.freeDirection.clone()
    if (freeDirection.lengthSq() === 0) freeDirection.copy(this.freeDirection)
    const direction = view === 'free' ? freeDirection : new Vector3(...VIEW_DIRECTIONS[view])
    this.applyFrame(view, bounds, direction, true)
    this.freeDirection.copy(freeDirection)
  }

  frame(bounds: Bounds | null): void {
    const direction = this.camera.position.clone().sub(this.target).normalize()
    if (direction.lengthSq() === 0) direction.copy(this.freeDirection)
    this.applyFrame(this.view, bounds, direction, false)
  }

  /** Extend the current view's depth as geometry grows, without changing its zoom or orbit target. */
  keepBoundsInDepth(bounds: Bounds | null): boolean {
    if (!bounds) return false
    drawingNumbers([...bounds.min, ...bounds.max])
    requireScene(
      bounds.min.every((value, i) => value <= bounds.max[i]!),
      'camera',
      'Os limites da vista estão invertidos.',
    )
    const perspective = this.perspective.clone(),
      orthographic = this.orthographic.clone(),
      camera = this.camera === this.perspective ? perspective : orthographic
    const outward = camera.position.clone().sub(this.target).normalize()
    const forward = outward.clone().negate()
    let closest = Infinity
    let farthest = -Infinity
    for (const x of [bounds.min[0], bounds.max[0]])
      for (const y of [bounds.min[1], bounds.max[1]])
        for (const z of [bounds.min[2], bounds.max[2]]) {
          const depth = new Vector3(x, y, z).sub(camera.position).dot(forward)
          closest = Math.min(closest, depth)
          farthest = Math.max(farthest, depth)
        }
    const radius =
      new Vector3(
        bounds.max[0] - bounds.min[0],
        bounds.max[1] - bounds.min[1],
        bounds.max[2] - bounds.min[2],
      ).length() / 2
    const padding = Math.max(0.25, radius * 0.02, camera.near * 2)
    const missingNear = camera.near + padding - closest
    const retreat = missingNear > Math.max(1e-9, Math.abs(closest) * 1e-12) ? missingNear : 0
    const missingFar = farthest + retreat + padding - camera.far
    const far =
      missingFar > Math.max(1e-9, Math.abs(camera.far) * 1e-12)
        ? camera.far + missingFar
        : camera.far
    if (retreat === 0 && far === camera.far) return false
    camera.position.addScaledVector(outward, retreat)
    camera.far = far
    camera.updateMatrixWorld(true)
    project(perspective, orthographic, this.aspect, this.verticalSpan)
    this.perspective.copy(perspective, false)
    this.orthographic.copy(orthographic, false)
    return true
  }

  private applyFrame(
    view: CameraView,
    bounds: Bounds | null,
    direction: Vector3,
    changeView: boolean,
  ): void {
    const min = bounds?.min ?? [-2, 0, -2]
    const max = bounds?.max ?? [2, 2, 2]
    drawingNumbers([...min, ...max, ...direction.toArray()])
    requireScene(
      min.every((value, i) => value <= max[i]!),
      'camera',
      'Os limites da vista estão invertidos.',
    )
    const center = new Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
    const radius = Math.max(
      new Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]).length() / 2,
      0.25,
    )
    const perspective = this.perspective.clone(),
      orthographic = this.orthographic.clone(),
      camera = view === 'free' && this.freeProjection === 'perspective' ? perspective : orthographic
    if (changeView) camera.up.set(0, view === 'top' ? 0 : 1, view === 'top' ? -1 : 0)
    const distance =
      camera instanceof PerspectiveCamera
        ? perspectiveFitDistance(radius, camera.fov, this.aspect) * 1.15
        : Math.max(radius * 3, 4)
    const verticalSpan = (2 * radius * 1.15) / Math.min(1, this.aspect)
    camera.zoom = 1
    camera.far = Math.max(500, distance + radius * 4)
    camera.position.copy(center).addScaledVector(direction, distance)
    camera.lookAt(center)
    camera.updateMatrixWorld(true)
    project(perspective, orthographic, this.aspect, verticalSpan)
    // Preserve camera/target identities held by OrbitControls; commit only after both plans pass.
    this.perspective.copy(perspective, false)
    this.orthographic.copy(orthographic, false)
    this.target.copy(center)
    this.verticalSpan = verticalSpan
    this.view = view
  }
}
