import {
  Color,
  type Object3D,
  PerspectiveCamera,
  type Scene,
  SRGBColorSpace,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import type { Bounds } from '../model/transform'
import { encodeThumb } from './thumbEncoder'
import { rad } from './viewportMath'

const THUMB_SIZE = 96

/** Recursos e estado temporário usados para fotografar o palco sem suas ajudas. */
export class ViewportThumbnail {
  private readonly camera = new PerspectiveCamera(40, 1, 0.1, 500)
  private readonly target = new WebGLRenderTarget(THUMB_SIZE, THUMB_SIZE, {
    colorSpace: SRGBColorSpace,
  })

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly background: string,
  ) {}

  render(scene: Scene, bounds: Bounds, hiddenObjects: readonly Object3D[]): string | null {
    const { min, max } = bounds
    const center = new Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
    const radius = Math.max(
      new Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]).length() / 2,
      1,
    )
    const distance = (radius / Math.sin(rad(this.camera.fov) / 2)) * 1.1
    this.camera.position
      .copy(center)
      .addScaledVector(new Vector3(1, 0.75, 1.35).normalize(), distance)
    this.camera.lookAt(center)
    this.camera.updateProjectionMatrix()

    const visibility = hiddenObjects.map((object) => object.visible)
    for (const object of hiddenObjects) object.visible = false
    const previousTarget = this.renderer.getRenderTarget()
    const previousClear = new Color()
    this.renderer.getClearColor(previousClear)
    const previousAlpha = this.renderer.getClearAlpha()
    try {
      this.renderer.setRenderTarget(this.target)
      this.renderer.setClearColor(new Color(this.background), 1)
      this.renderer.clear()
      this.renderer.render(scene, this.camera)
      const pixels = new Uint8Array(THUMB_SIZE * THUMB_SIZE * 4)
      this.renderer.readRenderTargetPixels(this.target, 0, 0, THUMB_SIZE, THUMB_SIZE, pixels)
      return encodeThumb(pixels, THUMB_SIZE)
    } catch {
      return null
    } finally {
      this.renderer.setRenderTarget(previousTarget)
      this.renderer.setClearColor(previousClear, previousAlpha)
      hiddenObjects.forEach((object, index) => {
        object.visible = visibility[index] ?? true
      })
    }
  }

  dispose(): void {
    this.target.dispose()
  }
}
