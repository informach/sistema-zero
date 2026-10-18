import { type Camera, Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { type AffineMatrix, identityMatrix } from '../scene/matrix'
import { snapSceneMeasurement } from '../scene/measurementStep'
import type { SceneTransformActions } from './sceneViewportTypes'
import type { CameraView } from './types'

/** One fixed world plane per gesture; near-parallel views never cause depth jumps. */
export class SceneBodyMove {
  private active: {
    plane: Plane
    start: Vector3
    pointer: [number, number]
    started: boolean
    origin: Vec3
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
  begin(point: Vector3, x: number, y: number, view: CameraView, origin: Vec3 | null = null) {
    this.end(false)
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
      pointer: [x, y],
      started: false,
      origin: origin ? [...origin] : [0, 0, 0],
    }
    return true
  }
  move(x: number, y: number, step: number | null) {
    const active = this.active
    if (!active) return
    if (!active.started) {
      if (Math.hypot(x - active.pointer[0], y - active.pointer[1]) < 6) return
      if (!this.actions.begin()) {
        this.active = null
        return
      }
      if (this.active !== active) return
      active.started = true
    }
    const ray = this.ray(x, y)
    if (Math.abs(ray.direction.dot(active.plane.normal)) < 0.05) return
    const point = ray.intersectPlane(active.plane, new Vector3())
    if (!point) return
    const difference = point.sub(active.start)
    const delta: AffineMatrix = identityMatrix()
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
  end(commit: boolean) {
    const active = this.active
    this.active = null
    if (active?.started) this.actions.end(commit)
  }
}
