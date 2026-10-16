import type { Camera } from 'three'
import type { Vec3 } from '../core/model'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  quaternionFromEulerRadians,
  transformDirection,
} from '../scene/matrix'
import { SceneAxisHandles } from './SceneAxisHandles'
import type { SceneTransformActions, SceneTransformTool } from './sceneViewportTypes'

/** One screen-space gesture owner for every transform. Canonical matrices are never decomposed. */
export class SceneTransformGizmo {
  private readonly handles: Record<'move' | 'rotate' | 'scale', SceneAxisHandles>
  private enabled = true
  private tool: SceneTransformTool = 'select'
  private point: Vec3 | null = null
  private basis = identityMatrix()
  private space: 'world' | 'local' = 'world'
  private owner: {
    frame: AffineMatrix
    inverse: AffineMatrix
    tool: Exclude<SceneTransformTool, 'select'>
  } | null = null
  private movementStep: number | null = null
  private disposed = false

  constructor(
    canvas: HTMLCanvasElement,
    private camera: Camera,
    private readonly actions: SceneTransformActions,
    activity: (dragging: boolean) => void,
    private readonly request: () => void,
  ) {
    const create = (tool: Exclude<SceneTransformTool, 'select'>) =>
      new SceneAxisHandles(
        canvas,
        () => this.camera,
        tool,
        {
          begin: () => {
            if (!this.enabled || this.tool !== tool || !this.point) return false
            const frame = this.frame(),
              inverse = affineInverse(frame)
            if (!inverse || !this.actions.begin()) return false
            this.owner = { frame, inverse, tool }
            return true
          },
          preview: (value) => {
            const owner = this.owner
            if (!owner) return false
            let delta: AffineMatrix
            if (owner.tool === 'move') {
              delta = identityMatrix()
              let displacement = value
              if (this.movementStep !== null) {
                const local = transformDirection(owner.inverse, value).map(
                  (n) => Math.round(n / this.movementStep!) * this.movementStep!,
                ) as Vec3
                displacement = transformDirection(owner.frame, local)
              }
              for (const axis of [0, 1, 2] as const) delta[12 + axis] = displacement[axis]
            } else {
              const local = composeTransform({
                kind: 'trs',
                translation: [0, 0, 0],
                rotation:
                  owner.tool === 'rotate' ? quaternionFromEulerRadians(value, 'XYZ') : [0, 0, 0, 1],
                scale: owner.tool === 'scale' ? value : [1, 1, 1],
              })
              delta = affineMultiply(affineMultiply(owner.frame, local), owner.inverse)
            }
            return this.actions.preview(delta)
          },
          end: (commit) => {
            if (!this.owner) return
            this.owner = null
            this.actions.end(commit)
            this.refresh()
          },
        },
        request,
        activity,
      )
    this.handles = { move: create('move'), rotate: create('rotate'), scale: create('scale') }
  }
  get dragging() {
    return this.owner !== null
  }
  setMovementStep(step: number | null) {
    if (step !== null && (!Number.isFinite(step) || step <= 0))
      throw new Error('Invalid movement step')
    if (step === this.movementStep) return
    this.cancel()
    this.movementStep = step
  }
  setSpace(space: 'world' | 'local') {
    if (space === this.space) return
    this.cancel()
    this.space = space
    this.refresh()
  }
  setCamera(camera: Camera) {
    this.cancel()
    this.camera = camera
    this.refresh()
  }
  setTool(tool: SceneTransformTool) {
    if (tool === this.tool || this.disposed) return
    this.cancel()
    this.tool = tool
    this.refresh()
  }
  setEnabled(enabled: boolean) {
    if (enabled === this.enabled || this.disposed) return
    if (!enabled) this.cancel()
    this.enabled = enabled
    this.refresh()
  }
  setTarget(point: Vec3 | null, basis?: AffineMatrix) {
    if (this.disposed) return
    const nextBasis = basis ?? identityMatrix()
    if (
      (point === null
        ? this.point === null
        : this.point && point.every((n, i) => n === this.point![i])) &&
      nextBasis.every((n, i) => n === this.basis[i])
    )
      return
    this.point = point ? [...point] : null
    this.basis = [...nextBasis]
    if (!point) this.cancel()
    if (!this.dragging) this.refresh()
  }
  private frame() {
    const matrix =
      this.tool === 'scale' || this.space === 'local'
        ? ([...this.basis] as AffineMatrix)
        : identityMatrix()
    if (this.point) for (const axis of [0, 1, 2] as const) matrix[12 + axis] = this.point[axis]
    return matrix
  }
  private refresh() {
    if (this.disposed) return
    const frame = this.frame(),
      invertible = affineInverse(frame) !== null
    const axes: Vec3[] = [0, 1, 2].map((i) => [frame[i * 4]!, frame[i * 4 + 1]!, frame[i * 4 + 2]!])
    for (const tool of ['move', 'rotate', 'scale'] as const) {
      this.handles[tool].setTarget(this.point, axes)
      this.handles[tool].setEnabled(
        this.enabled && this.tool === tool && !!this.point && invertible,
      )
    }
    this.request()
  }
  cancel() {
    for (const handle of Object.values(this.handles)) handle.cancel()
  }
  draw() {
    for (const handle of Object.values(this.handles)) handle.draw()
  }
  dispose() {
    this.cancel()
    this.disposed = true
    for (const handle of Object.values(this.handles)) handle.dispose()
  }
}
