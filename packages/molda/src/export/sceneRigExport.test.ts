import { expect, test } from 'bun:test'
import { addScenePrimitive } from '../scene/commands'
import { createSceneProject } from '../scene/createProject'
import { scenePivotTargets } from '../scene/modelGuides'
import { setScenePieceCoordinates } from '../scene/pieceCoordinates'
import { prepareSceneRig } from '../scene/rigBuilder'
import { createSceneSkin } from '../scene/skinCommands'
import { prepareSceneSkinSuggestion, suggestSceneSkinWeights } from '../scene/skinSuggestion'
import { expectValidGlb } from '../testing/gltfValidation'
import { encodeSceneGlb } from './sceneGlb'

test('a guided chain exports as a valid GLB with its joints, weights and original rest shape', async () => {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Braço' }),
    'box',
    'braço',
  )
  const nodeId = source.nodes[0]!.id
  source = setScenePieceCoordinates(source, nodeId, 'dimensions', [2, 6, 2])
  const target = scenePivotTargets(source, nodeId)
  const rig = prepareSceneRig(
    source,
    nodeId,
    [
      [target.center[0], target.bottom[1], target.center[2]],
      target.center,
      [target.center[0], 2 * target.center[1] - target.bottom[1], target.center[2]],
    ],
    'front',
  )
  const weights = suggestSceneSkinWeights(
    prepareSceneSkinSuggestion(rig.document, {
      nodeId,
      jointIds: rig.jointIds,
      method: 'segments',
    }),
  ).weights
  const bound = createSceneSkin(rig.document, {
    nodeId,
    jointIds: rig.jointIds,
    name: 'Ossos',
    weights,
  })
  const before = structuredClone(bound)
  const result = encodeSceneGlb(bound, { allowLosses: true })
  expect(result.stats.bones).toBe(3)
  expect(result.stats.meshes).toBe(1)
  expect(result.issues).toEqual([{ code: 'skin-render-space', sourceId: bound.skins![0]!.id }])
  await expectValidGlb(result.bytes, ['NODE_SKINNED_MESH_NON_ROOT'])
  expect(bound).toEqual(before)
})
