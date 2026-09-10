import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { affineInverse } from './matrix'
import { readSceneSkins } from './readSkin'
import { SCENE_SKIN_LIMITS, type SceneSkinBinding, type SceneSkinInfluence } from './skin'
import { indexSceneSkins } from './skinIndex'
import { captureSceneSkinJoint } from './skinJoints'
import * as v from './validation'

/** Strict owned binding data plus cross-references to an already-valid scene. */
export function readSceneSkinBindings(
  raw: unknown,
  document: MoldaSceneDocument,
): SceneSkinBinding[] {
  const skins = readSceneSkins(raw),
    index = indexSceneDocument(document)
  indexSceneSkins(skins, index.scene, index.geometries)
  return skins
}

export interface SceneSkinBindInput {
  id: string
  name: string
  nodeId: string
  jointIds: string[]
  weights: Record<string, SceneSkinInfluence[]>
}

/** Explicitly capture rest pose: inverse(joint world at bind) × mesh world at bind.
 * No TRS decomposition, rounded vertices, or reader-side binding/normalization.
 */
export function bindSceneSkin(
  document: MoldaSceneDocument,
  input: SceneSkinBindInput,
): SceneSkinBinding {
  const row = v.record(input, 'bind', ['id', 'name', 'nodeId', 'jointIds', 'weights']),
    index = indexSceneDocument(document),
    nodeId = v.id(row.nodeId, 'nodeId'),
    meshWorld = index.scene.worldMatrices.get(nodeId),
    jointIds = v
      .list(row.jointIds, 'jointIds', SCENE_SKIN_LIMITS.joints)
      .map((id) => v.id(id, 'jointId'))
  v.requireScene(
    meshWorld && affineInverse(meshWorld),
    'nodeId',
    'A pose da peça não pode ser vinculada com segurança.',
  )
  const joints = jointIds.map((nodeId) =>
    captureSceneSkinJoint(nodeId, index.scene.worldMatrices.get(nodeId), meshWorld),
  )
  return readSceneSkinBindings(
    [
      {
        id: row.id,
        name: row.name,
        nodeId,
        joints,
        weights: row.weights,
      },
    ],
    document,
  )[0]!
}
