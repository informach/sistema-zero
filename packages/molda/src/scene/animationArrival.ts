import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationKey, SceneAnimationTrack } from './animation'
import { replaceSceneAnimation, sceneAnimationContext } from './animationCommandContext'
import type { SceneAnimationKeyInput, SceneAnimationKeyRef } from './animationCommands'
import { setSceneAnimationKeys } from './animationKeyBatch'
import { fullLoopRotationKeys, nearLoopRotationEnd, type SceneRotationTrack } from './animationLoop'
import { captureSceneAnimationLocalPoses } from './animationPose'
import type { MoldaSceneDocument } from './document'
import { SCENE_LIMITS } from './limits'
import { composeTransform, type Quaternion, transformDirection } from './matrix'
import { sceneNodePivot } from './pivot'
import { readSceneAnimationClip } from './readAnimation'
import { sampleSceneAnimationTrack, sampleSceneAnimationTransform } from './sampleAnimation'
import { choice, id, list, number, record, requireScene } from './validation'

export type SceneArrival = SceneAnimationKey<Vec3>['interpolation']
type Key = SceneAnimationKey<Vec3 | Quaternion>
type ArrivalKey = { key: Key; arrival: SceneArrival }
const pair = (ref: Pick<SceneAnimationKeyRef, 'nodeId' | 'channel'>) =>
  JSON.stringify([ref.nodeId, ref.channel])

export function sceneKeyArrival(track: SceneAnimationTrack, time: number): SceneArrival | null {
  const i = track.keys.findIndex((key) => key.time === time)
  return i > 0 ? track.keys[i - 1]!.interpolation : null
}

function arrivals(track: SceneAnimationTrack): ArrivalKey[] {
  return track.keys.map((key, i) => ({
    key:
      key.incomingPivot && i > 0
        ? {
            ...key,
            incomingPivotInterpolation:
              key.incomingPivotInterpolation ?? track.keys[i - 1]!.interpolation,
          }
        : key,
    arrival: track.keys[i - 1]?.interpolation ?? 'smooth',
  }))
}

/** Arrival is a UI/domain editing view. The native file continues storing outgoing intervals. */
function outgoing(track: SceneAnimationTrack, entries: ArrivalKey[]): SceneAnimationTrack {
  const sorted = [...entries].sort((a, b) => a.key.time - b.key.time)
  return {
    ...track,
    keys: sorted.map(({ key }, i) => ({
      ...key,
      interpolation: sorted[i + 1]?.arrival ?? key.interpolation,
    })),
  } as SceneAnimationTrack
}

export function setScenePoseArrival(
  document: MoldaSceneDocument,
  clipId: string,
  ref: SceneAnimationKeyRef,
  arrival: SceneArrival,
) {
  choice(arrival, ['step', 'linear', 'smooth'], 'arrival')
  const { clip, editable } = sceneAnimationContext(document, clipId)
  editable([ref.nodeId])
  const track = clip.tracks.find((track) => pair(track) === pair(ref))
  const i = track?.keys.findIndex((key) => key.time === ref.time) ?? -1
  requireScene(track && i >= 0, 'pose', 'Essa pose não existe mais. Escolha novamente.')
  if (i === 0 || track.keys[i - 1]!.interpolation === arrival) return document
  const entries = arrivals(track)
  entries[i]!.arrival = arrival
  return replaceSceneAnimation(document, {
    ...clip,
    tracks: clip.tracks.map((entry) => (entry === track ? outgoing(track, entries) : entry)),
  })
}

function isRotationTrack(track: SceneAnimationTrack): track is SceneRotationTrack {
  return track.channel === 'rotation'
}

export function sceneRotationPaceNeedsChange(clip: SceneAnimationClip, track: SceneAnimationTrack) {
  return (
    isRotationTrack(track) &&
    (track.keys.some((key) => key.interpolation !== 'linear') ||
      nearLoopRotationEnd(clip, track) !== null ||
      fullLoopRotationKeys(clip, track) !== null)
  )
}

