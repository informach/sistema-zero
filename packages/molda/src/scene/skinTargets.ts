import type { MoldaSceneDocument } from './document'
import { SCENE_SKIN_LIMITS } from './skin'
import { requireScene } from './validation'

/** Copy weights once per mesh instance. Unselected joints remain explicit shared references. */
export function duplicateSceneSkinTargets(
  document: MoldaSceneDocument,
  nodeIds: ReadonlyMap<string, string>,
  allocate: () => string,
): Pick<MoldaSceneDocument, 'skins'> {
  if (document.skins === undefined) return {}
  const copied = document.skins.filter((skin) => nodeIds.has(skin.nodeId))
  if (!copied.length) return { skins: document.skins }
  requireScene(
    document.skins.length + copied.length <= SCENE_SKIN_LIMITS.bindings,
    'skins',
    'Essa cópia ultrapassa o orçamento de vínculos.',
  )
  const points = document.skins.reduce(
    (n, skin) => n + Object.keys(skin.weights).length * (nodeIds.has(skin.nodeId) ? 2 : 1),
    0,
  )
  requireScene(
    points <= SCENE_SKIN_LIMITS.weightedVertices,
    'skins',
    'Essa cópia ultrapassa o orçamento de pontos vinculados.',
  )
  return {
    skins: [
      ...document.skins,
      ...copied.map((skin) => ({
        ...skin,
        id: allocate(),
        nodeId: nodeIds.get(skin.nodeId)!,
        joints: skin.joints.map((joint) => ({
          ...structuredClone(joint),
          nodeId: nodeIds.get(joint.nodeId) ?? joint.nodeId,
        })),
        weights: Object.fromEntries(
          Object.entries(skin.weights).map(([id, influences]) => [
            id,
            influences.map((influence) => ({
              ...influence,
              jointId: nodeIds.get(influence.jointId) ?? influence.jointId,
            })),
          ]),
        ),
      })),
    ],
  }
}
