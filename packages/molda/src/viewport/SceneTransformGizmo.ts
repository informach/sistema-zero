import { type Camera, Group } from 'three'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import type { Vec3 } from '../core/model'
import { type AffineMatrix, affineInverse, affineMultiply } from '../scene/matrix'
import type { SceneTransformActions, SceneTransformTool } from './sceneViewportTypes'

/** Transform a disposable world-space proxy; never decompose an authorial matrix with shear. */
export class SceneTransformGizmo {
  readonly root = new Group()
  private readonly proxy = new Group()
  private readonly controls: TransformControls
  private inverse: AffineMatrix | null = null
  private enabled = true
  private tool: SceneTransformTool = 'select'
  private target: Vec3 | null = null
  private owner: number | null = null
  private readonly pointers = new Set<number>()
  private disposed = false
  private movementStep: number | null = null

  setMovementStep(step: number | null) {
    if (step !== null && (!Number.isFinite(step) || step <= 0))
      throw new Error('Invalid movement step')
    if (step === this.movementStep) return
    this.cancel()
    this.movementStep = step
  }

  constructor(
    private readonly canvas: HTMLCanvasElement,
    camera: Camera,
    private readonly actions: SceneTransformActions,
    private readonly activity: (dragging: boolean) => void,
    private readonly request: () => void,
  ) {
    canvas.addEventListener('pointerdown', this.onDown, true)
    canvas.addEventListener('pointerup', this.onUp, true)
    canvas.addEventListener('pointercancel', this.onCancel, true)
    canvas.addEventListener('lostpointercapture', this.onLostCapture)
    this.controls = new TransformControls(camera, canvas)
    this.controls.setSize(1.5)
    this.controls.setSpace('world')
    this.controls.addEventListener('mouseDown', this.begin)
    this.controls.addEventListener('objectChange', this.preview)
    this.controls.addEventListener('mouseUp', this.finish)
    this.controls.addEventListener('change', request)
    this.controls.enabled = false
    this.root.add(this.proxy, this.controls.getHelper())
  }

  get dragging() {
    return this.inverse !== null
  }
  get hit() {
    return this.controls.enabled && this.controls.axis !== null
  }

  setCamera(camera: Camera) {
    if (this.disposed) return
    this.cancel()
    this.controls.camera = camera
  }
  setTool(tool: SceneTransformTool) {
    if (this.disposed || tool === this.tool) return
    this.cancel()
    this.tool = tool
    if (tool !== 'select') this.controls.setMode(tool === 'move' ? 'translate' : tool)
    this.refresh()
  }
  setEnabled(enabled: boolean) {
    if (this.disposed || enabled === this.enabled) return
    if (!enabled) {
      this.cancel()
      this.pointers.clear()
    }
    this.enabled = enabled
    this.refresh()
  }
  setTarget(point: Vec3 | null) {
    if (this.disposed) return
    if (
      point === null
        ? this.target === null
        : this.target && point.every((value, i) => value === this.target![i])
    )
      return
    this.target = point ? [...point] : null
    if (!point && this.dragging) this.cancel()
    if (this.dragging) return
    if (this.tool !== 'select') this.refresh()
  }
  private refresh() {
    this.controls.enabled =
      this.enabled && this.tool !== 'select' && this.target !== null && this.pointers.size <= 1
    if (!this.controls.enabled || !this.target) this.controls.detach()
    else {
      this.proxy.position.set(...this.target)
      this.proxy.quaternion.identity()
      this.proxy.scale.set(1, 1, 1)
      this.proxy.updateMatrixWorld(true)
      this.controls.attach(this.proxy)
    }
    this.request()
  }
  private readonly begin = () => {
    if (this.disposed || !this.enabled || this.owner === null || this.pointers.size !== 1) return
    this.proxy.updateMatrixWorld(true)
    const inverse = affineInverse([...this.proxy.matrixWorld.elements] as AffineMatrix)
    if (!inverse || !this.actions.begin()) {
      this.cancel()
      return
    }
    this.inverse = inverse
    this.activity(true)
  }
  private readonly preview = () => {
    if (!this.inverse) return
    this.proxy.updateMatrixWorld(true)
    const delta = affineMultiply([...this.proxy.matrixWorld.elements] as AffineMatrix, this.inverse)
    // Snap only the requested displacement, preserving fractional imported coordinates.
    if (this.tool === 'move' && this.movementStep !== null)
      for (const axis of [12, 13, 14] as const)
        delta[axis] = Math.round(delta[axis] / this.movementStep) * this.movementStep
    if (!this.actions.preview(delta)) this.cancel()
    this.request()
  }
  private readonly finish = () => {
    if (!this.inverse) return
    this.inverse = null
    this.owner = null
    this.actions.end(true)
    this.activity(false)
    this.refresh()
  }
  cancel() {
    if (this.disposed) return
    const active = this.inverse !== null
    this.inverse = null
    const owner = this.owner
    this.owner = null
    // reset emits objectChange; ownership must already be cleared.
    if (this.controls.object) this.controls.reset()
    this.controls.dragging = false
    this.controls.axis = null
    if (owner !== null && this.canvas.hasPointerCapture?.(owner))
      this.canvas.releasePointerCapture(owner)
    if (active) this.actions.end(false)
    this.activity(false)
    this.request()
  }
  private readonly onDown = (event: PointerEvent) => {
    if (!this.enabled || this.disposed) return
    this.pointers.add(event.pointerId)
    if (this.pointers.size > 1) {
      this.cancel()
      this.controls.enabled = false
    } else this.owner = event.pointerId
  }
  private readonly onUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    if (!this.dragging) {
      this.owner = null
      this.refresh()
    }
  }
  private readonly onCancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    this.cancel()
    this.refresh()
  }
  private readonly onLostCapture = (event: PointerEvent) => {
    if (event.buttons !== 0) this.onCancel(event)
  }
  dispose() {
    if (this.disposed) return
    this.cancel()
    this.disposed = true
    this.canvas.removeEventListener('pointerdown', this.onDown, true)
    this.canvas.removeEventListener('pointerup', this.onUp, true)
    this.canvas.removeEventListener('pointercancel', this.onCancel, true)
    this.canvas.removeEventListener('lostpointercapture', this.onLostCapture)
    this.controls.removeEventListener('mouseDown', this.begin)
    this.controls.removeEventListener('objectChange', this.preview)
    this.controls.removeEventListener('mouseUp', this.finish)
    this.controls.removeEventListener('change', this.request)
    this.controls.detach()
    this.controls.dispose()
    this.root.clear()
    this.pointers.clear()
  }
}
