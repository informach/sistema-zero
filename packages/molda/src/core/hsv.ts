import type { Vec3 } from './model'

/** Hue in degrees; saturation/value in [0, 1]. Achromatic colors retain the user's hue. */
export function rgbToHsv(r: number, g: number, b: number, previousHue = 0): Vec3 {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min
  const hue =
    delta === 0
      ? previousHue
      : max === r
        ? ((g - b) / delta) * 60
        : max === g
          ? ((b - r) / delta + 2) * 60
          : ((r - g) / delta + 4) * 60
  return [(hue + 360) % 360, max === 0 ? 0 : delta / max, max / 255]
}
export function hsvToRgb(h: number, s: number, v: number): Vec3 {
  const hue = (((h % 360) + 360) % 360) / 60,
    c = v * s,
    x = c * (1 - Math.abs((hue % 2) - 1)),
    m = v - c
  const channels: Vec3 =
    hue < 1
      ? [c, x, 0]
      : hue < 2
        ? [x, c, 0]
        : hue < 3
          ? [0, c, x]
          : hue < 4
            ? [0, x, c]
            : hue < 5
              ? [x, 0, c]
              : [c, 0, x]
  return [
    Math.round((channels[0] + m) * 255),
    Math.round((channels[1] + m) * 255),
    Math.round((channels[2] + m) * 255),
  ]
}