/** A turn should keep the same pace between its marked poses and close a tiny loop overshoot. */
export function setSceneRotationPace(document: MoldaSceneDocument, clipId: string, nodeId: string) {
  const { clip, editable, index } = sceneAnimationContext(document, clipId)
  const track = clip.tracks.find((entry) => entry.nodeId === nodeId && isRotationTrack(entry))
  requireScene(
    track && isRotationTrack(track),
    'pose',
    'Essa peça não tem poses de giro neste movimento.',
  )
  if (!sceneRotationPaceNeedsChange(clip, track)) return document
  const completed = fullLoopRotationKeys(clip, track)
  requireScene(
    !completed || index.animationKeyCount + 3 <= SCENE_LIMITS.animationKeys,
    'poses',
    'Não há espaço para as poses que completam essa volta.',
  )
  editable([nodeId])
  return replaceSceneAnimation(document, {
    ...clip,
    tracks: clip.tracks.map((entry) => {
      if (entry.nodeId !== nodeId || !isRotationTrack(entry)) return entry
      if (completed) return { ...entry, keys: completed }
      const closed = nearLoopRotationEnd(clip, entry)
      return {
        ...entry,
        keys: entry.keys.map((key, index) => ({
          ...key,
          interpolation: 'linear' as const,
          ...(index === entry.keys.length - 1 && closed ? { value: closed } : {}),
        })),
      }
    }),
  })
}

/** One atomic command for a single pose or a batch, preserving each surviving destination's arrival. */
export function editSceneAnimationPoses(
  document: MoldaSceneDocument,
  clipId: string,
  refs: readonly SceneAnimationKeyRef[],
  operation: 'move' | 'copy' | 'remove',
  offset = 0,
) {
  number(offset, 'offset')
  choice(operation, ['move', 'copy', 'remove'], 'operation')
  return transformSceneAnimationPoses(document, clipId, refs, operation, (time) => time + offset)
}

/** Positive time scaling preserves order and every destination's arrival; the anchor stays fixed. */
export function retimeSceneAnimationPoses(
  document: MoldaSceneDocument,
  clipId: string,
  refs: readonly SceneAnimationKeyRef[],
  factor: number,
  anchor: number,
) {
  number(factor, 'factor', Number.MIN_VALUE)
  number(anchor, 'anchor', 0, SCENE_LIMITS.animationSeconds)
  return transformSceneAnimationPoses(
    document,
    clipId,
    refs,
    'move',
    (time) => anchor + (time - anchor) * factor,
  )
}

function transformSceneAnimationPoses(
  document: MoldaSceneDocument,
  clipId: string,
  input: readonly SceneAnimationKeyRef[],
  operation: 'move' | 'copy' | 'remove',
  at: (time: number) => number,
) {
  const { clip, editable, index } = sceneAnimationContext(document, clipId)
  const refs = list(input, 'poses', SCENE_LIMITS.animationKeys).map((raw) => {
    const ref = record(raw, 'pose', ['nodeId', 'channel', 'time'])
    return {
      nodeId: id(ref.nodeId, 'pose.nodeId'),
      channel: choice(ref.channel, ['translation', 'rotation', 'scale'], 'pose.channel'),
      time: number(ref.time, 'pose.time', 0, clip.duration),
    }
  })
  const selected = new Map<string, Set<number>>()
  const trackTimes = new Map(
    clip.tracks.map((track) => [pair(track), new Set(track.keys.map((key) => key.time))]),
  )
  for (const ref of refs) {
    const timesOfTrack = trackTimes.get(pair(ref))
    requireScene(
      timesOfTrack?.has(ref.time),
      'pose',
      'Essa pose não existe mais. Escolha novamente.',
    )
    const times = selected.get(pair(ref)) ?? new Set<number>()
    times.add(ref.time)
    selected.set(pair(ref), times)
  }
  editable(refs.map((ref) => ref.nodeId))
  if (!refs.length || (operation === 'move' && refs.every((ref) => at(ref.time) === ref.time)))
    return document
  requireScene(
    operation !== 'copy' ||
      index.animationKeyCount +
        [...selected.values()].reduce((count, times) => count + times.size, 0) <=
        SCENE_LIMITS.animationKeys,
    'poses',
    'Essa cópia ultrapassa o orçamento de poses da criação.',
  )
  const tracks = clip.tracks.flatMap((track): SceneAnimationTrack[] => {
    const times = selected.get(pair(track))
    if (!times) return [track]
    const original = arrivals(track)
    const entries =
      operation === 'copy' ? [...original] : original.filter(({ key }) => !times.has(key.time))
    const taken = new Set(entries.map(({ key }) => key.time))
    const anchors = original.filter(({ key }) => !times.has(key.time))
    let anchorIndex = 0
    if (operation !== 'remove')
      for (const entry of original) {
        if (!times.has(entry.key.time)) continue
        const time = number(at(entry.key.time), 'time', 0, clip.duration)
        requireScene(!taken.has(time), 'time', 'Já existe uma pose no mesmo instante.')
        if (operation === 'move') {
          while (anchorIndex < anchors.length && anchors[anchorIndex]!.key.time < entry.key.time)
            anchorIndex++
          const before = anchors[anchorIndex - 1]
          const after = anchors[anchorIndex]
          requireScene(
            (!before || time > before.key.time) && (!after || time < after.key.time),
            'time',
            'Uma pose não pode atravessar outra do mesmo canal.',
          )
        }
        taken.add(time)
        entries.push({
          arrival: entry.arrival,
          key: { ...entry.key, time, value: [...entry.key.value] as Vec3 | Quaternion },
        })
      }
    return entries.length ? [outgoing(track, entries)] : []
  })
  return replaceSceneAnimation(document, readSceneAnimationClip({ ...clip, tracks }))
}

