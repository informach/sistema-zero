import { type Camera, Vector3 } from 'three'
import type { Vec3 } from '../core/model'

/** Approximate world brush radius on the camera plane; sample density never changes the weight kernel. */
export function sceneSkinPaintSpacing(
  camera: Camera,
  point: Vec3,
  radius: number | null,
  rect: Pick<DOMRect, 'width' | 'height'>,
): number {
  if (
    radius === null ||
    !Number.isFinite(radius) ||
    radius <= 0 ||
    rect.width <= 0 ||
    rect.height <= 0
  )
    return 1
  camera.updateWorldMatrix(true, false)
  const center = new Vector3(...point).project(camera),
    world = camera.matrixWorld.elements
  let projected = Infinity
  for (const offset of [0, 4]) {
    const edge = new Vector3(
      point[0] + world[offset]! * radius,
      point[1] + world[offset + 1]! * radius,
      point[2] + world[offset + 2]! * radius,
    ).project(camera)
    projected = Math.min(
      projected,
      Math.hypot(((edge.x - center.x) * rect.width) / 2, ((edge.y - center.y) * rect.height) / 2),
    )
  }
  return Number.isFinite(projected) ? Math.min(16, Math.max(1, projected / 4)) : 1
}
