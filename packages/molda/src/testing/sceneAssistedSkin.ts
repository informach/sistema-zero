import type { Vec3 } from '../core/model'
import { captureSceneAnimationPoseSet, pasteSceneAnimationPoseSet } from '../scene/animationPoseSet'
import { setSceneBendLimit } from '../scene/bendLimitCommands'
import { composeTransform, transformPoint } from '../scene/matrix'
import { createSceneSkin } from '../scene/skinCommands'
import { prepareSceneTwoBonePose } from '../scene/twoBonePose'
import { makeSceneSkinFixture } from './sceneSkin'

/** An authored workflow fixture, not hand-written animation tracks masquerading as IK output. */
export function makeSceneAssistedSkinFixture(space: 'local' | 'local-delta') {
  const { document: source, input } = makeSceneSkinFixture()
  source.nodes.push({
    id: 'tip',
    name: 'Ponta',
    kind: 'locator',
    parentId: 'lower',
    hidden: false,
    locked: false,
    transform: { kind: 'trs', translation: [0, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  })
  source.animations = [
    { id: 'assisted', name: 'Alcançar', space, duration: 2, fps: 30, loop: false, tracks: [] },
    { id: 'reflected', name: 'Outro lado', space, duration: 2, fps: 30, loop: false, tracks: [] },
  ]
  source.mirrors = [
    { id: 'mirror-x', name: 'Espelho X', sourceId: 'part-0', axis: 'x', offset: 0.3 },
    { id: 'mirror-z', name: 'Espelho Z', sourceId: 'part-0', axis: 'z', offset: -0.7 },
  ]
  const { id, ...bind } = input
  let document = setSceneBendLimit(
    createSceneSkin(source, bind, () => id),
    'lower',
    { min: 30, max: 130 },
  )
  const parent = composeTransform(document.nodes.find((node) => node.id === 'rig')!.transform)
  const targets: Vec3[] = [
    [0.5, 2.25, 0.25],
    [-1, 2.6, 0.3],
    [3, 1, 0],
  ]
  const statuses: string[] = []
  for (const [time, target] of targets.entries()) {
    const prepared = prepareSceneTwoBonePose(document, 'assisted', ['upper', 'lower', 'tip'], time)
    const frame = prepared.sample(transformPoint(parent, target), transformPoint(parent, [0, 1, 2]))
    statuses.push(frame.reach.status)
    document = prepared.commit(frame, document)
    prepared.cancel()
  }
  for (const time of [0, 1, 2]) {
    const copied = captureSceneAnimationPoseSet(document, 'assisted', ['upper', 'lower'], time)
    document = pasteSceneAnimationPoseSet(
      document,
      'reflected',
      time,
      copied,
      copied.entries.map((entry) => ({ sourceId: entry.nodeId, targetId: entry.nodeId })),
      'x',
    )
  }
  return { document, statuses }
}
