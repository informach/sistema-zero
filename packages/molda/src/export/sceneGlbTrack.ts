import type { SceneAnimationTrack } from '../scene/animation'
import { sampleSceneAnimationTrack } from '../scene/sampleAnimation'
import { requireScene } from '../scene/validation'

export const MAX_SCENE_GLB_ANIMATION_KEYS = 262_144
/** Before Float32 time/value rounding: <=0.1 degree for a smooth shortest-arc turn. */
export const SCENE_GLB_ROTATION_ERROR = Math.PI / 1800
/** Before Float32 rounding: <=1/1024 of a smooth vector segment's excursion. */
export const SCENE_GLB_VECTOR_ERROR = 1 / 1024
export interface SceneGlbAnimationBudget {
  keys: number
  channels: number
}
interface ExportKey {
  time: number
  value: readonly number[]
  curve: 'step' | 'linear' | 'smooth'
}

function reserve(budget: SceneGlbAnimationBudget, count: number) {
  requireScene(
    budget.keys + count <= MAX_SCENE_GLB_ANIMATION_KEYS,
    'export.animation.keys',
    'A conversão geraria chaves demais no GLB. Simplifique os movimentos antes de exportar.',
  )
  budget.keys += count
}
function rotationAngle(a: readonly number[], b: readonly number[]) {
  const lengths = Math.hypot(...a) * Math.hypot(...b)
  return (
    2 *
    Math.acos(Math.min(1, Math.abs(a.reduce((sum, value, i) => sum + value * b[i]!, 0) / lengths)))
  )
}
/** Positive Float32 predecessor, not an arbitrary epsilon tied to clip duration. */
function previousTime(time: number) {
  const bytes = new ArrayBuffer(4),
    view = new DataView(bytes)
  view.setFloat32(0, time, true)
  view.setUint32(0, view.getUint32(0, true) - 1, true)
  return view.getFloat32(0, true)
}
function value(track: SceneAnimationTrack, key: { value: readonly number[] }) {
  if (track.channel !== 'rotation') return key.value
  const length = Math.hypot(...key.value)
  return key.value.map((component) => component / length)
}

/** Pure derived sampler; interpolation never changes the authorial Double keys. */
export function prepareSceneGlbTrack(
  track: SceneAnimationTrack,
  duration: number,
  budget: SceneGlbAnimationBudget,
) {
  const end = Math.fround(duration)
  requireScene(
    Number.isFinite(end) && end > 0,
    'export.animation.duration',
    'A duração do movimento não cabe na precisão do GLB.',
  )
  let previous = -1
  for (const key of track.keys) {
    const time = Math.fround(key.time)
    requireScene(
      Number.isFinite(time) && time > previous && time >= 0 && time <= end,
      'export.animation.time',
      'Duas chaves ficariam no mesmo instante, ou fora do movimento, na precisão do GLB.',
    )
    previous = time
  }
  const curves = new Set(track.keys.slice(0, -1).map((key) => key.interpolation))
  const allStep = !curves.size || (curves.size === 1 && curves.has('step'))
  const resampled =
    !allStep && (curves.has('step') || (track.channel === 'rotation' && curves.has('smooth')))
  const interpolation: 'STEP' | 'LINEAR' | 'CUBICSPLINE' = allStep
    ? 'STEP'
    : resampled || !curves.has('smooth')
      ? 'LINEAR'
      : 'CUBICSPLINE'
  const keys: ExportKey[] = []
  const append = (time: number, values: readonly number[], curve: ExportKey['curve']) => {
    reserve(budget, 1)
    requireScene(
      !keys.length || time > keys[keys.length - 1]!.time,
      'export.animation.time',
      'As amostras do movimento não cabem em instantes distintos no GLB.',
    )
    keys.push({ time, value: values, curve })
  }
  const first = track.keys[0]!
  if (Math.fround(first.time) > 0) append(0, value(track, first), 'step')
  for (const [index, key] of track.keys.entries()) {
    const next = track.keys[index + 1]
    const time = Math.fround(key.time)
    append(time, value(track, key), key.interpolation)
    if (!resampled || !next) continue
    const nextTime = Math.fround(next.time)
    if (key.interpolation === 'step') {
      const hold = previousTime(nextTime)
      // The final Float32 interval becomes an explicit, reported transition.
      requireScene(
        hold > time,
        'export.animation.step',
        'Há uma pausa curta demais para combinar essas curvas no GLB sem perder uma chave.',
      )
      append(hold, value(track, key), 'linear')
    } else if (key.interpolation === 'smooth') {
      // |smoothstep''| <= 6; linear segment error <= 6*h²/8. The shortest-arc
      // angle scales that error. Midpoint-only adaptive tests miss symmetric easing.
      const excursion = track.channel === 'rotation' ? rotationAngle(key.value, next.value) : 1
      const tolerance =
        track.channel === 'rotation' ? SCENE_GLB_ROTATION_ERROR : SCENE_GLB_VECTOR_ERROR
      const steps = Math.max(1, Math.ceil(Math.sqrt((0.75 * excursion) / tolerance)))
      for (let i = 1; i < steps; i++) {
        const sampleTime = key.time + (next.time - key.time) * (i / steps)
        const encodedTime = Math.fround(sampleTime)
        requireScene(
          encodedTime < nextTime,
          'export.animation.time',
          'As amostras do movimento não cabem em instantes distintos no GLB.',
        )
        append(encodedTime, sampleSceneAnimationTrack(track, sampleTime), 'linear')
      }
    }
  }
  const last = keys[keys.length - 1]!
  if (last.time < end) {
    last.curve = 'step'
    append(end, last.value, 'step')
  }
  const components = track.channel === 'rotation' ? 4 : 3
  const cubic = interpolation === 'CUBICSPLINE'
  const output = new Float32Array(keys.length * components * (cubic ? 3 : 1))
  for (const [i, key] of keys.entries()) {
    const offset = i * components * (cubic ? 3 : 1)
    output.set(key.value, offset + (cubic ? components : 0))
    if (!cubic) continue
    const before = keys[i - 1],
      after = keys[i + 1]
    for (let axis = 0; axis < components; axis++) {
      if (before?.curve === 'linear')
        output[offset + axis] = (key.value[axis]! - before.value[axis]!) / (key.time - before.time)
      if (after && key.curve === 'linear')
        output[offset + 2 * components + axis] =
          (after.value[axis]! - key.value[axis]!) / (after.time - key.time)
    }
  }
  requireScene(
    output.every(Number.isFinite),
    'export.animation.value',
    'Os valores ou curvas do movimento não cabem na precisão do GLB.',
  )
  return {
    times: Float32Array.from(keys.map((key) => key.time)),
    output,
    interpolation,
    resampled,
    components,
    samples: keys.length,
  }
}
