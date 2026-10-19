import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { allocateSceneId, finishSceneCommand } from './commandContext'
import { convertSceneNodesToMesh } from './commands'
import type { ModelSceneNode, MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneNodeFlags } from './evaluate'
import {
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  quaternionFromEulerXYZ,
} from './matrix'
import { divideSceneByWorldPlane, scenePivotTargets } from './modelGuides'
import { SCENE_SKIN_LIMITS } from './skin'
import { number, requireScene, tuple } from './validation'

export type SceneRigView = 'front' | 'left' | 'top'
export const SCENE_RIG_NORMALS: Record<SceneRigView, Vec3> = {
  front: [0, 0, 1],
  left: [-1, 0, 0],
  top: [0, 1, 0],
}

export function sceneRigTarget(source: MoldaSceneDocument, nodeId: string) {
  const index = indexSceneDocument(source),
    node = index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha uma peça para montar os ossos.')
  const flags = evaluateSceneNodeFlags(index.scene).get(nodeId)!
  requireScene(
    !flags.locked && !flags.hidden,
    'node',
    'Mostre e destrave a peça para montar os ossos.',
  )
  requireScene(
    !index.skinsByNode.has(nodeId),
    'skin',
    'Esta peça já tem ossos. Use os ajustes da montagem existente.',
  )
  return { node, index, ...scenePivotTargets(source, nodeId) }
}

export interface PreparedSceneRig {
  document: MoldaSceneDocument
  nodeId: string
  jointIds: string[]
  view: SceneRigView
}

/** A derived proposal only: conversion, divisions and the new chain share one later commit. */
export function prepareSceneRig(
  source: MoldaSceneDocument,
  nodeId: string,
  points: readonly Vec3[],
  view: SceneRigView,
  nextId: () => string = newId,
): PreparedSceneRig {
  const target = sceneRigTarget(source, nodeId)
  requireScene(Object.hasOwn(SCENE_RIG_NORMALS, view), 'view', 'Escolha por qual lado montar.')
  requireScene(
    points.length >= 2 && points.length <= SCENE_SKIN_LIMITS.joints,
    'points',
    'Marque pelo menos dois pontos para ligar os ossos.',
  )
  for (let i = 0; i < points.length; i++) {
    tuple(points[i], 3, 'point')
    if (i)
      requireScene(
        Math.hypot(...points[i]!.map((n, axis) => n - points[i - 1]![axis]!)) > 0,
        'points',
        'Marque o próximo ponto em outro lugar.',
      )
  }
  let document = convertSceneNodesToMesh(source, [nodeId], nextId)
  // A cube with only its eight corners has no vertices at the elbow. Surface divisions
  // preserve both sides and affine UVs, supplying those vertices without changing rest shape.
  for (let i = 1; i < points.length - 1; i++) {
    let direction = points[i + 1]!.map((n, axis) => n - points[i - 1]![axis]!) as Vec3
    if (Math.hypot(...direction) === 0)
      direction = points[i]!.map((n, axis) => n - points[i - 1]![axis]!) as Vec3
    document = divideSceneByWorldPlane(document, nodeId, { origin: points[i]!, normal: direction })
  }
  const allocate = allocateSceneId(document, nextId)
  const jointIds = points.map(() => allocate())
  const parentWorld = target.node.parentId
    ? target.index.scene.worldMatrices.get(target.node.parentId)!
    : identityMatrix()
  const inverse = affineInverse(parentWorld)
  requireScene(inverse, 'parent', 'O grupo da peça precisa de um tamanho maior que zero.')
  const nodes: ModelSceneNode[] = points.map((point, i) => {
    const world = identityMatrix()
    for (const axis of [0, 1, 2] as const) world[12 + axis] = point[axis]
    return {
      id: jointIds[i]!,
      name:
        i === 0
          ? `Ossos · ${target.node.name}`.slice(0, 48)
          : i === points.length - 1
            ? 'Ponta'
            : `Dobra ${i}`,
      kind: i === points.length - 1 ? 'locator' : 'group',
      parentId: i === 0 ? target.node.parentId : jointIds[i - 1]!,
      hidden: false,
      locked: false,
      transform:
        i === 0
          ? { kind: 'affine', matrix: affineMultiply(inverse, world) }
          : {
              kind: 'trs',
              translation: point.map((n, axis) => n - points[i - 1]![axis]!) as Vec3,
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
    }
  })
  return {
    document: finishSceneCommand({ ...document, nodes: [...document.nodes, ...nodes] }),
    nodeId,
    jointIds,
    view,
  }
}

/** Test rotations are viewport-only, never a new rest position or an animation track. */
export function previewSceneRig(
  source: MoldaSceneDocument,
  rig: Pick<PreparedSceneRig, 'jointIds' | 'view'>,
  jointId: string,
  degrees: number,
) {
  number(degrees, 'angle')
  requireScene(
    degrees >= -70 && degrees <= 70 && rig.jointIds.slice(0, -1).includes(jointId),
    'joint',
    'Escolha um osso para experimentar a dobra.',
  )
  const angles = SCENE_RIG_NORMALS[rig.view].map((n) => n * degrees) as Vec3
  const rotation = quaternionFromEulerXYZ(angles)
  const node = source.nodes.find((node) => node.id === jointId)!
  if (degrees === 0) return source
  const turn: ModelSceneNode['transform'] =
    node.transform.kind === 'trs'
      ? { ...node.transform, rotation }
      : {
          kind: 'affine',
          matrix: affineMultiply(
            node.transform.matrix,
            composeTransform({ kind: 'trs', translation: [0, 0, 0], rotation, scale: [1, 1, 1] }),
          ),
        }
  // The root carries the original parent's inverse frame. Rotate about its own origin
  // by multiplying that frame; descendants are already ordinary local TRS joints.
  return {
    ...source,
    nodes: source.nodes.map((entry) =>
      entry.id === jointId ? { ...entry, transform: turn } : entry,
    ),
  }
}
