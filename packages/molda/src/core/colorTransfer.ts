/** Unit [0,1] channels validated by the caller. No clamp, quantization or gamma-2.2 approximation. */
export function linearUnitToSrgb(value: number): number {
  if (value === 1) return 1
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055
}
export function srgbUnitToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}
