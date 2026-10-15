import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationKey, SceneAnimationTrack } from '../scene/animation'
import type { ModelSceneNode } from '../scene/document'
import { sampleSceneAnimationTransform } from '../scene/sampleAnimation'
import { requireScene } from '../scene/validation'
import { MAX_SCENE_GLB_ANIMATION_KEYS, SCENE_GLB_VECTOR_ERROR } from './sceneGlbTrack'

function interval(track: SceneAnimationTrack | undefined, time: number) {
  if (!track) return null
  let low = 0,
    high = track.keys.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (track.keys[middle]!.time <= time) low = middle + 1
    else high = middle
  }
  const a = track.keys[low - 1],
    b = track.keys[low]
  return a && b ? { a, b, duration: b.time - a.time } : null
}

function vectorRates(track: SceneAnimationTrack | undefined, time: number) {
  const active = interval(track, time)
  if (!active || active.a.interpolation === 'step') return { velocity: 0, acceleration: 0 }
  const distance = Math.hypot(...active.a.value.map((n, axis) => active.b.value[axis]! - n))
  const smooth = active.a.interpolation === 'smooth'
  return {
    velocity: (distance * (smooth ? 1.5 : 1)) / active.duration,
    acceleration: smooth ? (6 * distance) / active.duration ** 2 : 0,
  }
}

function previousFloat(time: number) {
  const view = new DataView(new ArrayBuffer(4))
  view.setFloat32(0, time, true)
  view.setUint32(0, view.getUint32(0, true) - 1, true)
  return view.getFloat32(0, true)
}

/** Derived GLB position channel. The native curve remains exact; the portable curve has a
 * conservative second-derivative bound (M*h²/8), including smoothstep's off-center extrema.
 * Every source key is a boundary, and stepped intervals retain their Float32 predecessor.
 */
export function sceneGlbPivotTranslation(
  node: ModelSceneNode,
  clip: SceneAnimationClip,
): SceneAnimationTrack | null {
  const tracks = clip.tracks.filter((track) => track.nodeId === node.id)
  const rotation = tracks.find((track) => track.channel === 'rotation')
  if (!rotation?.keys.some((key) => key.incomingPivot)) return null
  const translation = tracks.find((track) => track.channel === 'translation')
  const scale = tracks.find((track) => track.channel === 'scale')
  const restScale =
    clip.space === 'local' && node.transform.kind === 'trs' ? node.transform.scale : [1, 1, 1]
  let maxScale = Math.hypot(...restScale),
    radius = 0,
    positionRange = 0
  for (const key of scale?.keys ?? []) maxScale = Math.max(maxScale, Math.hypot(...key.value))
  for (const key of rotation.keys)
    if (key.incomingPivot) radius = Math.max(radius, Math.hypot(...key.incomingPivot))
  const firstPosition = translation?.keys[0]?.value ?? [0, 0, 0]
  for (const key of translation?.keys ?? [])
    positionRange = Math.max(
      positionRange,
      Math.hypot(...key.value.map((n, axis) => n - firstPosition[axis]!)),
    )
  const tolerance = SCENE_GLB_VECTOR_ERROR * Math.max(1e-12, positionRange, radius * maxScale)
  const times = [
    ...new Set([0, clip.duration, ...tracks.flatMap((track) => track.keys.map((key) => key.time))]),
  ].sort((a, b) => a - b)
  const keys: SceneAnimationKey<Vec3>[] = []
  const append = (time: number) => {
    requireScene(
      keys.length < MAX_SCENE_GLB_ANIMATION_KEYS,
      'export.animation.keys',
      'O giro em torno do pivô geraria amostras demais no GLB.',
    )
    keys.push({
      time,
      value: sampleSceneAnimationTransform(node, clip.space, tracks, time).translation,
      interpolation: 'linear',
    })
  }
  append(0)
  for (let i = 0; i < times.length - 1; i++) {
    const start = times[i]!,
      end = times[i + 1]!,
      middle = (start + end) / 2
    let curvature = vectorRates(translation, middle).acceleration
    const turn = interval(rotation, middle)
    if (turn?.b.incomingPivot) {
      const norm = Math.hypot(...turn.a.value) * Math.hypot(...turn.b.value)
      const cosine = Math.min(
        1,
        Math.abs(turn.a.value.reduce((sum, n, axis) => sum + n * turn.b.value[axis]!, 0) / norm),
      )
      const angle = 2 * Math.acos(cosine)
      const smooth = turn.a.interpolation === 'smooth',
        stepped = turn.a.interpolation === 'step'
      const velocity = stepped ? 0 : (angle * (smooth ? 1.5 : 1)) / turn.duration
      const acceleration = smooth ? (6 * angle) / turn.duration ** 2 : 0
      const pointRadius = Math.hypot(...turn.b.incomingPivot)
      const scaling = vectorRates(scale, middle)
      const referenceAcceleration = smooth ? (12 * maxScale * pointRadius) / turn.duration ** 2 : 0
      curvature +=
        referenceAcceleration +
        pointRadius *
          (maxScale * (velocity ** 2 + acceleration) +
            2 * velocity * scaling.velocity +
            scaling.acceleration)
    }
    const jump = tracks.some((track) => {
      const span = interval(track, middle)
      return span?.a.interpolation === 'step' && span.b.time === end
    })
    const continuousEnd = jump ? previousFloat(end) : end
    requireScene(
      continuousEnd > start,
      'export.animation.time',
      'Há poses próximas demais para preservar o giro no GLB.',
    )
    const steps = Math.max(
      1,
      Math.ceil((continuousEnd - start) * Math.sqrt(curvature / (8 * tolerance))),
    )
    requireScene(
      Number.isFinite(steps) && keys.length + steps + Number(jump) <= MAX_SCENE_GLB_ANIMATION_KEYS,
      'export.animation.keys',
      'O giro em torno do pivô geraria amostras demais no GLB.',
    )
    for (let step = 1; step <= steps; step++)
      append(step === steps ? continuousEnd : start + ((continuousEnd - start) * step) / steps)
    if (jump) append(end)
  }
  return { nodeId: node.id, channel: 'translation', keys }
}
