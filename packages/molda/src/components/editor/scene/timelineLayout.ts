export const TIMELINE_DEFAULT = 306
export const TIMELINE_MIN = 162
export const TIMELINE_COLLAPSED = 60
export const TIMELINE_VIEWPORT_MIN = 240
export const TIMELINE_STORAGE = 'molda.timelineHeight'

export function timelineHeight(preferred: number, center: number) {
  const maximum = Math.max(TIMELINE_COLLAPSED, center - TIMELINE_VIEWPORT_MIN)
  if (maximum < TIMELINE_MIN || preferred === TIMELINE_COLLAPSED) return TIMELINE_COLLAPSED
  return Math.min(Math.max(preferred, TIMELINE_MIN), maximum)
}

export function timelineReleasedHeight(raw: number, center: number) {
  return timelineHeight(raw < 120 ? TIMELINE_COLLAPSED : Math.max(TIMELINE_MIN, raw), center)
}

export function timelineStoredHeight(raw: string | null) {
  const value = raw === null ? NaN : Number(raw)
  return Number.isFinite(value) &&
    (value === TIMELINE_COLLAPSED || value >= TIMELINE_MIN) &&
    value <= 100_000
    ? value
    : TIMELINE_DEFAULT
}

/** Duration remains exact; the 14px margins are shared by ruler, keys and playhead. */
export function timelineTimeAt(x: number, width: number, duration: number) {
  return Math.max(0, Math.min(duration, ((x - 14) / Math.max(1, width - 28)) * duration))
}

export function timelineSnappedTime(time: number, duration: number) {
  return Math.max(0, Math.min(duration, Math.round(time * 20) / 20))
}

import { nearestSceneAnimationKey } from '../../../scene/animationKeySelection'

export function timelineSeekTime(
  x: number,
  width: number,
  duration: number,
  times: readonly number[],
) {
  const time = timelineTimeAt(x, width, duration)
  const nearest = nearestSceneAnimationKey(times, time)
  return nearest !== undefined &&
    (Math.abs(nearest - time) / duration) * Math.max(1, width - 28) <= 6
    ? nearest
    : timelineSnappedTime(time, duration)
}
