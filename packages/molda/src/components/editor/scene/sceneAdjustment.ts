import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import type { Bounds } from '../../../model/transform'
import { sceneBounds } from '../../../scene/bounds'
import { transformSceneNodes } from '../../../scene/commands'
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
import { sceneNodePivot, setSceneAuthoringPivot } from '../../../scene/pivot'
import { requireScene } from '../../../scene/validation'

export type SceneAdjustment = 'move' | 'rotate' | 'scale' | 'pivot'

export function adjustScene(
  document: MoldaSceneDocument,
  ids: readonly string[],
  mode: SceneAdjustment,
  values: Vec3,
  keepBase = false,
): MoldaSceneDocument {
  requireScene(values.every(Number.isFinite), 'values', COPY.scene.invalidNumber)
  if (mode === 'pivot') {
    requireScene(ids.length === 1 && ids[0], 'selection', COPY.scene.choose)
    const node = indexSceneDocument(document).scene.nodes.get(ids[0])!
    return setSceneAuthoringPivot(
      document,
      ids[0],
      sceneNodePivot(node).map((n, axis) => n + values[axis]!) as Vec3,
    )
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
    ? transformPoint(singleWorld, sceneNodePivot(index.scene.nodes.get(ids[0]!)!))
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
  const next = transformSceneNodes(
    document,
    ids,
    affineMultiply(forward, affineMultiply(delta, backward)),
  )
  if (mode !== 'scale' || !keepBase || !bounds) return next
  return preserveSceneBase(document, next, ids, bounds)
}

export function preserveSceneBase(
  document: MoldaSceneDocument,
  next: MoldaSceneDocument,
  ids: readonly string[],
  before?: Bounds,
): MoldaSceneDocument {
  const index = indexSceneDocument(document)
  const bounds =
    before ??
    sceneBounds(index, {
      nodeIds: selectSceneSubtrees(index.scene, ids).covered,
      includeMirrors: false,
    })
  if (!bounds) return next
  const nextIndex = indexSceneDocument(next)
  const after = sceneBounds(nextIndex, {
    nodeIds: selectSceneSubtrees(nextIndex.scene, ids).covered,
    includeMirrors: false,
  })
  if (!after) return next
  const correction = identityMatrix()
  correction[13] = bounds.min[1] - after.min[1]
  return transformSceneNodes(next, ids, correction)
}
