import { SCENE_LIMITS } from '../scene/limits'
import { countRegularAnimationTimes, mergeAnimationSampleTimes } from './animationSampleTimes'
import type { BbmodelNumericAnimationTrack } from './bbmodelAnimationTrackTypes'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import { bbmodelNumber } from './bbmodelValues'

export interface BbmodelAnimationScheduleTrack {
  path: string
  /** Chosen by the converter after checking the channel/curve, never inferred from FPS. */
  sampling: 'authored' | 'grid'
  track: BbmodelNumericAnimationTrack
}
export interface BbmodelAnimationScheduleClip {
  /** Original source clip index/path, not this selection's position. */
  clip: number
  path: string
  /** Explicit native duration and sampling FPS, not source length/snapping inference. */
  duration: number
  fps: number
  tracks: readonly BbmodelAnimationScheduleTrack[]
}
function budget(path: string, message: string): never {
  throw new BbmodelInputError('budget', path, message)
}
function* authoredTimes(track: BbmodelNumericAnimationTrack) {
  for (const key of track.keys) yield key.time
}
function times(clip: BbmodelAnimationScheduleClip, track: BbmodelAnimationScheduleTrack) {
  return mergeAnimationSampleTimes(
    authoredTimes(track.track),
    0,
    clip.duration,
    clip.fps,
    track.sampling,
  )
}

/**
 * Private immutable drafts after source preparation and explicit conversion choices. Validates
 * native timing/cardinalities and counts the entire union BEFORE allocating any time array.
 * Does not read XYZ/handles, choose clip duration, resolve targets, sample or approve adoption.
 */
export function planBbmodelAnimationSchedules(clips: readonly BbmodelAnimationScheduleClip[]) {
  if (clips.length > SCENE_LIMITS.animationClips)
    budget('animations', 'Há clipes demais para converter de uma vez.')
  let trackCount = 0,
    minimumKeys = 0
  for (const clip of clips) {
    const duration = bbmodelNumber(clip.duration, `${clip.path}.duration`),
      fps = bbmodelNumber(clip.fps, `${clip.path}.fps`)
    requireBbmodel(duration > 0, `${clip.path}.duration`, 'Escolha uma duração maior que zero.')
    requireBbmodel(
      Number.isInteger(fps) && fps >= 1 && fps <= 120,
      `${clip.path}.fps`,
      'Escolha de 1 a 120 quadros por segundo, sem frações.',
    )
    if (duration > SCENE_LIMITS.animationSeconds)
      budget(`${clip.path}.duration`, 'Este movimento ultrapassa a duração máxima do Molda.')
    trackCount += clip.tracks.length
    if (trackCount > SCENE_LIMITS.animationTracks)
      budget(`${clip.path}.tracks`, 'As trilhas de todos os clipes ultrapassam o limite do Molda.')
    const regularCount = countRegularAnimationTimes(0, duration, fps)
    for (const track of clip.tracks) {
      requireBbmodel(
        track.sampling === 'authored' || track.sampling === 'grid',
        `${track.path}.sampling`,
        'Escolha manter os tempos autorais ou acrescentar uma grade de amostragem.',
      )
      minimumKeys += track.sampling === 'grid' ? regularCount : 2
    }
  }
  if (minimumKeys > SCENE_LIMITS.animationKeys)
    budget('animations', 'Só a grade de amostragem já ultrapassa o limite conjunto de chaves.')

  let keyCount = 0
  // Finish ALL counts before the materialization pass; no partial schedules on budget failure.
  for (const clip of clips) {
    for (const track of clip.tracks) {
      requireBbmodel(
        track.track.keys.length > 0,
        track.path,
        'Uma trilha vazia não pode gerar chaves de movimento.',
      )
      for (const _ of times(clip, track)) {
        keyCount++
        if (keyCount > SCENE_LIMITS.animationKeys)
          budget(track.path, 'As amostras e chaves autorais de todos os clipes excedem o limite.')
      }
    }
  }
  return {
    clips: clips.map((clip) => ({
      clip: clip.clip,
      tracks: clip.tracks.map((track, index) => ({
        track: index,
        times: Array.from(times(clip, track)),
      })),
    })),
    counts: { clips: clips.length, tracks: trackCount, keys: keyCount },
  }
}
