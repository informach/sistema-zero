import { type Camera, Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { type AffineMatrix, identityMatrix } from '../scene/matrix'
import { snapSceneMeasurement } from '../scene/measurementStep'
import type { SceneTransformActions, SceneTransformIntent } from './sceneViewportTypes'
import type { CameraView } from './types'

/** One fixed world plane per gesture; near-parallel views never cause depth jumps. */
export class SceneBodyMove {
  private active: {
    plane: Plane | null
    start: Vector3 | null
    axis: { direction: Vector3; screen: [number, number] } | null
    pointer: [number, number]
    started: boolean
    origin: Vec3
    intent: SceneTransformIntent | undefined
  } | null = null
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: () => Camera,
    private readonly actions: SceneTransformActions,
  ) {}
  private ray(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect()
    const ray = new Raycaster()
    this.camera().updateWorldMatrix(true, false)
    ray.setFromCamera(
      new Vector2(((x - rect.left) / rect.width) * 2 - 1, 1 - ((y - rect.top) / rect.height) * 2),
      this.camera(),
    )
    return ray.ray
  }
  begin(
    point: Vector3,
    x: number,
    y: number,
    view: CameraView,
    origin: Vec3 | null = null,
    axis: Vec3 | null = null,
    intent?: SceneTransformIntent,
  ) {
    this.end(false)
    if (axis) {
      const direction = new Vector3(...axis)
      if (!Number.isFinite(direction.lengthSq()) || !direction.lengthSq()) return false
      direction.normalize()
      const camera = this.camera()
      camera.updateWorldMatrix(true, false)
      const rect = this.canvas.getBoundingClientRect()
      const project = (position: Vector3) => {
        const screen = position.clone().project(camera)
        return [((screen.x + 1) * rect.width) / 2, ((1 - screen.y) * rect.height) / 2] as [
          number,
          number,
        ]
      }
      const start = project(point)
      const along = project(point.clone().add(direction))
      let screen: [number, number] = [along[0] - start[0], along[1] - start[1]]
      const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize()
      const upward = project(point.clone().add(up))
      const scale = Math.hypot(upward[0] - start[0], upward[1] - start[1])
      if (
        !Number.isFinite(scale) ||
        scale < 1e-6 ||
        screen.some((value) => !Number.isFinite(value))
      )
        return false
      if (Math.hypot(...screen) < scale * 0.15) screen = [0, -scale]
      if (Math.hypot(...screen) < 1e-6) return false
      this.active = {
        plane: null,
        start: null,
        axis: { direction, screen },
        pointer: [x, y],
        started: false,
        origin: origin ? [...origin] : [0, 0, 0],
        intent,
      }
      return true
    }
    const normal =
      view === 'front' || view === 'back'
        ? new Vector3(0, 0, 1)
        : view === 'left' || view === 'right'
          ? new Vector3(1, 0, 0)
          : new Vector3(0, 1, 0)
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, point)
    const ray = this.ray(x, y)
    if (Math.abs(ray.direction.dot(normal)) < 0.05) return false
    const start = ray.intersectPlane(plane, new Vector3())
    if (!start) return false
    this.active = {
      plane,
      start,
      axis: null,
      pointer: [x, y],
      started: false,
      origin: origin ? [...origin] : [0, 0, 0],
      intent,
    }
    return true
  }
  move(x: number, y: number, step: number | null) {
    const active = this.active
    if (!active) return
    if (!active.started) {
      if (Math.hypot(x - active.pointer[0], y - active.pointer[1]) < 6) return
      if (!this.actions.begin(active.intent)) {
        this.active = null
        return
      }
      if (this.active !== active) return
      active.started = true
    }
    const delta: AffineMatrix = identityMatrix()
    if (active.axis) {
      const [sx, sy] = active.axis.screen
      const distance =
        ((x - active.pointer[0]) * sx + (y - active.pointer[1]) * sy) / (sx * sx + sy * sy)
      const amount = step === null ? distance : snapSceneMeasurement(distance, step)
      for (const index of [0, 1, 2] as const)
        delta[12 + index] = active.axis.direction.getComponent(index) * amount
      if (!this.actions.preview(delta)) this.end(false)
      return
    }
    if (!active.plane || !active.start) return
    const ray = this.ray(x, y)
    if (Math.abs(ray.direction.dot(active.plane.normal)) < 0.05) return
    const point = ray.intersectPlane(active.plane, new Vector3())
    if (!point) return
    const difference = point.sub(active.start)
    // O plano do gesto é sempre de um eixo do mundo: o eixo da normal NÃO se mexe. As duas
    // interseções deixavam um resto de arredondamento (±1e-15) gravado na altura.
    const normal = active.plane.normal
    const magnitude = Math.max(
      Math.abs(difference.x),
      Math.abs(difference.y),
      Math.abs(difference.z),
    )
    for (const [index, value, along] of [
      [12, difference.x, normal.x],
      [13, difference.y, normal.y],
      [14, difference.z, normal.z],
    ] as const)
      delta[index] =
        Math.abs(along) > 0.5 || Math.abs(value) <= magnitude * 1e-10
          ? 0
          : step === null
            ? value
            : snapSceneMeasurement(active.origin[index - 12]! + value, step) -
              active.origin[index - 12]!
    if (!this.actions.preview(delta)) this.end(false)
  }
  /** Whether the pointer travelled far enough to start; a short press is still a click. */
  end(commit: boolean) {
    const active = this.active
    this.active = null
    if (active?.started) this.actions.end(commit)
    return !!active?.started
  }
}
