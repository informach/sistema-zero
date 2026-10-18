import type { Vec3 } from '../core/model'
import { sceneBounds } from './bounds'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { selectSceneSubtrees } from './graph'
import { type AffineMatrix, affineInverse, affineMultiply, identityMatrix } from './matrix'
import { sceneMeasurementReference } from './measurementReference'
import { type SceneMeasurementStep, snapSceneMeasurement } from './measurementStep'
import { sceneLocalBounds, sceneNodePivot } from './pivot'
import { requireScene } from './validation'

/** Click steps use the same lengths and parent-relative position as the piece fields. */
export function sceneMeasurementStepDelta(
  document: MoldaSceneDocument,
  ids: readonly string[],
  mode: 'move' | 'scale',
  increments: Vec3,
  step: SceneMeasurementStep,
  posedWorld?: ReadonlyMap<string, Readonly<AffineMatrix>>,
): AffineMatrix {
  const original = indexSceneDocument(document)
  const index = posedWorld
    ? { ...original, scene: { ...original.scene, worldMatrices: new Map(posedWorld) } }
    : original
  const roots = [...selectSceneSubtrees(index.scene, ids).roots]
  const bounds = sceneBounds(index, {
    nodeIds: selectSceneSubtrees(index.scene, roots).covered,
    includeMirrors: false,
  })
  const single = roots.length === 1 ? index.scene.nodes.get(roots[0]!) : null
  let frame = identityMatrix()
  let origin: Vec3 = bounds ? [...bounds.min] : [0, 0, 0]
  let dimensions: Vec3 = bounds
    ? (bounds.max.map((value, axis) => value - bounds.min[axis]!) as Vec3)
    : [0, 0, 0]
  let pivot: Vec3 = bounds
    ? (bounds.min.map((value, axis) => value / 2 + bounds.max[axis]! / 2) as Vec3)
    : [0, 0, 0]
  if (single) {
    const world = index.scene.worldMatrices.get(single.id)!
    const parent = single.parentId
      ? index.scene.worldMatrices.get(single.parentId)!
      : identityMatrix()
    const inverseParent = affineInverse(parent)
    requireScene(inverseParent, 'measurement', 'A peça precisa ter tamanho nos três eixos.')
    const local = affineMultiply(inverseParent, world)
    const localBounds = sceneLocalBounds(document, single.id)
    pivot = sceneNodePivot(single)
    const reference = sceneMeasurementReference(local, single.transform, pivot, localBounds)
    origin = reference.origin
    dimensions = reference.dimensions
    frame = mode === 'move' ? [...parent] : [...world]
  }
  const delta = identityMatrix()
  for (const axis of [0, 1, 2] as const) {
    if (increments[axis] === 0) continue
    if (mode === 'move') {
      delta[12 + axis] = snapSceneMeasurement(origin[axis] + increments[axis], step) - origin[axis]
    } else if (dimensions[axis] > 0) {
      delta[axis * 5] =
        snapSceneMeasurement(dimensions[axis] + increments[axis], step, step) / dimensions[axis]
    }
  }
  if (mode === 'scale') {
    const forward = identityMatrix()
    for (const axis of [0, 1, 2] as const) {
      forward[12 + axis] = pivot[axis]
    }
    frame = affineMultiply(frame, forward)
  }
  const inverse = affineInverse(frame)
  requireScene(inverse, 'measurement', 'A peça precisa ter tamanho nos três eixos.')
  return affineMultiply(frame, affineMultiply(delta, inverse))
}
