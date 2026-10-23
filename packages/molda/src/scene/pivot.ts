import type { Vec3 } from '../core/model'
import { cross, dot, normalize, scale, sub } from '../model/vec'
import { finishSceneCommand, requireEditableScene, sceneCommandSelection } from './commandContext'
import type { ModelSceneNode, MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { selectSceneSubtrees } from './graph'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  quaternionFromEulerXYZ,
  transformDirection,
  transformPoint,
} from './matrix'
import { meshFaceFrame } from './meshFaceFrame'
import { cachedParametricMesh } from './parametricGeometry'
import { requireScene, tuple } from './validation'

export function sceneNodePivot(node: Pick<ModelSceneNode, 'pivot'>): Vec3 {
  return node.pivot ? [...node.pivot] : [0, 0, 0]
}

/** A local face direction saved for future manipulation; it does not transform the mesh. */
export function scenePivotAxisFrame(world: Readonly<AffineMatrix>, axis: Vec3): AffineMatrix {
  const up = normalize(transformDirection(world, axis))
  const reference: Vec3 = Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]
  const tangent = sub(reference, scale(axis, dot(reference, axis)))
  const worldTangent = transformDirection(world, tangent)
  const right = normalize(sub(worldTangent, scale(up, dot(worldTangent, up))))
  const forward = cross(right, up)
  const frame = identityMatrix()
  for (const coordinate of [0, 1, 2] as const) {
    frame[coordinate] = right[coordinate]
    frame[4 + coordinate] = up[coordinate]
    frame[8 + coordinate] = forward[coordinate]
  }
  return frame
}

/** A world-space turn around the saved pivot direction and point. */
export function scenePivotAxisRotation(
  world: Readonly<AffineMatrix>,
  pivot: Vec3,
  axis: Vec3,
  degrees: Vec3,
): AffineMatrix {
  const frame = scenePivotAxisFrame(world, axis)
  const center = transformPoint(world, pivot)
  for (const coordinate of [0, 1, 2] as const) frame[12 + coordinate] = center[coordinate]
  const inverseFrame = affineInverse(frame)
  requireScene(inverseFrame, 'pivot', 'O eixo do pivô precisa ter tamanho.')
  return affineMultiply(
    frame,
    affineMultiply(
      composeTransform({
        kind: 'trs',
        translation: [0, 0, 0],
        rotation: quaternionFromEulerXYZ(degrees),
        scale: [1, 1, 1],
      }),
      inverseFrame,
    ),
  )
}

export function setScenePivotAxisFromFace(
  document: MoldaSceneDocument,
  nodeId: string,
  faceId: string,
): MoldaSceneDocument {
  const selection = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selection)
  const node = selection.index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'pivotAxis', 'Escolha uma peça com uma face.')
  const geometry = selection.index.geometries.get(node.geometryId)
  requireScene(geometry?.kind === 'mesh', 'pivotAxis', 'Converta a peça em malha primeiro.')
  const pivotAxis = meshFaceFrame(geometry, faceId).normal
  if (node.pivotAxis?.every((value, i) => value === pivotAxis[i])) return document
  return finishSceneCommand({
    ...document,
    nodes: document.nodes.map((entry) =>
      entry.id === nodeId ? { ...entry, pivotAxis: [...pivotAxis] as Vec3 } : entry,
    ),
  })
}

export function clearScenePivotAxis(document: MoldaSceneDocument, nodeId: string) {
  const selection = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selection)
  const node = selection.index.scene.nodes.get(nodeId)
  requireScene(node, 'pivotAxis', 'Escolha uma peça.')
  if (!node.pivotAxis) return document
  return finishSceneCommand({
    ...document,
    nodes: document.nodes.map((entry) => {
      if (entry.id !== nodeId) return entry
      const { pivotAxis: _axis, ...rest } = entry
      return rest
    }),
  })
}

/** Conjugate in the actual local frame, including nonuniform scales and transformed parents. */
export function scenePivotRotation(
  world: Readonly<AffineMatrix>,
  pivot: Vec3,
  degrees = 30,
  axis?: Vec3,
) {
  if (axis) return scenePivotAxisRotation(world, pivot, axis, [0, degrees, 0])
  const inverse = affineInverse(world)
  requireScene(inverse, 'pivot', 'Essa peça tem um eixo sem tamanho.')
  const before = identityMatrix(),
    after = identityMatrix()
  for (const axis of [0, 1, 2] as const) {
    before[12 + axis] = -pivot[axis]
    after[12 + axis] = pivot[axis]
  }
  const rotation = composeTransform({
    kind: 'trs',
    translation: [0, 0, 0],
    rotation: quaternionFromEulerXYZ([0, degrees, 0]),
    scale: [1, 1, 1],
  })
  return affineMultiply(
    world,
    affineMultiply(after, affineMultiply(rotation, affineMultiply(before, inverse))),
  )
}

