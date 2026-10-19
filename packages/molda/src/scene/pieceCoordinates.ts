import type { Vec3 } from '../core/model'
import { finishSceneCommand, requireEditableScene, sceneCommandSelection } from './commandContext'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import {
  composeTransform,
  quaternionFromEulerXYZ,
  transformDirection,
  transformPoint,
} from './matrix'
import { sceneLocalBounds, sceneNodePivot, setSceneAuthoringPivot } from './pivot'
import { sceneTransformTrs } from './transformTrs'
import { requireScene, tuple } from './validation'

export type SceneCoordinateField = 'position' | 'dimensions' | 'pivot' | 'rotation'

/** Exact local TRS only: imported shear stays intact and is never approximately decomposed. */
export function scenePieceCoordinates(document: MoldaSceneDocument, nodeId: string) {
  const node = indexSceneDocument(document).scene.nodes.get(nodeId)
  requireScene(node, 'node', 'Escolha uma peça.')
  const matrix = composeTransform(node.transform)
  const trs = sceneTransformTrs(node.transform)
  const bounds = sceneLocalBounds(document, nodeId)
  const base = (bounds?.base ?? [0, 0, 0]).map((value, axis) =>
    bounds && trs.scale[axis]! < 0 ? bounds.center[axis]! + (bounds.center[axis]! - value) : value,
  ) as Vec3
  const localPivot = sceneNodePivot(node)
  const pivot = localPivot.map((value, axis) => (value - base[axis]!) * trs.scale[axis]!) as Vec3
  const point = transformPoint(matrix, localPivot)
  const position = point.map((value, axis) => value - pivot[axis]!) as Vec3
  // XYZ Euler display; values remain quaternion-backed in the document.
  const r = composeTransform({
    kind: 'trs',
    translation: [0, 0, 0],
    rotation: trs.rotation,
    scale: [1, 1, 1],
  })
  const y = Math.asin(Math.max(-1, Math.min(1, r[8])))
  const x = Math.abs(r[8]) < 0.9999999 ? Math.atan2(-r[9], r[10]) : Math.atan2(r[6], r[5])
  const z = Math.abs(r[8]) < 0.9999999 ? Math.atan2(-r[4], r[0]) : 0
  return {
    node,
    trs,
    bounds,
    localPivot,
    base,
    position,
    dimensions: (bounds?.size ?? [0, 0, 0]).map(
      (value, axis) => value * Math.abs(trs.scale[axis]!),
    ) as Vec3,
    pivot,
    rotation: [x, y, z].map((value) => (value * 180) / Math.PI) as Vec3,
  }
}

export function setScenePieceCoordinates(
  document: MoldaSceneDocument,
  nodeId: string,
  field: SceneCoordinateField,
  raw: Vec3,
) {
  const values = tuple(raw, 3, field) as Vec3
  requireEditableScene(sceneCommandSelection(document, [nodeId]))
  const current = scenePieceCoordinates(document, nodeId)
  if (values.every((value, axis) => value === current[field][axis])) return document
  if (field === 'pivot') {
    const base = current.base
    return setSceneAuthoringPivot(
      document,
      nodeId,
      values.map((value, axis) => base[axis]! + value / current.trs.scale[axis]!) as Vec3,
    )
  }
  const next = {
    kind: 'trs' as const,
    translation: current.trs.translation,
    rotation: current.trs.rotation,
    scale: current.trs.scale,
  }
  if (field === 'position') {
    next.translation = next.translation.map(
      (value, axis) => value + values[axis]! - current.position[axis]!,
    ) as Vec3
  } else {
    if (field === 'dimensions') {
      const size = current.bounds?.size
      const message =
        'O tamanho precisa ser maior que zero. Para dar espessura a uma face plana, use Puxar.'
      requireScene(size, 'dimensions', message)
      requireScene(
        size.some((n) => n > 0) && values.every((n, axis) => (size[axis] === 0 ? n === 0 : n > 0)),
        'dimensions',
        message,
      )
      next.scale = values.map((value, axis) =>
        size[axis] === 0
          ? current.trs.scale[axis]!
          : (Math.sign(current.trs.scale[axis]!) * value) / size[axis]!,
      ) as Vec3
    } else next.rotation = quaternionFromEulerXYZ(values)
    const fixed = transformPoint(composeTransform(current.node.transform), current.localPivot)
    const rotated = transformDirection(composeTransform(next), current.localPivot)
    next.translation = fixed.map((value, axis) => value - rotated[axis]!) as Vec3
  }
  return finishSceneCommand({
    ...document,
    nodes: document.nodes.map((node) => (node.id === nodeId ? { ...node, transform: next } : node)),
  })
}
