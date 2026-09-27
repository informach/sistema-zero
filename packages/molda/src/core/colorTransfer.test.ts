import { expect, test } from 'bun:test'
import { Color, LinearSRGBColorSpace, SRGBColorSpace } from 'three'
import { srgbToLinear } from './color'
import { linearUnitToSrgb, srgbUnitToLinear } from './colorTransfer'

test('unit color transfer preserves endpoints, matches independent Three and retains the legacy byte-clamp contract', () => {
  // Three r184 rounds the inverse coefficients and uses exponent .41666, not 1/2.4.
  // Bound those approximations analytically; it is not an exact oracle for the preserved Molda curve.
  const coefficientBound =
      2.4 * (Math.abs(0.9478672986 - 1 / 1.055) + Math.abs(0.0521327014 - 0.055 / 1.055)) + 2e-15,
    exponentBound = (1.055 * Math.abs(0.41666 - 1 / 2.4)) / (Math.E * 0.41666) + 2e-15
  expect(linearUnitToSrgb(0)).toBe(0)
  expect(linearUnitToSrgb(1)).toBe(1)
  expect(srgbUnitToLinear(0)).toBe(0)
  expect(srgbUnitToLinear(1)).toBe(1)
  for (let byte = 0; byte <= 255; byte++) {
    const value = byte / 255,
      linear = srgbUnitToLinear(value),
      encoded = linearUnitToSrgb(value),
      threeLinear = new Color().setRGB(value, value, value, SRGBColorSpace),
      threeSrgb = new Color()
        .setRGB(value, value, value, LinearSRGBColorSpace)
        .getRGB(new Color(), SRGBColorSpace)
    expect(Math.abs(linear - threeLinear.r)).toBeLessThan(coefficientBound)
    expect(Math.abs(encoded - threeSrgb.r)).toBeLessThan(exponentBound)
    expect(Math.abs(linearUnitToSrgb(linear) - value)).toBeLessThan(2e-15)
    expect(srgbToLinear(byte)).toBe(linear)
  }
  expect(srgbToLinear(-20)).toBe(0)
  expect(srgbToLinear(300)).toBe(1)
  expect(Number.isNaN(srgbToLinear(NaN))).toBe(true)
  expect(linearUnitToSrgb(0.0031308)).toBe(0.0031308 * 12.92)
  expect(srgbUnitToLinear(0.04045)).toBe(0.04045 / 12.92)
  expect(srgbUnitToLinear(0.5)).toBe(0.21404114048223255)
  expect(linearUnitToSrgb(0.5)).toBe(0.7353569830524495)
})