/** Explicit marking admits identical values and creates the initial value only for an empty channel. */
export function recordSceneAnimationInputs(
  document: MoldaSceneDocument,
  clipId: string,
  inputs: readonly SceneAnimationKeyInput[],
) {
  const { clip } = sceneAnimationContext(document, clipId)
  if (!inputs.length) return document
  const initial = captureSceneAnimationLocalPoses(
    document,
    clipId,
    [...new Set(inputs.map((input) => input.nodeId))],
    0,
  )
  const keys: SceneAnimationKeyInput[] = []
  const tracksByPair = new Map(clip.tracks.map((track) => [pair(track), track]))
  const starts = new Set(inputs.filter((input) => input.key.time === 0).map(pair))
  for (const input of inputs) {
    const track = tracksByPair.get(pair(input))
    if (!track && input.key.time > 0 && !starts.has(pair(input))) {
      starts.add(pair(input))
      keys.push({
        nodeId: input.nodeId,
        channel: input.channel,
        key: { time: 0, value: initial.get(input.nodeId)![input.channel], interpolation: 'smooth' },
      } as SceneAnimationKeyInput)
    }
    keys.push(input)
  }
  const next = setSceneAnimationKeys(document, clipId, keys)
  if (next === document) return document
  const updated = next.animations!.find((entry) => entry.id === clipId)!
  const touched = new Set(inputs.map(pair))
  return replaceSceneAnimation(next, {
    ...updated,
    tracks: updated.tracks.map((track) => {
      if (!touched.has(pair(track))) return track
      const previous = tracksByPair.get(pair(track))
      const old = new Map(
        previous ? arrivals(previous).map((entry) => [entry.key.time, entry.arrival]) : [],
      )
      const references = new Map(
        previous?.keys.map((key) => [key.time, key.incomingPivotInterpolation]) ?? [],
      )
      return outgoing(
        track,
        track.keys.map((key) => ({
          key: key.incomingPivot
            ? {
                ...key,
                incomingPivotInterpolation:
                  key.incomingPivotInterpolation ??
                  references.get(key.time) ??
                  old.get(key.time) ??
                  'smooth',
              }
            : key,
          arrival: old.get(key.time) ?? 'smooth',
        })),
      )
    }),
  })
}

export function markSceneAnimationChannel(
  document: MoldaSceneDocument,
  clipId: string,
  ref: SceneAnimationKeyRef,
) {
  const { clip, index } = sceneAnimationContext(document, clipId)
  const pose = captureSceneAnimationLocalPoses(document, clipId, [ref.nodeId], ref.time).get(
    ref.nodeId,
  )!
  const node = index.scene.nodes.get(ref.nodeId)!
  const existing = clip.tracks
    .find((track) => track.nodeId === ref.nodeId && track.channel === ref.channel)
    ?.keys.find((key) => key.time === ref.time)
  const pivot = existing ? existing.incomingPivot : node.pivot
  const input: SceneAnimationKeyInput =
    ref.channel === 'rotation'
      ? {
          nodeId: ref.nodeId,
          channel: 'rotation',
          key: {
            time: ref.time,
            value: pose.rotation,
            interpolation: 'smooth',
            ...(pivot ? { incomingPivot: [...pivot] } : {}),
          },
        }
      : {
          nodeId: ref.nodeId,
          channel: ref.channel,
          key: { time: ref.time, value: pose[ref.channel], interpolation: 'smooth' },
        }
  return recordWithTranslation(document, clipId, input, pose.translation)
}

