import type { Vec2 } from './document'
import { number, tuple } from './validation'

/** Rotate in texture pixels, so rectangular images keep the shape and lengths of the map. */
export function prepareUvRotation(
  degrees: number,
  origin: Vec2,
  image: { width: number; height: number },
) {
  const angle = number(degrees, 'uv.degrees') % 360
  tuple(origin, 2, 'uv.origin')
  const width = number(image.width, 'uv.width', 1)
  const height = number(image.height, 'uv.height', 1)
  const quarter = angle / 90
  const turn = ((quarter % 4) + 4) % 4
  const cos = Number.isInteger(quarter) ? [1, 0, -1, 0][turn]! : Math.cos((angle * Math.PI) / 180)
  const sin = Number.isInteger(quarter) ? [0, 1, 0, -1][turn]! : Math.sin((angle * Math.PI) / 180)
  return (uv: Vec2): Vec2 => {
    if (angle === 0) return [...uv]
    const x = (uv[0] - origin[0]) * width
    const y = (uv[1] - origin[1]) * height
    return [origin[0] + (x * cos - y * sin) / width, origin[1] + (x * sin + y * cos) / height]
  }
}
