import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import { sceneBounds } from '../../../scene/bounds'
import { moveScenePivot, transformSceneNodes } from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { selectSceneSubtrees } from '../../../scene/graph'
import {
  affineMultiply,
  composeTransform,
  identityMatrix,
  quaternionFromEulerXYZ,
  transformPoint,
} from '../../../scene/matrix'
import { requireScene } from '../../../scene/validation'

export type SceneAdjustment = 'move' | 'rotate' | 'scale' | 'pivot'

export function adjustScene(
  document: MoldaSceneDocument,
  ids: readonly string[],
  mode: SceneAdjustment,
  values: Vec3,
): MoldaSceneDocument {
  requireScene(values.every(Number.isFinite), 'values', COPY.scene.invalidNumber)
  if (mode === 'pivot') {
    requireScene(ids.length === 1 && ids[0], 'selection', COPY.scene.choose)
    return moveScenePivot(document, ids[0], values)
  }
  if (mode === 'scale')
    requireScene(
      values.every((value) => value > 0),
      'values',
      COPY.scene.positiveScale,
    )
  const delta = composeTransform({
    kind: 'trs',
    translation: mode === 'move' ? values : [0, 0, 0],
    rotation: mode === 'rotate' ? quaternionFromEulerXYZ(values) : [0, 0, 0, 1],
    scale: mode === 'scale' ? values : [1, 1, 1],
  })
  if (mode === 'move') return transformSceneNodes(document, ids, delta)
  const index = indexSceneDocument(document)
  const bounds = sceneBounds(index, {
    nodeIds: selectSceneSubtrees(index.scene, ids).covered,
    includeMirrors: false,
  })
  const singleWorld = ids.length === 1 ? index.scene.worldMatrices.get(ids[0] ?? '') : undefined
  const center: Vec3 = singleWorld
    ? transformPoint(singleWorld, [0, 0, 0])
    : bounds
      ? [
          bounds.min[0] / 2 + bounds.max[0] / 2,
          bounds.min[1] / 2 + bounds.max[1] / 2,
          bounds.min[2] / 2 + bounds.max[2] / 2,
        ]
      : [0, 0, 0]
  const forward = identityMatrix()
  const backward = identityMatrix()
  for (let axis = 0; axis < 3; axis++) {
    forward[12 + axis] = center[axis] ?? 0
    backward[12 + axis] = -(center[axis] ?? 0)
  }
  return transformSceneNodes(
    document,
    ids,
    affineMultiply(forward, affineMultiply(delta, backward)),
  )
}
