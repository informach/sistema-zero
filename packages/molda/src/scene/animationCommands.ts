import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationKey, SceneAnimationTrack } from './animation'
import {
  sceneAnimationContext as context,
  replaceSceneAnimation as replace,
} from './animationCommandContext'
import { setSceneAnimationKeys } from './animationKeyBatch'
import { allocateSceneId, finishSceneCommand } from './commandContext'
import type { MoldaSceneDocument } from './document'
import { SCENE_LIMITS } from './limits'
import type { Quaternion } from './matrix'
import * as v from './validation'

export type SceneAnimationKeyInput = { nodeId: string } & (
  | { channel: 'translation' | 'scale'; key: SceneAnimationKey<Vec3> }
  | { channel: 'rotation'; key: SceneAnimationKey<Quaternion> }
)

export interface SceneAnimationKeyRef {
  nodeId: string
  channel: SceneAnimationTrack['channel']
  time: number
}

function duration(value: number) {
  return v.number(value, 'duration', Number.MIN_VALUE, SCENE_LIMITS.animationSeconds)
}

/** Validates retimed keys without copying immutable, unchanged source values. */
function requireOrderedTimes(clip: SceneAnimationClip) {
  for (const track of clip.tracks) {
    let previous = -1
    for (const key of track.keys) {
      v.number(key.time, 'time', 0, clip.duration)
      v.requireScene(
        key.time > previous,
        'time',
        'Duas chaves ficariam no mesmo instante. Use um intervalo maior.',
      )
      previous = key.time
    }
  }
}

export function createSceneAnimation(document: MoldaSceneDocument, name: string, nextId = newId) {
  const clip: SceneAnimationClip = {
    id: allocateSceneId(document, nextId)(),
    name: v.text(name.trim(), 'name', 48),
    duration: 2,
    fps: 24,
    loop: true,
    space: 'local-delta',
    tracks: [],
  }
  return finishSceneCommand({ ...document, animations: [...(document.animations ?? []), clip] })
}

export function renameSceneAnimation(document: MoldaSceneDocument, clipId: string, name: string) {
  const { clip } = context(document, clipId)
  const valid = v.text(name.trim(), 'name', 48)
  return valid === clip.name ? document : replace(document, { ...clip, name: valid })
}

export function configureSceneAnimation(
  document: MoldaSceneDocument,
  clipId: string,
  settings: Pick<SceneAnimationClip, 'duration' | 'fps' | 'loop'>,
) {
  const { clip, editable } = context(document, clipId)
  v.record(settings, 'settings', ['duration', 'fps', 'loop'])
  const next = {
    ...clip,
    duration: duration(settings.duration),
    fps: v.number(settings.fps, 'fps', 1, 120, true),
    loop: v.boolean(settings.loop, 'loop'),
  }
  if (next.duration === clip.duration && next.fps === clip.fps && next.loop === clip.loop)
    return document
  editable(clip.tracks.map((track) => track.nodeId))
  for (const track of clip.tracks)
    v.requireScene(
      track.keys.at(-1)!.time <= next.duration,
      'duration',
      'Há chaves depois desse final. Ajuste a duração junto com as chaves ou remova essas chaves primeiro.',
    )
  return replace(document, next)
}

export function duplicateSceneAnimation(
  document: MoldaSceneDocument,
  clipId: string,
  name: string,
  nextId = newId,
) {
  const { clip, editable, index } = context(document, clipId)
  editable(clip.tracks.map((track) => track.nodeId))
  v.requireScene(
    index.animations.size < SCENE_LIMITS.animationClips &&
      index.animationTrackCount + clip.tracks.length <= SCENE_LIMITS.animationTracks &&
      index.animationKeyCount +
        clip.tracks.reduce((total, track) => total + track.keys.length, 0) <=
        SCENE_LIMITS.animationKeys,
    'animations',
    'Essa cópia ultrapassa o orçamento de movimentos da criação.',
  )
  const id = allocateSceneId(document, nextId)()
  const copy = { ...structuredClone(clip), id, name: v.text(name.trim(), 'name', 48) }
  return finishSceneCommand({ ...document, animations: [...document.animations!, copy] })
}

export function deleteSceneAnimation(document: MoldaSceneDocument, clipId: string) {
  const { clip, editable } = context(document, clipId)
  editable(clip.tracks.map((track) => track.nodeId))
  return finishSceneCommand({
    ...document,
    animations: document.animations!.filter((entry) => entry !== clip),
  })
}

/** Explicit recording: exact seconds, one owned key, no modification to the original pose. */
export function setSceneAnimationKey(
  document: MoldaSceneDocument,
  clipId: string,
  input: SceneAnimationKeyInput,
) {
  return setSceneAnimationKeys(document, clipId, [input])
}

/** Index each affected track once, even when a selection contains thousands of keys. */
function selectedKeys(clip: SceneAnimationClip, refs: readonly SceneAnimationKeyRef[]) {
  const tracks = new Map(
    clip.tracks.map((track) => [JSON.stringify([track.nodeId, track.channel]), track]),
  )
  const chosen = new Map<SceneAnimationTrack, Set<number>>()
  const available = new Map<SceneAnimationTrack, Set<number>>()
  for (const raw of v.list(refs, 'keys', SCENE_LIMITS.animationKeys)) {
    const row = v.record(raw, 'key', ['nodeId', 'channel', 'time'])
    const nodeId = v.id(row.nodeId, 'nodeId')
    const channel = v.choice(row.channel, ['translation', 'rotation', 'scale'], 'channel')
    const time = v.number(row.time, 'time', 0, clip.duration)
    const track = tracks.get(JSON.stringify([nodeId, channel]))
    v.requireScene(track, 'key', 'Essa trilha não existe mais. Escolha novamente.')
    let keyTimes = available.get(track)
    if (!keyTimes) {
      keyTimes = new Set(track.keys.map((key) => key.time))
      available.set(track, keyTimes)
    }
    v.requireScene(keyTimes.has(time), 'key', 'Essa chave não existe mais. Escolha novamente.')
    const times = chosen.get(track) ?? new Set<number>()
    times.add(time)
    chosen.set(track, times)
  }
  return chosen
}

