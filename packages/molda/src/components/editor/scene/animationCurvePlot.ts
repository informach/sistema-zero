import { Euler, Quaternion } from 'three'
import type { Vec3 } from '../../../core/model'
import type { SceneAnimationClip, SceneAnimationTrack } from '../../../scene/animation'
import type { ModelSceneNode } from '../../../scene/document'
import { sampleSceneAnimationTransform } from '../../../scene/sampleAnimation'

/** UI angle projection only; the file and sampler retain the original quaternion. */
export function sceneCurveValue(
  node: ModelSceneNode,
  clip: SceneAnimationClip,
  channel: SceneAnimationTrack['channel'],
  time: number,
): Vec3 {
  const pose = sampleSceneAnimationTransform(
    node,
    clip.space,
    clip.tracks.filter((track) => track.nodeId === node.id),
    time,
  )
  if (channel !== 'rotation') return pose[channel]
  const angle = new Euler().setFromQuaternion(new Quaternion().fromArray(pose.rotation), 'XYZ')
  return [angle.x, angle.y, angle.z].map((value) => (value * 180) / Math.PI) as Vec3
}

/** Bounded drawing budget. Exact key times remain in the keyboard/picking strip below the graph. */
export function sceneAnimationCurvePlot(
  node: ModelSceneNode,
  clip: SceneAnimationClip,
  channel: SceneAnimationTrack['channel'],
  start = 0,
  end = clip.duration,
) {
  const tracks = clip.tracks.filter((track) => track.nodeId === node.id)
  const times = new Set(Array.from({ length: 257 }, (_, i) => start + ((end - start) * i) / 256))
  const events = tracks.flatMap((track) =>
    track.keys.filter((key) => key.time >= start && key.time <= end).map((key) => key.time),
  )
  const sampled = events.length > 768
  if (!sampled)
    for (const time of events) {
      times.add(time)
      // Draw both sides of a discontinuity, without changing any authored key.
      if (time > start) times.add(Math.max(start, time - (end - start) * 1e-9))
    }
  const local = { ...clip, tracks }
  const points = [...times]
    .sort((a, b) => a - b)
    .map((time) => ({ time, values: sceneCurveValue(node, local, channel, time) }))
  const ranges = [0, 1, 2].map((axis) => {
    let min = Infinity,
      max = -Infinity
    for (const point of points) {
      min = Math.min(min, point.values[axis]!)
      max = Math.max(max, point.values[axis]!)
    }
    // Normalize before subtraction: opposite finite extrema must not overflow the graph.
    const magnitude = Math.max(1, Math.abs(min), Math.abs(max))
    const low = min / magnitude,
      high = max / magnitude
    const pad = Math.max(0.1 / magnitude, (high - low) * 0.08)
    return { magnitude, low: low - pad, high: high + pad }
  })
  return { points, ranges, sampled, start, end }
}

export function curveVertical(
  value: number,
  range: { magnitude: number; low: number; high: number },
) {
  return (range.high - value / range.magnitude) / (range.high - range.low)
}
