import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationKey, SceneAnimationTrack } from '../scene/animation'
import { SCENE_LIMITS } from '../scene/limits'
import type { Quaternion } from '../scene/matrix'
import { prepareGltfAnimationChannel } from './gltfAnimationSample'
import { type GltfClipTrackPlan, gltfCubicSampleTimes, planGltfClips } from './gltfClipPlan'
import type { GltfClipOptions } from './gltfClipTypes'
import type { GltfDocument } from './gltfDocument'
import type { GltfHierarchy } from './gltfHierarchy'
import { GltfInputError, requireGltf } from './gltfInput'
import { gltfNativeName } from './gltfNativeName'
import type { GltfSelection } from './gltfSelection'

/** Owned native clips only; does not commit, start playback or approve loss reports. */
export function convertGltfClips(
  source: GltfDocument,
  selection: GltfSelection,
  hierarchy: GltfHierarchy,
  options: GltfClipOptions = {},
) {
  const { plans, issues, fps, loop, rotations, minimumKeys } = planGltfClips(
      source,
      selection,
      hierarchy,
      options,
    ),
    values = new Map<number, Float64Array>(),
    schedules = new Map<number, number[]>(),
    timesByTrack = new Map<GltfClipTrackPlan, Float64Array | number[]>()
  let keys = minimumKeys
  function data(index: number) {
    let result = values.get(index)
    if (!result) {
      result = source.accessors[index]!.values
      values.set(index, result)
    }
    return result
  }
  // Finalize every schedule and its per-target cost before reading output values.
  for (const plan of plans)
    for (const track of plan.tracks) {
      const sampler = plan.animation.samplers[plan.animation.channels[track.channel]!.sampler]!,
        input = data(track.input)
      let times: Float64Array | number[] = input
      if (sampler.interpolation === 'CUBICSPLINE') {
        let schedule = schedules.get(track.input)
        if (!schedule) {
          schedule = gltfCubicSampleTimes(
            input,
            fps,
            SCENE_LIMITS.animationKeys - keys + track.lowerKeyCount,
            track.path,
          )
          schedules.set(track.input, schedule)
        }
        times = schedule
      }
      keys += times.length - track.lowerKeyCount
      if (keys > SCENE_LIMITS.animationKeys)
        throw new GltfInputError(
          'budget',
          track.path,
          'As chaves de todos os alvos ultrapassam o orçamento nativo.',
        )
      timesByTrack.set(track, times)
    }
  const animations = plans.map((plan): SceneAnimationClip => {
    const { name, change } = gltfNativeName(
      plan.animation.name,
      `Movimento ${plan.sourceIndex + 1}`,
    )
    if (change) issues.push({ code: change, clipId: plan.id, path: `${plan.path}.name`, count: 1 })
    const tracks = plan.tracks.map((track): SceneAnimationTrack => {
      const channel = plan.animation.channels[track.channel]!,
        sampler = plan.animation.samplers[channel.sampler]!,
        cubic = sampler.interpolation === 'CUBICSPLINE',
        sample = cubic
          ? prepareGltfAnimationChannel(plan.animation, track.channel, source.accessors, plan.path)
          : null,
        output = cubic ? null : data(sampler.output),
        times = timesByTrack.get(track)!,
        method = sampler.interpolation === 'STEP' ? 'step' : 'linear'
      let normalized = 0,
        maximumNormError = 0
      function keyValues<T extends Vec3 | Quaternion>(
        width: 3 | 4,
        convert: (value: Float64Array) => T,
      ): SceneAnimationKey<T>[] {
        return Array.from(times, (time, i) => {
          const value = sample ? sample.sample(time) : output!.subarray(i * width, (i + 1) * width)
          for (const component of value)
            requireGltf(
              Number.isFinite(component),
              track.path,
              'Esta curva produz valores não finitos.',
            )
          return { time, interpolation: method, value: convert(value) }
        })
      }
      function rotation(value: Float64Array): Quaternion {
        const quaternion: Quaternion = [value[0]!, value[1]!, value[2]!, value[3]!],
          norm = Math.hypot(...quaternion),
          error = Math.abs(norm - 1)
        if (error > 1e-6) {
          if (rotations === 'preserve')
            throw new GltfInputError(
              'unsupported',
              track.path,
              'Esta rotação exige normalização explícita para atender ao contrato nativo.',
            )
          requireGltf(
            norm > 0 && Number.isFinite(norm),
            track.path,
            'A rotação não pode ser nula ou não finita.',
          )
          for (let c = 0; c < 4; c++) quaternion[c] = quaternion[c]! / norm
          normalized++
          maximumNormError = Math.max(maximumNormError, error)
        }
        return quaternion
      }
      const native: SceneAnimationTrack =
        track.property === 'rotation'
          ? {
              nodeId: track.nodeId,
              channel: track.property,
              keys: keyValues(4, rotation),
            }
          : {
              nodeId: track.nodeId,
              channel: track.property,
              keys: keyValues<Vec3>(3, (value) => [value[0]!, value[1]!, value[2]!]),
            }
      if (cubic)
        issues.push({
          code: 'cubic-resampled',
          clipId: plan.id,
          path: track.path,
          count: times.length,
          fps,
        })
      if (normalized)
        issues.push({
          code: 'rotation-keys-normalized',
          clipId: plan.id,
          path: track.path,
          count: normalized,
          maximumNormError,
        })
      return native
    })
    return { id: plan.id, name, duration: plan.duration, fps, loop, space: 'local', tracks }
  })
  return { animations, issues }
}
