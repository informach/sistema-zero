import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationKey } from './animation'
import type { Quaternion } from './matrix'

export type SceneRotationTrack = {
  nodeId: string
  channel: 'rotation'
  keys: SceneAnimationKey<Quaternion>[]
}

/** A nearly complete revolution should end exactly where it began, without a tiny reverse segment. */
export function nearLoopRotationEnd(
  clip: SceneAnimationClip,
  track: SceneRotationTrack,
): Quaternion | null {
  if (!clip.loop || track.keys.length < 3) return null
  const first = track.keys[0]!
  const last = track.keys.at(-1)!
  const previous = track.keys.at(-2)!
  if (first.time !== 0 || last.time !== clip.duration) return null
  const dot = (a: Quaternion, b: Quaternion) =>
    a.reduce((sum, value, axis) => sum + value * b[axis]!, 0) /
    (Math.hypot(...a) * Math.hypot(...b))
  const gap = 2 * Math.acos(Math.min(1, Math.abs(dot(first.value, last.value))))
  const previousTurn = 2 * Math.acos(Math.min(1, Math.abs(dot(previous.value, last.value))))
  if (gap <= 1e-6 || gap > Math.min((5 * Math.PI) / 180, previousTurn / 10)) return null
  const sign = dot(first.value, last.value) < 0 ? -1 : 1
  return first.value.map((value) => (value === 0 ? 0 : sign * value)) as Quaternion
}

function multiplyRotation(a: Quaternion, b: Quaternion): Quaternion {
  const [x, y, z, w] = a
  const [i, j, k, r] = b
  return [
    w * i + x * r + y * k - z * j,
    w * j - x * k + y * r + z * i,
    w * k + x * j - y * i + z * r,
    w * r - x * i - y * j - z * k,
  ]
}

/** Two endpoint poses cannot encode a full revolution: add quarter turns on the authored axis. */
export function fullLoopRotationKeys(
  clip: SceneAnimationClip,
  track: SceneRotationTrack,
): SceneAnimationKey<Quaternion>[] | null {
  if (!clip.loop || track.keys.length !== 2) return null
  const [first, last] = track.keys
  if (first!.time !== 0 || last!.time !== clip.duration) return null
  const unit = (q: Quaternion): Quaternion =>
    q.map((value) => value / Math.hypot(...q)) as Quaternion
  const start = unit(first!.value)
  const end = unit(last!.value)
  const sign = start.reduce((sum, value, axis) => sum + value * end[axis]!, 0) < 0 ? -1 : 1
  const orientedEnd = end.map((value) => value * sign) as Quaternion
  const inverse: Quaternion = [-start[0], -start[1], -start[2], start[3]]
  const delta = multiplyRotation(inverse, orientedEnd)
  const size = Math.hypot(delta[0], delta[1], delta[2])
  if (2 * Math.atan2(size, Math.abs(delta[3])) < Math.PI / 6) return null
  const axis: Vec3 = [delta[0] / size, delta[1] / size, delta[2] / size]
  const pivot = last!.incomingPivot
  const quarterKeys: SceneAnimationKey<Quaternion>[] = [1, 2, 3].map((quarter) => {
    const halfAngle = (quarter * Math.PI) / 4
    const turn: Quaternion = [
      axis[0] * Math.sin(halfAngle),
      axis[1] * Math.sin(halfAngle),
      axis[2] * Math.sin(halfAngle),
      Math.cos(halfAngle),
    ]
    return {
      time: (clip.duration * quarter) / 4,
      value: unit(multiplyRotation(start, turn)),
      interpolation: 'linear',
      ...(pivot
        ? { incomingPivot: [...pivot] as Vec3, incomingPivotInterpolation: 'linear' as const }
        : {}),
    }
  })
  return [
    { ...first!, interpolation: 'linear' },
    ...quarterKeys,
    {
      ...last!,
      value: first!.value.map((value) => (value === 0 ? 0 : -value)) as Quaternion,
      interpolation: 'linear',
      ...(pivot ? { incomingPivotInterpolation: 'linear' as const } : {}),
    },
  ]
}
