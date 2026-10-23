import type { Vec3 } from '../core/model'

export type SceneMeasurementStep = 1 | 0.1

/** Editing precision is a UI choice; existing authorial values are never sanitized on load. */
export function snapSceneMeasurement(value: number, step: number | null, minimum = -Infinity) {
  if (step === null) return value
  const reciprocal = 1 / step
  const scaled = value * reciprocal
  // Beyond this range Float64's own spacing is already coarser than the requested grid.
  const snapped =
    Math.abs(scaled) > Number.MAX_SAFE_INTEGER ? value : Math.round(scaled) / reciprocal
  return Math.max(minimum, snapped) || 0
}

/** Snap lengths, rather than scale factors: a 2-unit side grows to 3, not to a factor of 2. */
export function snapSceneScale(
  factors: Vec3,
  dimensions: Vec3 | null,
  step: number | null,
  keyboardSteps?: number,
): Vec3 {
  if (step === null || !dimensions) return factors
  return factors.map((factor, axis) => {
    const size = dimensions[axis]!
    if (!(size > 0) || factor === 1) return factor
    const next =
      keyboardSteps === undefined
        ? size * factor
        : size + Math.sign(factor - 1) * step * keyboardSteps
    return snapSceneMeasurement(next, step, step) / size
  }) as Vec3
}
