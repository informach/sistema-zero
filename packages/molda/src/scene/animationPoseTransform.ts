import type { Vec3 } from '../core/model'
import type { SceneAnimationTrack } from './animation'
import { sceneAnimationContext } from './animationCommandContext'
import type { SceneAnimationKeyInput } from './animationCommands'
import { SCENE_ANIMATION_CHANNELS } from './animationKeySelection'
import type { SceneAnimationLocalPose } from './animationPose'
import { animationTrs } from './animationTrs'
import type { MoldaSceneDocument } from './document'
import { selectSceneSubtrees } from './graph'
import { SCENE_LIMITS } from './limits'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  type Quaternion,
  transformDirection,
} from './matrix'
import {
  prepareSceneAnimation,
  type SceneAnimationPose,
  sampleSceneAnimationTrack,
  sceneAnimationPivotOffset,
} from './sampleAnimation'
import { number, requireScene } from './validation'

export interface SceneAnimationPoseFrame {
  pose: SceneAnimationPose
  values: ReadonlyMap<string, SceneAnimationLocalPose>
}

/** Freeze indices, matrices and sampled local channels once; pointer updates never read geometry/images. */
export function prepareSceneAnimationPoseTransform(
  document: MoldaSceneDocument,
  clipId: string,
  ids: readonly string[],
  time: number,
) {
  const { clip, index, editable } = sceneAnimationContext(document, clipId)
  number(time, 'time', 0, clip.duration)
  const { roots, covered } = selectSceneSubtrees(index.scene, ids)
  requireScene(roots.size > 0, 'nodes', 'Escolha uma peça ou grupo para ajustar a pose.')
  editable(ids)
  const original = prepareSceneAnimation(document, clipId).sample(time, false)
  const tracks = new Map<string, SceneAnimationTrack[]>()
  for (const track of clip.tracks) {
    const group = tracks.get(track.nodeId) ?? []
    group.push(track)
    tracks.set(track.nodeId, group)
  }
  const values = new Map<string, SceneAnimationLocalPose>()
  const effective = new Map<string, SceneAnimationLocalPose>()
  const rawTranslations = new Map<string, Vec3>()
  const locals = new Map<string, AffineMatrix>()
  const bases = new Map<string, AffineMatrix>()
  const coordinates = new Map<string, { matrix: AffineMatrix; inverse: AffineMatrix }>()
  const destinations = new Map<
    string,
    Map<SceneAnimationTrack['channel'], SceneAnimationTrack['keys'][number]['interpolation'] | null>
  >()
  const order = index.scene.order.filter((id) => covered.has(id))
  for (const id of order) {
    const node = index.scene.nodes.get(id)!,
      base = composeTransform(node.transform)
    const rest = clip.space === 'local' && node.transform.kind === 'trs' ? node.transform : null
    const rendered: SceneAnimationLocalPose = {
      space: clip.space,
      translation: [...(rest?.translation ?? [0, 0, 0])],
      rotation: [...(rest?.rotation ?? [0, 0, 0, 1])],
      scale: [...(rest?.scale ?? [1, 1, 1])],
    }
    const authored = structuredClone(rendered)
    const ownTracks = tracks.get(id)
    for (const track of ownTracks ?? []) {
      const sampled = sampleSceneAnimationTrack(track, time)
      const exact = track.keys.find((key) => key.time === time)
      if (track.channel === 'rotation') {
        rendered.rotation = sampled as Quaternion
        authored.rotation = [...(exact?.value ?? sampled)] as Quaternion
      } else {
        rendered[track.channel] = sampled as Vec3
        authored[track.channel] = [...(exact?.value ?? sampled)] as Vec3
      }
    }
    rawTranslations.set(id, [...authored.translation])
    const correction = sceneAnimationPivotOffset(node, clip.space, ownTracks ?? [], time, rendered)
    rendered.translation = rendered.translation.map((n, axis) => n + correction[axis]!) as Vec3
    authored.translation = authored.translation.map((n, axis) => n + correction[axis]!) as Vec3
    bases.set(id, base)
    effective.set(id, rendered)
    const animated = ownTracks ? composeTransform({ kind: 'trs', ...rendered }) : null
    locals.set(
      id,
      animated ? (clip.space === 'local' ? animated : affineMultiply(base, animated)) : base,
    )
    if (roots.has(id)) {
      destinations.set(
        id,
        new Map(
          (ownTracks ?? []).map((track) => [
            track.channel,
            track.keys.find((key) => key.time === time)?.interpolation ?? null,
          ]),
        ),
      )
      requireScene(
        clip.space !== 'local' || rest,
        'pose',
        'Use um movimento relativo para ajustar uma peça com eixos inclinados.',
      )
      const parent =
        node.parentId === null ? identityMatrix() : original.worldMatrices.get(node.parentId)!
      const matrix =
        clip.space === 'local' ? ([...parent] as AffineMatrix) : affineMultiply(parent, base)
      const inverse = affineInverse(matrix)
      requireScene(
        inverse,
        'pose',
        'Não foi possível usar essas alças. Confira eixos sem tamanho ou com tamanhos muito diferentes; os campos locais continuam disponíveis.',
      )
      coordinates.set(id, { matrix, inverse })
      values.set(id, authored)
    }
  }
  function changed(id: string, value: SceneAnimationLocalPose) {
    const before = values.get(id)!
    return SCENE_ANIMATION_CHANNELS.filter((channel) =>
      value[channel].some((n, i) => n !== before[channel][i]),
    )
  }
  function keys(frame: SceneAnimationPoseFrame): SceneAnimationKeyInput[] {
    requireScene(owned.has(frame), 'pose', 'A pose pertence a outro ajuste.')
    let addedTracks = 0,
      addedKeys = 0
    const keys: SceneAnimationKeyInput[] = []
    for (const [nodeId, value] of frame.values) {
      const channels = changed(nodeId, value)
      if (!channels.length) continue
      const ownTracks = tracks.get(nodeId) ?? []
      let proposedTracks = ownTracks
      if (channels.includes('scale')) {
        const previous = ownTracks.find((track) => track.channel === 'scale')
        const keys = [
          ...(previous?.channel === 'scale'
            ? previous.keys
            : time > 0
              ? [{ time: 0, value: values.get(nodeId)!.scale, interpolation: 'smooth' as const }]
              : []),
        ].filter((key) => key.time !== time)
        keys.push({ time, value: value.scale, interpolation: 'smooth' })
        keys.sort((a, b) => a.time - b.time)
        proposedTracks = [
          ...ownTracks.filter((track) => track.channel !== 'scale'),
          { nodeId, channel: 'scale', keys },
        ]
      }
      const correction = channels.includes('rotation')
        ? [0, 0, 0]
        : sceneAnimationPivotOffset(
            index.scene.nodes.get(nodeId)!,
            clip.space,
            proposedTracks,
            time,
            value,
          )
      const translation = value.translation.map((n, axis) => n - correction[axis]!) as Vec3
      const raw = rawTranslations.get(nodeId)!
      // Saved position is the origin channel, while the gesture operates on the displayed matrix.
      // Adding a rotation key removes the old interval correction at this instant.
      const keyChannels: SceneAnimationTrack['channel'][] = channels.filter(
        (channel) => channel !== 'translation',
      )
      if (translation.some((n, axis) => n !== raw[axis])) keyChannels.push('translation')
      for (const channel of keyChannels) {
        const existing = destinations.get(nodeId)!.get(channel)
        if (existing === undefined) addedTracks++
        if (existing == null) addedKeys++
        const interpolation = existing ?? 'linear'
        keys.push(
          channel === 'rotation'
            ? {
                nodeId,
                channel,
                key: {
                  time,
                  value: value.rotation,
                  interpolation,
                  ...(index.scene.nodes.get(nodeId)!.pivot
                    ? { incomingPivot: [...index.scene.nodes.get(nodeId)!.pivot!] as Vec3 }
                    : {}),
                },
              }
            : {
                nodeId,
                channel,
                key: {
                  time,
                  value: channel === 'translation' ? translation : value.scale,
                  interpolation,
                },
              },
        )
      }
    }
    requireScene(
      index.animationTrackCount + addedTracks <= SCENE_LIMITS.animationTracks &&
        index.animationKeyCount + addedKeys <= SCENE_LIMITS.animationKeys,
      'keys',
      'Essa pose ultrapassa o orçamento de movimentos da criação.',
    )
    return keys
  }
  function frame(next: ReadonlyMap<string, SceneAnimationLocalPose>): SceneAnimationPoseFrame {
    const worldMatrices = new Map(original.worldMatrices)
    for (const id of order) {
      const node = index.scene.nodes.get(id)!
      let local = locals.get(id)!
      if (roots.has(id)) {
        const value = next.get(id)!,
          channels = changed(id, value)
        if (channels.length) {
          const rendered = { ...effective.get(id)! }
          for (const channel of channels) {
            if (channel === 'rotation') {
              const length = Math.hypot(...value.rotation)
              rendered.rotation = value.rotation.map((n) => n / length) as Quaternion
            } else rendered[channel] = value[channel]
          }
          const animated = composeTransform({ kind: 'trs', ...rendered })
          local = clip.space === 'local' ? animated : affineMultiply(bases.get(id)!, animated)
        }
      }
      worldMatrices.set(
        id,
        node.parentId === null ? local : affineMultiply(worldMatrices.get(node.parentId)!, local),
      )
    }
    const result = { values: next, pose: { source: document, clipId, time, worldMatrices } }
    owned.add(result)
    keys(result)
    return result
  }
  const initial: SceneAnimationPoseFrame = { values, pose: original }
  const owned = new WeakSet<SceneAnimationPoseFrame>([initial])
  return {
    original: initial,
    keys,
    apply(seed: SceneAnimationPoseFrame, delta: AffineMatrix): SceneAnimationPoseFrame {
      requireScene(owned.has(seed), 'pose', 'A pose mudou. Experimente o ajuste novamente.')
      composeTransform({ kind: 'affine', matrix: delta })
      const diagonal =
        delta[0] === delta[5] &&
        delta[5] === delta[10] &&
        [1, 2, 4, 6, 8, 9].every((i) => delta[i] === 0)
      const next = new Map(seed.values)
      for (const id of roots) {
        const before = seed.values.get(id)!,
          coordinate = coordinates.get(id)!
        if (diagonal) {
          const factor = delta[0]
          const offset = transformDirection(coordinate.inverse, [
            delta[12] + (factor - 1) * coordinate.matrix[12],
            delta[13] + (factor - 1) * coordinate.matrix[13],
            delta[14] + (factor - 1) * coordinate.matrix[14],
          ])
          // Translation/uniform scale preserve the exact authored quaternion and untouched channels.
          next.set(id, {
            ...before,
            translation: before.translation.map((n, i) => n * factor + offset[i]!) as Vec3,
            scale: factor === 1 ? before.scale : (before.scale.map((n) => n * factor) as Vec3),
          })
        } else {
          const target = affineMultiply(
            coordinate.inverse,
            affineMultiply(delta, seed.pose.worldMatrices.get(id)!),
          )
          next.set(id, animationTrs(target, before))
        }
      }
      return frame(next)
    },
  }
}
