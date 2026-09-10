import { type Camera, Raycaster, Vector2 } from 'three'
import type { SceneRenderResource } from './sceneRenderResource'

/** The nearest visible surface occludes painting even when locked or outside the chosen target. */
export function sceneSurfaceHit(
  canvas: HTMLCanvasElement,
  camera: Camera,
  resource: SceneRenderResource,
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
) {
  const rect = canvas.getBoundingClientRect()
  if (
    !Number.isFinite(event.clientX) ||
    !Number.isFinite(event.clientY) ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    return null
  // Navigation can change the camera between pointer events and the next demanded frame.
  camera.updateWorldMatrix(true, false)
  const ray = new Raycaster()
  ray.setFromCamera(
    new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    ),
    camera,
  )
  return resource.surfaceIntersections(ray).find((hit) => hit.object.visible) ?? null
}
