import type { SceneAnimationClip, SceneAnimationTrack } from './animation'
import type { SceneAnimationKeyRef } from './animationCommands'

export const SCENE_ANIMATION_CHANNELS = ['translation', 'rotation', 'scale'] as const

/** Derived timeline data: exact source times; neither an authorial selection nor a snap grid. */
export function sceneAnimationKeySelection(clip: SceneAnimationClip, nodeIds: readonly string[]) {
  const selected = new Set(nodeIds)
  const tracks = clip.tracks.filter((track) => selected.has(track.nodeId))
  const channels = SCENE_ANIMATION_CHANNELS.map((channel) => {
    const matching = tracks.filter((track) => track.channel === channel)
    return {
      channel,
      times: [...new Set(matching.flatMap((track) => track.keys.map((key) => key.time)))].sort(
        (a, b) => a - b,
      ),
    }
  })
  return {
    channels,
    times: [...new Set(channels.flatMap((channel) => channel.times))].sort((a, b) => a - b),
    inRange(
      start: number,
      end: number,
      channel: SceneAnimationTrack['channel'] | 'all',
    ): SceneAnimationKeyRef[] {
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return []
      return tracks
        .filter((track) => channel === 'all' || track.channel === channel)
        .flatMap((track) =>
          track.keys
            .filter((key) => key.time >= start && key.time <= end)
            .map((key) => ({ nodeId: track.nodeId, channel: track.channel, time: key.time })),
        )
    },
  }
}

/** The nearest exact key, with the earlier key winning ties. Empty strips select nothing. */
export function nearestSceneAnimationKey(times: readonly number[], time: number) {
  if (!times.length || !Number.isFinite(time)) return undefined
  let low = 0,
    high = times.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (times[middle]! < time) low = middle + 1
    else high = middle
  }
  const before = times[low - 1],
    after = times[low]
  if (before === undefined) return after
  if (after === undefined) return before
  return time - before <= after - time ? before : after
}
