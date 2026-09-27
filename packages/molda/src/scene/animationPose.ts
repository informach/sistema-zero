import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationTrack } from './animation'
import type { SceneAnimationKeyInput } from './animationCommands'
import { indexSceneAnimations } from './animationIndex'
import { setSceneAnimationKeys } from './animationKeyBatch'
import { SCENE_ANIMATION_CHANNELS } from './animationKeySelection'
import type { MoldaSceneDocument } from './document'
import { indexSceneNodes, selectSceneSubtrees } from './graph'
import { SCENE_LIMITS } from './limits'
import type { Quaternion } from './matrix'
import { sampleSceneAnimationTrack } from './sampleAnimation'
import * as v from './validation'

export interface SceneAnimationLocalPose {
  space: SceneAnimationClip['space']
  translation: Vec3
  rotation: Quaternion
  scale: Vec3
}

/** Owns a local pose without retaining its creation, geometry, or images in the clipboard. */
export function captureSceneAnimationLocalPose(
  document: MoldaSceneDocument,
  clipId: string,
  nodeId: string,
  time: number,
): SceneAnimationLocalPose {
  return captureSceneAnimationLocalPoses(document, clipId, [nodeId], time).get(nodeId)!
}

/** Keep every explicit target, including nested joints; compile hierarchy/tracks only once. */
export function captureSceneAnimationLocalPoses(
  document: MoldaSceneDocument,
  clipId: string,
  ids: readonly string[],
  time: number,
): Map<string, SceneAnimationLocalPose> {
  const selected = v.list(ids, 'nodes', SCENE_LIMITS.nodes).map((id) => v.id(id, 'nodeId'))
  v.requireScene(selected.length > 0, 'nodes', 'Escolha os apoios ou peças para copiar a pose.')
  v.requireScene(
    new Set(selected).size === selected.length,
    'nodes',
    'Um alvo apareceu duas vezes.',
  )
  const scene = indexSceneNodes(document.nodes)
  const clip = indexSceneAnimations(document, scene).animations.get(clipId)
  v.requireScene(clip, 'pose', 'Escolha uma peça e um movimento para copiar a pose.')
  v.number(time, 'time', 0, clip.duration)
  const tracks = new Map<string, SceneAnimationTrack[]>()
  for (const track of clip.tracks) {
    const group = tracks.get(track.nodeId) ?? []
    group.push(track)
    tracks.set(track.nodeId, group)
  }
  const result = new Map<string, SceneAnimationLocalPose>()
  for (const nodeId of selected) {
    const node = scene.nodes.get(nodeId)
    v.requireScene(node, 'pose', 'Escolha uma peça ou apoio existente para copiar a pose.')
    v.requireScene(
      clip.space !== 'local' || node.transform.kind === 'trs',
      'pose',
      'A transformação original não é compatível com essa pose absoluta.',
    )
    const original = clip.space === 'local' && node.transform.kind === 'trs' ? node.transform : null
    const pose: SceneAnimationLocalPose = {
      space: clip.space,
      translation: [...(original?.translation ?? [0, 0, 0])],
      rotation: [...(original?.rotation ?? [0, 0, 0, 1])],
      scale: [...(original?.scale ?? [1, 1, 1])],
    }
    for (const track of tracks.get(nodeId) ?? []) {
      const exact = track.keys.find((key) => key.time === time)
      const value = exact ? [...exact.value] : sampleSceneAnimationTrack(track, time)
      if (track.channel === 'rotation') pose.rotation = value as Quaternion
      else pose[track.channel] = value as Vec3
    }
    result.set(nodeId, pose)
  }
  return result
}

export function readSceneAnimationLocalPose(input: unknown): SceneAnimationLocalPose {
  const pose = v.record(input, 'pose', ['space', 'translation', 'rotation', 'scale'])
  const rotation = v.tuple(pose.rotation, 4, 'rotation') as Quaternion
  v.requireScene(Math.abs(Math.hypot(...rotation) - 1) <= 1e-6, 'rotation', 'Rotação inválida.')
  return {
    space: v.choice(pose.space, ['local', 'local-delta'], 'space'),
    translation: v.tuple(pose.translation, 3, 'translation') as Vec3,
    rotation,
    scale: v.tuple(pose.scale, 3, 'scale') as Vec3,
  }
}

/** Reflect the LOCAL pose by S * TRS * S; this is not a world-space or rig-side mapping. */
export function mirrorSceneAnimationLocalPose(
  input: SceneAnimationLocalPose,
  axis: 'x' | 'y' | 'z',
) {
  const pose = readSceneAnimationLocalPose(input)
  const index = ['x', 'y', 'z'].indexOf(v.choice(axis, ['x', 'y', 'z'], 'axis'))
  pose.translation[index] = -pose.translation[index]!
  for (let i = 0; i < 3; i++) if (i !== index) pose.rotation[i] = -pose.rotation[i]!
  return pose
}

/** Paste explicitly replaces all three channels at one exact time; descendants follow selected roots. */
export function pasteSceneAnimationLocalPose(
  document: MoldaSceneDocument,
  clipId: string,
  ids: readonly string[],
  time: number,
  input: SceneAnimationLocalPose,
) {
  const pose = readSceneAnimationLocalPose(input)
  const scene = indexSceneNodes(document.nodes)
  const clip = indexSceneAnimations(document, scene).animations.get(clipId)
  v.requireScene(
    clip?.space === pose.space,
    'space',
    'Essa pose usa outro tipo de posição local. Copie de um movimento compatível.',
  )
  const { roots } = selectSceneSubtrees(scene, ids)
  v.requireScene(roots.size > 0, 'nodes', 'Escolha uma peça ou grupo para colar a pose.')
  return setSceneAnimationKeys(
    document,
    clipId,
    sceneAnimationPoseKeys(clip, time, new Map([...roots].map((id) => [id, pose]))),
  )
}

/** Both single-pose and mapped-set paste retain each destination's exact outgoing interpolation. */
export function sceneAnimationPoseKeys(
  clip: SceneAnimationClip,
  time: number,
  poses: ReadonlyMap<string, SceneAnimationLocalPose>,
): SceneAnimationKeyInput[] {
  const tracks = new Map(
    clip.tracks.map((track) => [JSON.stringify([track.nodeId, track.channel]), track]),
  )
  return [...poses].flatMap(([nodeId, pose]) =>
    SCENE_ANIMATION_CHANNELS.map((channel): SceneAnimationKeyInput => {
      const interpolation =
        tracks.get(JSON.stringify([nodeId, channel]))?.keys.find((key) => key.time === time)
          ?.interpolation ?? 'linear'
      return channel === 'rotation'
        ? {
            nodeId,
            channel,
            key: { time, value: pose.rotation, interpolation },
          }
        : {
            nodeId,
            channel,
            key: { time, value: pose[channel], interpolation },
          }
    }),
  )
}
