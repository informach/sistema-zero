import { indexSceneAnimations } from './animationIndex'
import { setSceneAnimationKeys } from './animationKeyBatch'
import {
  captureSceneAnimationLocalPoses,
  mirrorSceneAnimationLocalPose,
  readSceneAnimationLocalPose,
  type SceneAnimationLocalPose,
  sceneAnimationPoseKeys,
} from './animationPose'
import type { MoldaSceneDocument } from './document'
import { indexSceneNodes } from './graph'
import { SCENE_LIMITS } from './limits'
import * as v from './validation'

export interface SceneAnimationPoseSet {
  entries: { nodeId: string; name: string; pose: SceneAnimationLocalPose }[]
}

export interface SceneAnimationPosePair {
  sourceId: string
  targetId: string
}

/** A portable local-channel snapshot, not a retained source scene or an inferred rig mapping. */
export function captureSceneAnimationPoseSet(
  document: MoldaSceneDocument,
  clipId: string,
  ids: readonly string[],
  time: number,
): SceneAnimationPoseSet {
  const poses = captureSceneAnimationLocalPoses(document, clipId, ids, time)
  const names = new Map(document.nodes.map((node) => [node.id, node.name]))
  return {
    entries: [...poses].map(([nodeId, pose]) => ({ nodeId, name: names.get(nodeId)!, pose })),
  }
}

export function readSceneAnimationPoseSet(input: unknown): SceneAnimationPoseSet {
  const record = v.record(input, 'poses', ['entries'])
  const entries = v.list(record.entries, 'entries', SCENE_LIMITS.nodes).map((input) => {
    const entry = v.record(input, 'entry', ['nodeId', 'name', 'pose'])
    return {
      nodeId: v.id(entry.nodeId, 'nodeId'),
      name: v.text(entry.name, 'name'),
      pose: readSceneAnimationLocalPose(entry.pose),
    }
  })
  v.requireScene(entries.length > 0, 'entries', 'Copie pelo menos uma pose.')
  v.uniqueById(
    entries.map((entry) => ({ id: entry.nodeId })),
    'entries',
  )
  v.requireScene(
    entries.every((entry) => entry.pose.space === entries[0]!.pose.space),
    'space',
    'As poses precisam usar o mesmo tipo de posição local.',
  )
  return { entries }
}

/** All pairs commit together. Reflection uses each pose's local axes, never a guessed world plane. */
export function pasteSceneAnimationPoseSet(
  document: MoldaSceneDocument,
  clipId: string,
  time: number,
  input: SceneAnimationPoseSet,
  pairs: readonly SceneAnimationPosePair[],
  mirror?: 'x' | 'y' | 'z',
) {
  const copied = readSceneAnimationPoseSet(input)
  const entries = new Map(copied.entries.map((entry) => [entry.nodeId, entry.pose]))
  const mapping = v.list(pairs, 'pairs', SCENE_LIMITS.nodes)
  v.requireScene(
    mapping.length === entries.size,
    'pairs',
    'Escolha um destino para cada pose copiada.',
  )
  if (mirror !== undefined) v.choice(mirror, ['x', 'y', 'z'], 'axis')
  const sources = new Set<string>()
  const targets = new Map<string, SceneAnimationLocalPose>()
  for (const input of mapping) {
    const pair = v.record(input, 'pair', ['sourceId', 'targetId'])
    const sourceId = v.id(pair.sourceId, 'sourceId'),
      targetId = v.id(pair.targetId, 'targetId')
    const pose = entries.get(sourceId)
    v.requireScene(pose, 'sourceId', 'Essa origem não está nas poses copiadas.')
    v.requireScene(!sources.has(sourceId), 'sourceId', 'Uma origem apareceu duas vezes.')
    v.requireScene(!targets.has(targetId), 'targetId', 'Cada pose precisa de um destino diferente.')
    sources.add(sourceId)
    targets.set(targetId, mirror === undefined ? pose : mirrorSceneAnimationLocalPose(pose, mirror))
  }
  const scene = indexSceneNodes(document.nodes)
  const clip = indexSceneAnimations(document, scene).animations.get(clipId)
  v.requireScene(
    clip?.space === copied.entries[0]!.pose.space,
    'space',
    'Essa pose usa outro tipo de posição local. Copie de um movimento compatível.',
  )
  v.number(time, 'time', 0, clip.duration)
  return setSceneAnimationKeys(document, clipId, sceneAnimationPoseKeys(clip, time, targets))
}
