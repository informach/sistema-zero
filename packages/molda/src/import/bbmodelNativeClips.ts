import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationKey, SceneAnimationTrack } from '../scene/animation'
import { SCENE_LIMITS } from '../scene/limits'
import type { Quaternion } from '../scene/matrix'
import { id, SceneValidationError } from '../scene/validation'
import {
  prepareBbmodelLocalAnimationValues,
  readBbmodelAnimationPoseOptions,
} from './bbmodelAnimationPose'
import { sampleBbmodelContinuousTrack } from './bbmodelAnimationSample'
import { planBbmodelAnimationSchedules } from './bbmodelAnimationSchedule'
import type { BbmodelNumericAnimationTrack } from './bbmodelAnimationTrackTypes'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type {
  BbmodelNativeClipDraft,
  BbmodelNativeClipOptions,
  BbmodelNativeClipReport,
  BbmodelNativeClipTrackReport,
} from './bbmodelNativeClipTypes'
import { bbmodelNumber } from './bbmodelValues'
import { nativeImportName } from './nativeImportName'

export function readBbmodelNativeClipOptions(value: BbmodelNativeClipOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como adaptar os movimentos.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      key === 'adaptation' || key === 'discontinuities' || key === 'zeroScale',
      `options.${key}`,
      'Esta opção de movimento não é conhecida.',
    )
  const adaptation = value.adaptation === undefined ? 'reject' : value.adaptation,
    discontinuities = value.discontinuities === undefined ? 'reject' : value.discontinuities,
    pose = readBbmodelAnimationPoseOptions({ zeroScale: value.zeroScale })
  requireBbmodel(
    adaptation === 'reject' || adaptation === 'continuous-sampled',
    'options.adaptation',
    'Escolha se os movimentos podem ser adaptados para curvas e quadros do Molda.',
  )
  requireBbmodel(
    discontinuities === 'reject' || discontinuities === 'sample-pre',
    'options.discontinuities',
    'Escolha como tratar chaves com valores diferentes antes e depois do instante.',
  )
  return { adaptation, discontinuities, ...pose }
}
function unsupported(path: string, message: string): never {
  throw new BbmodelInputError('unsupported', path, message)
}
function budget(path: string): never {
  throw new BbmodelInputError('budget', path, 'Os movimentos ultrapassam o orçamento nativo.')
}
function checkHeaders(clips: readonly BbmodelNativeClipDraft[]) {
  if (clips.length > SCENE_LIMITS.animationClips) budget('animations')
  let tracks = 0
  const indices = new Set<number>()
  for (const clip of clips) {
    requireBbmodel(
      Number.isSafeInteger(clip.clip) && clip.clip >= 0 && !indices.has(clip.clip),
      clip.path,
      'O índice do movimento precisa ser único e válido.',
    )
    indices.add(clip.clip)
    const weight = bbmodelNumber(clip.weight, `${clip.path}.weight`)
    requireBbmodel(weight >= 0, `${clip.path}.weight`, 'O peso do movimento não pode ser negativo.')
    for (const field of ['loop', 'catmullLoopNeighbours'] as const)
      requireBbmodel(
        typeof clip[field] === 'boolean',
        `${clip.path}.${field}`,
        'A escolha de repetição precisa ser explícita.',
      )
    tracks += clip.tracks.length
    if (tracks > SCENE_LIMITS.animationTracks) budget(`${clip.path}.tracks`)
  }
}
function sampling(track: BbmodelNumericAnimationTrack, prePost: boolean): 'authored' | 'grid' {
  if (prePost) return 'grid'
  if (
    track.keys.some((key) => key.interpolation === 'bezier' || key.interpolation === 'catmullrom')
  )
    return 'grid'
  if (
    track.channel === 'rotation' &&
    track.keys.length > 1 &&
    track.keys.some((key) => key.interpolation !== 'step')
  )
    return 'grid'
  return 'authored'
}
/** Outgoing segment at a schedule time. Exact source keys start their own segment. */
function interpolation(track: BbmodelNumericAnimationTrack, time: number): 'step' | 'linear' {
  let low = 0,
    high = track.keys.length
  while (low < high) {
    const middle = (low + high) >>> 1,
      key = track.keys[middle]
    if (!key) throw new Error('Prepared bbmodel track changed during conversion')
    if (key.time <= time) low = middle + 1
    else high = middle
  }
  const before = track.keys[low - 1]
  return !before || low === track.keys.length || before.interpolation === 'step' ? 'step' : 'linear'
}
function canonical<T extends Vec3 | Quaternion>(value: T): T {
  // The mapper owns this array. Native persistence has one zero, with no F64 quantization.
  for (let i = 0; i < value.length; i++) if (value[i] === 0) value[i] = 0
  return value
}