export function removeSceneAnimationKeys(
  document: MoldaSceneDocument,
  clipId: string,
  refs: readonly SceneAnimationKeyRef[],
) {
  const { clip, editable } = context(document, clipId)
  const chosen = selectedKeys(clip, refs)
  if (!chosen.size) return document
  editable([...chosen.keys()].map((track) => track.nodeId))
  return replace(document, {
    ...clip,
    tracks: clip.tracks.flatMap((track): SceneAnimationTrack[] => {
      const times = chosen.get(track)
      if (!times) return [track]
      const keys = track.keys.filter((key) => !times.has(key.time))
      return keys.length ? [{ ...track, keys } as SceneAnimationTrack] : []
    }),
  })
}

/** Move/copy a set atomically. No silent overwrite, snap, or change to unselected keys. */
export function shiftSceneAnimationKeys(
  document: MoldaSceneDocument,
  clipId: string,
  refs: readonly SceneAnimationKeyRef[],
  offset: number,
  operation: 'move' | 'copy',
) {
  const { clip, editable, index } = context(document, clipId)
  v.number(offset, 'offset')
  v.choice(operation, ['move', 'copy'], 'operation')
  const chosen = selectedKeys(clip, refs)
  if (!chosen.size) return document
  editable([...chosen.keys()].map((track) => track.nodeId))
  if (operation === 'move' && offset === 0) return document
  v.requireScene(
    operation !== 'copy' ||
      index.animationKeyCount + [...chosen.values()].reduce((n, times) => n + times.size, 0) <=
        SCENE_LIMITS.animationKeys,
    'keys',
    'Essa cópia ultrapassa o orçamento de chaves da criação.',
  )
  const tracks = clip.tracks.map((track): SceneAnimationTrack => {
    const times = chosen.get(track)
    if (!times) return track
    const destinations = new Set<number>()
    const remaining =
      operation === 'copy' ? track.keys : track.keys.filter((key) => !times.has(key.time))
    for (const key of remaining) destinations.add(key.time)
    // Check every destination before copying any source values in this track.
    const moved = track.keys
      .filter((key) => times.has(key.time))
      .map((key) => {
        const time = v.number(key.time + offset, 'time', 0, clip.duration)
        v.requireScene(
          !destinations.has(time),
          'time',
          'Duas chaves ficariam no mesmo instante. Escolha outro tempo.',
        )
        v.requireScene(
          time !== key.time,
          'time',
          'Esse deslocamento é pequeno demais para mudar o tempo da chave.',
        )
        destinations.add(time)
        return { key, time }
      })
    const keys = [
      ...remaining,
      ...moved.map(({ key, time }) => ({
        ...key,
        time,
        value: operation === 'copy' ? [...key.value] : key.value,
      })),
    ].sort((a, b) => a.time - b.time)
    return { ...track, keys } as SceneAnimationTrack
  })
  return replace(document, { ...clip, tracks })
}

function retimedSeconds(time: number, before: number, after: number) {
  if (time === 0) return 0
  if (time === before) return after
  const ratio = after / before
  // Normal ratios retain tiny source times; extreme ratios use a bounded normalized time.
  return Number.isFinite(ratio) && ratio >= 2 ** -1022 ? time * ratio : (time / before) * after
}

/** Rescale source times, refusing Double collisions instead of silently merging keys. */
export function retimeSceneAnimation(
  document: MoldaSceneDocument,
  clipId: string,
  seconds: number,
) {
  const { clip, editable } = context(document, clipId)
  const nextDuration = duration(seconds)
  if (nextDuration === clip.duration) return document
  editable(clip.tracks.map((track) => track.nodeId))
  const next: SceneAnimationClip = {
    ...clip,
    duration: nextDuration,
    tracks: clip.tracks.map(
      (track) =>
        ({
          ...track,
          keys: track.keys.map((key) => ({
            ...key,
            time: retimedSeconds(key.time, clip.duration, nextDuration),
          })),
        }) as SceneAnimationTrack,
    ),
  }
  requireOrderedTimes(next)
  return replace(document, next)
}

/** Reverse key order and segment easing. Step remains a left-held jump, not reverse-time evaluation. */
export function reverseSceneAnimation(document: MoldaSceneDocument, clipId: string) {
  const { clip, editable } = context(document, clipId)
  if (!clip.tracks.length) return document
  editable(clip.tracks.map((track) => track.nodeId))
  const next: SceneAnimationClip = {
    ...clip,
    tracks: clip.tracks.map(
      (track) =>
        ({
          ...track,
          keys: [...track.keys].reverse().map((key, i) => ({
            ...key,
            time: clip.duration - key.time,
            interpolation:
              track.keys[track.keys.length - 2 - i]?.interpolation ?? key.interpolation,
          })),
        }) as SceneAnimationTrack,
    ),
  }
  requireOrderedTimes(next)
  return replace(document, next)
}