/** Numeric authoring changes the displayed local channel and rotates/scales around the authoring pivot. */
export function recordSceneAnimationChannelValue(
  document: MoldaSceneDocument,
  clipId: string,
  input: SceneAnimationKeyInput,
) {
  const { index, editable } = sceneAnimationContext(document, clipId)
  editable([input.nodeId])
  const node = index.scene.nodes.get(input.nodeId)!
  const pose = captureSceneAnimationLocalPoses(
    document,
    clipId,
    [input.nodeId],
    input.key.time,
  ).get(input.nodeId)!
  if (input.key.value.every((value, axis) => value === pose[input.channel][axis]))
    return markSceneAnimationChannel(document, clipId, {
      nodeId: input.nodeId,
      channel: input.channel,
      time: input.key.time,
    })
  let translation: Vec3
  if (input.channel === 'translation') translation = [...input.key.value]
  else {
    const pivot = sceneNodePivot(node)
    const before = transformDirection(composeTransform({ kind: 'trs', ...pose }), pivot)
    const after = transformDirection(
      composeTransform(
        input.channel === 'rotation'
          ? { kind: 'trs', ...pose, rotation: input.key.value }
          : { kind: 'trs', ...pose, scale: input.key.value },
      ),
      pivot,
    )
    translation = [
      pose.translation[0] + before[0] - after[0],
      pose.translation[1] + before[1] - after[1],
      pose.translation[2] + before[2] - after[2],
    ]
  }
  const key: SceneAnimationKeyInput =
    input.channel === 'rotation'
      ? {
          nodeId: input.nodeId,
          channel: 'rotation',
          key: {
            time: input.key.time,
            value: [...input.key.value],
            interpolation: input.key.interpolation,
            ...(node.pivot ? { incomingPivot: [...node.pivot] } : {}),
          },
        }
      : input
  return recordWithTranslation(document, clipId, key, translation)
}

/** One command owns the authored value and any origin correction caused by inserting its key. */
function recordWithTranslation(
  document: MoldaSceneDocument,
  clipId: string,
  input: SceneAnimationKeyInput,
  expected: Vec3,
) {
  const { clip, index } = sceneAnimationContext(document, clipId)
  const node = index.scene.nodes.get(input.nodeId)!
  const ref = { nodeId: input.nodeId, channel: input.channel, time: input.key.time }
  const candidate = recordSceneAnimationInputs(document, clipId, [input])
  const tracks = candidate
    .animations!.find((entry) => entry.id === clipId)!
    .tracks.filter((track) => track.nodeId === ref.nodeId)
  const displayed = sampleSceneAnimationTransform(node, clip.space, tracks, ref.time)
  const difference = expected.map((value, axis) => value - displayed.translation[axis]!) as Vec3
  if (difference.every((value) => value === 0)) return candidate
  // Inserting a rotation key changes the interval correction at that instant. Store the
  // origin compensation in the same command so explicitly marking never moves the piece.
  const raw = tracks.find((track) => track.channel === 'translation')
  const origin = raw
    ? sampleSceneAnimationTrack(raw, ref.time)
    : clip.space === 'local' && node.transform.kind === 'trs'
      ? node.transform.translation
      : [0, 0, 0]
  const translation: SceneAnimationKeyInput = {
    nodeId: ref.nodeId,
    channel: 'translation',
    key: {
      time: ref.time,
      value: origin.map((value, axis) => value + difference[axis]!) as Vec3,
      interpolation: 'smooth',
    },
  }
  return recordSceneAnimationInputs(
    document,
    clipId,
    ref.channel === 'translation' ? [translation] : [input, translation],
  )
}
