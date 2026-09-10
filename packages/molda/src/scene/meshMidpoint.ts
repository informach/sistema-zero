import type { Vec3 } from '../core/model'
import type { Vec2 } from './document'
import { number } from './validation'

/** Average without overflowing the sum or quantizing authorial coordinates. */
export const midpoint = (a: number, b: number) => number(a / 2 + b / 2, 'midpoint')
export const uvMidpoint = (a: Vec2, b: Vec2): Vec2 => [midpoint(a[0], b[0]), midpoint(a[1], b[1])]
export const vertexMidpoint = (a: Vec3, b: Vec3): Vec3 => [
  midpoint(a[0], b[0]),
  midpoint(a[1], b[1]),
  midpoint(a[2], b[2]),
]
