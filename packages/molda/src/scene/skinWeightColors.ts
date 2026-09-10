/** Presentation scale only. Sequential luminance, not a red/green success/error code. */
export const SCENE_SKIN_WEIGHT_COLORS = { zero: '#183153', full: '#fde047' } as const

const linear = (channel: number) => {
  const srgb = channel / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}
const low = [24, 49, 83].map(linear),
  high = [253, 224, 71].map(linear)

/** Three vertex colors are linear RGB. No allocation per point and no mutation of source weights. */
export function writeSceneSkinWeightColor(target: Float32Array, offset: number, weight: number) {
  for (let axis = 0; axis < 3; axis++)
    target[offset + axis] = low[axis]! + (high[axis]! - low[axis]!) * weight
}
