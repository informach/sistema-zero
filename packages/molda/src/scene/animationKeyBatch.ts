import type { SceneAnimationTrack } from './animation'
import { replaceSceneAnimation, sceneAnimationContext } from './animationCommandContext'
import type { SceneAnimationKeyInput } from './animationCommands'
import type { MoldaSceneDocument } from './document'
import { SCENE_LIMITS } from './limits'
import { readSceneAnimationClip } from './readAnimation'
import * as v from './validation'

/** One validation/commit boundary for a whole pose; no repeated indexing of geometry per channel. */
export function setSceneAnimationKeys(
  document: MoldaSceneDocument,
  clipId: string,
  inputs: readonly SceneAnimationKeyInput[],
) {
  const { clip, editable, index } = sceneAnimationContext(document, clipId)
  const grouped = new Map<
    string,
    { nodeId: string; channel: SceneAnimationTrack['channel']; keys: Map<number, unknown> }
  >()
  for (const raw of v.list(inputs, 'keys', SCENE_LIMITS.animationKeys)) {
    const input = v.record(raw, 'key', ['nodeId', 'channel', 'key'])
    const nodeId = v.id(input.nodeId, 'nodeId')
    const channel = v.choice(input.channel, ['translation', 'rotation', 'scale'], 'channel')
    const key = v.record(input.key, 'key', ['time', 'value', 'interpolation'])
    const time = v.number(key.time, 'time', 0, clip.duration)
    const pair = JSON.stringify([nodeId, channel])
    const group = grouped.get(pair) ?? { nodeId, channel, keys: new Map<number, unknown>() }
    v.requireScene(
      !group.keys.has(time),
      'time',
      'A mesma chave apareceu duas vezes. Confira a pose.',
    )
    group.keys.set(time, input.key)
    grouped.set(pair, group)
  }
  if (!grouped.size) return document
  editable([...grouped.values()].map((group) => group.nodeId))
  const previous = new Map(
    clip.tracks.map((track) => [JSON.stringify([track.nodeId, track.channel]), track]),
  )
  let addedTracks = 0,
    addedKeys = 0
  for (const [pair, group] of grouped) {
    const track = previous.get(pair)
    if (!track) {
      addedTracks++
      addedKeys += group.keys.size
    } else {
      const available = new Set(track.keys.map((key) => key.time))
      for (const time of group.keys.keys()) if (!available.has(time)) addedKeys++
    }
  }
  v.requireScene(
    index.animationTrackCount + addedTracks <= SCENE_LIMITS.animationTracks &&
      index.animationKeyCount + addedKeys <= SCENE_LIMITS.animationKeys,
    'keys',
    'Essa pose ultrapassa o orçamento de movimentos da criação.',
  )
  const owned = readSceneAnimationClip({
    ...clip,
    tracks: [...grouped.values()].map((group) => ({
      nodeId: group.nodeId,
      channel: group.channel,
      keys: [...group.keys].sort((a, b) => a[0] - b[0]).map(([, key]) => key),
    })),
  }).tracks
  const merged = new Map<string, SceneAnimationTrack>()
  let changed = false
  for (const track of owned) {
    const pair = JSON.stringify([track.nodeId, track.channel]),
      before = previous.get(pair)
    if (!before) {
      merged.set(pair, track)
      changed = true
      continue
    }
    const replacements = new Map(track.keys.map((key) => [key.time, key]))
    let trackChanged = false
    const keys = before.keys.map((key) => {
      const next = replacements.get(key.time)
      if (!next) return key
      replacements.delete(key.time)
      if (
        next.interpolation === key.interpolation &&
        next.value.every((value, i) => value === key.value[i])
      )
        return key
      trackChanged = true
      return next
    })
    if (trackChanged || replacements.size) {
      for (const key of replacements.values()) keys.push(key)
      keys.sort((a, b) => a.time - b.time)
      merged.set(pair, { ...track, keys } as SceneAnimationTrack)
      changed = true
    } else merged.set(pair, before)
  }
  if (!changed) return document
  return replaceSceneAnimation(document, {
    ...clip,
    tracks: [
      ...clip.tracks.map(
        (track) => merged.get(JSON.stringify([track.nodeId, track.channel])) ?? track,
      ),
      ...owned.filter((track) => !previous.has(JSON.stringify([track.nodeId, track.channel]))),
    ],
  })
}