/**
 * Owned native clips from prepared local-Euler group drafts. No source omission, binding,
 * flag approval, duration inference or Molang execution. The source planner must handle
 * those gates and report source metadata before calling this private synchronous assembler.
 *
 * Explicit mathematical adaptation: exact times, continuous curves, then native step/linear
 * and quaternion shortest-arc interpolation between samples. FPS does NOT bound error or
 * prevent rotation aliasing. Pre/post adaptation samples pre at the exact key and may smear
 * or miss the jump. Reports are bounded per track, never per generated key.
 *
 * Global schedules fit BEFORE any XYZ, handles or rest-pose values are read. Local numeric
 * checks are not animated world/geometry bounds; these clips alone cannot authorize adoption.
 */
export function convertBbmodelPreparedClips(
  clips: readonly BbmodelNativeClipDraft[],
  options: BbmodelNativeClipOptions = {},
) {
  const policy = readBbmodelNativeClipOptions(options)
  if (clips.length && policy.adaptation === 'reject')
    unsupported(
      'options.adaptation',
      'A conversão dos movimentos precisa de uma escolha de adaptação.',
    )
  checkHeaders(clips)
  const reports: BbmodelNativeClipReport[] = [],
    planned = clips.map((clip) => {
      const pairs = new Map<string, Set<string>>(),
        tracks = clip.tracks.map((entry) => {
          try {
            id(entry.nodeId, `${entry.path}.nodeId`)
          } catch (error) {
            if (error instanceof SceneValidationError)
              throw new BbmodelInputError('invalid', error.path, error.message)
            throw error
          }
          const { track } = entry,
            channels = pairs.get(entry.nodeId) ?? new Set<string>()
          requireBbmodel(
            !channels.has(track.channel),
            entry.path,
            'Esta peça tem trilhas repetidas.',
          )
          channels.add(track.channel)
          pairs.set(entry.nodeId, channels)
          const prePostKeys = track.keys.reduce(
            (count, key) => count + Number(key.points.length === 2),
            0,
          )
          if (prePostKeys && policy.discontinuities === 'reject')
            unsupported(
              entry.path,
              'Estas chaves têm valores pre/post. Escolha como adaptar os saltos.',
            )
          return { ...entry, sampling: sampling(track, prePostKeys > 0), prePostKeys }
        })
      return { ...clip, tracks }
    }),
    schedules = planBbmodelAnimationSchedules(planned),
    animations = planned.map((clip, clipIndex): SceneAnimationClip => {
      const schedule = schedules.clips[clipIndex]
      if (!schedule || schedule.clip !== clip.clip)
        throw new Error('Mismatched bbmodel clip schedule')
      const clipId = `bbmodel_clip_${clip.clip}`,
        name = nativeImportName(clip.name, `Movimento ${clip.clip + 1}`),
        report: BbmodelNativeClipReport = {
          clip: clip.clip,
          clipId,
          path: clip.path,
          nameChange: name.change,
          duration: clip.duration,
          fps: clip.fps,
          loop: clip.loop,
          weight: clip.weight,
          catmullLoopNeighbours: clip.catmullLoopNeighbours,
          tracks: [],
        },
        tracks = clip.tracks.map((entry, index): SceneAnimationTrack => {
          const agenda = schedule.tracks[index]
          if (!agenda || agenda.track !== index)
            throw new Error('Mismatched bbmodel track schedule')
          const convert = prepareBbmodelLocalAnimationValues(
              entry.base,
              { zeroScale: policy.zeroScale },
              entry.path,
            ),
            info: BbmodelNativeClipTrackReport = {
              path: entry.path,
              nodeId: entry.nodeId,
              channel: entry.track.channel,
              sampling: entry.sampling,
              sourceKeys: entry.track.keys.length,
              keys: agenda.times.length,
              prePostKeys: entry.prePostKeys,
              reordered: entry.track.reordered,
              migration: { ...entry.track.migration },
              underflowComponents: 0,
              zeroScaleComponents: 0,
            },
            vectorKeys: SceneAnimationKey<Vec3>[] = [],
            rotationKeys: SceneAnimationKey<Quaternion>[] = []
          for (const time of agenda.times) {
            const point = sampleBbmodelContinuousTrack(
              entry.track,
              time,
              clip.catmullLoopNeighbours,
            )
            if (!point) throw new Error('An empty bbmodel track passed schedule validation')
            const value = convert(entry.track.channel, point, clip.weight, entry.path),
              method = interpolation(entry.track, time)
            info.underflowComponents += value.underflowComponents.length
            info.zeroScaleComponents += value.zeroScaleComponents.length
            if (value.channel === 'rotation')
              rotationKeys.push({ time, interpolation: method, value: canonical(value.value) })
            else vectorKeys.push({ time, interpolation: method, value: canonical(value.value) })
          }
          report.tracks.push(info)
          return entry.track.channel === 'rotation'
            ? { nodeId: entry.nodeId, channel: 'rotation', keys: rotationKeys }
            : {
                nodeId: entry.nodeId,
                channel: entry.track.channel === 'position' ? 'translation' : 'scale',
                keys: vectorKeys,
              }
        })
      reports.push(report)
      return {
        id: clipId,
        name: name.name,
        duration: clip.duration,
        fps: clip.fps,
        loop: clip.loop,
        space: 'local',
        tracks,
      }
    })
  return { animations, reports, policy, counts: { ...schedules.counts } }
}
