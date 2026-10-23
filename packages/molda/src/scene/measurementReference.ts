import type { Vec3 } from '../core/model'
import { type AffineMatrix, affineDeterminant, type SceneTransform, transformPoint } from './matrix'
import type { sceneLocalBounds } from './pivot'

/** Match the coordinate fields' signed, base-center reference even after a flip or custom pivot. */
export function sceneMeasurementReference(
  local: Readonly<AffineMatrix>,
  transform: SceneTransform,
  pivot: Vec3,
  bounds: ReturnType<typeof sceneLocalBounds>,
) {
  const reflected = affineDeterminant(local) < 0
  const lengths: Vec3 = [0, 1, 2].map((axis) =>
    Math.hypot(local[axis * 4]!, local[axis * 4 + 1]!, local[axis * 4 + 2]!),
  ) as Vec3
  const point = transformPoint(local, pivot)
  const origin: Vec3 = [0, 0, 0]
  const dimensions: Vec3 = [0, 0, 0]
  for (const axis of [0, 1, 2] as const) {
    // Affine authoring decomposes a reflection onto X; TRS preserves the authored signs.
    const sign =
      transform.kind === 'trs' ? Math.sign(transform.scale[axis]) : axis === 0 && reflected ? -1 : 1
    const base = bounds
      ? sign < 0
        ? bounds.center[axis] + (bounds.center[axis] - bounds.base[axis])
        : bounds.base[axis]
      : 0
    origin[axis] = point[axis] - (pivot[axis] - base) * lengths[axis] * sign
    dimensions[axis] = (bounds?.size[axis] ?? 0) * lengths[axis]
  }
  return { origin, dimensions }
}
