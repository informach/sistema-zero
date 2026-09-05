import type { MoldaPart, Vec3 } from '../core/model'
import { partSize } from '../model/shapes'
import { partPivot } from '../model/transform'
import type { ViewName } from './types'

export const VIEW_DIRECTIONS: Record<Exclude<ViewName, 'frame'>, Vec3> = {
  front: [0, 0.18, 1],
  back: [0, 0.18, -1],
  left: [-1, 0.18, 0],
  right: [1, 0.18, 0],
  top: [0, 1, 0.001],
}

export function rad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function deg(radians: number): number {
  return (radians * 180) / Math.PI
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function geometryHash(part: MoldaPart, layoutVersion: number): string {
  const pivot = partPivot(part)
  const size = partSize(part)
  return [
    part.shape,
    size.join(','),
    [part.from[0] - pivot[0], part.from[1] - pivot[1], part.from[2] - pivot[2]].join(','),
    part.color,
    part.mirrorOf ?? '',
    layoutVersion,
  ].join('|')
}