/** Bounds expressed in this node's own axes, independent of camera and world rotation. */
function computeLocalBounds(document: MoldaSceneDocument, nodeId: string) {
  const index = indexSceneDocument(document)
  const world = index.scene.worldMatrices.get(nodeId)
  requireScene(world, 'node', 'Escolha uma peça ou conjunto.')
  const inverse = affineInverse(world)
  requireScene(inverse, 'pivot', 'A peça precisa ter tamanho nos três eixos.')
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const id of selectSceneSubtrees(index.scene, [nodeId]).covered) {
    const node = index.scene.nodes.get(id)!
    if (node.kind !== 'mesh') continue
    const geometry = index.geometries.get(node.geometryId)!
    const mesh = geometry.kind === 'mesh' ? geometry : cachedParametricMesh(geometry).mesh
    const matrix =
      id === nodeId ? null : affineMultiply(inverse, index.scene.worldMatrices.get(id)!)
    for (const source of Object.values(mesh.vertices)) {
      const point = matrix ? transformPoint(matrix, source) : source
      for (const axis of [0, 1, 2] as const) {
        min[axis] = Math.min(min[axis], point[axis])
        max[axis] = Math.max(max[axis], point[axis])
      }
    }
  }
  if (!Number.isFinite(min[0])) return null
  const center = min.map((value, axis) => value / 2 + max[axis]! / 2) as Vec3
  return {
    min,
    max,
    center,
    base: [center[0], min[1], center[2]] as Vec3,
    size: max.map((value, axis) => value - min[axis]!) as Vec3,
  }
}

const localBoundsCache = new WeakMap<
  MoldaSceneDocument,
  Map<string, ReturnType<typeof computeLocalBounds>>
>()
/** Shared read-only derived bounds, cached by immutable document revision and node. */
export function sceneLocalBounds(document: MoldaSceneDocument, nodeId: string) {
  let byNode = localBoundsCache.get(document)
  if (!byNode) {
    byNode = new Map()
    localBoundsCache.set(document, byNode)
  }
  if (!byNode.has(nodeId)) byNode.set(nodeId, computeLocalBounds(document, nodeId))
  return byNode.get(nodeId)!
}

/** Changes only future manipulation. Existing scene, children and animation remain exact. */
export function setSceneAuthoringPivot(
  document: MoldaSceneDocument,
  nodeId: string,
  point: Vec3,
): MoldaSceneDocument {
  const value = tuple(point, 3, 'pivot') as Vec3
  const selection = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selection)
  const node = selection.index.scene.nodes.get(nodeId)!
  if (sceneNodePivot(node).every((n, axis) => n === value[axis])) return document
  return finishSceneCommand({
    ...document,
    nodes: document.nodes.map((entry) =>
      entry.id === nodeId ? { ...entry, pivot: value } : entry,
    ),
  })
}

export function setScenePivotPreset(
  document: MoldaSceneDocument,
  nodeId: string,
  preset: 'center' | 'bottom' | 'corner',
) {
  const bounds = sceneLocalBounds(document, nodeId)
  requireScene(bounds, 'pivot', 'Escolha uma peça ou um conjunto com geometria.')
  const point =
    preset === 'center'
      ? bounds.center
      : preset === 'bottom'
        ? bounds.base
        : ([bounds.max[0], bounds.min[1], bounds.max[2]] as Vec3)
  return setSceneAuthoringPivot(document, nodeId, point)
}

export function setScenePivotVertex(
  document: MoldaSceneDocument,
  nodeId: string,
  vertexId: string,
) {
  const index = indexSceneDocument(document),
    node = index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'pivot', 'Escolha uma peça com pontos.')
  const geometry = index.geometries.get(node.geometryId)!
  const mesh = geometry.kind === 'mesh' ? geometry : cachedParametricMesh(geometry).mesh
  const point = mesh.vertices[vertexId]
  requireScene(point, 'pivot', 'Esse ponto não pertence à peça atual.')
  return setSceneAuthoringPivot(document, nodeId, point)
}
