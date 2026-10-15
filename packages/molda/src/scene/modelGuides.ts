import type { Vec3 } from '../core/model'
import { editSceneMesh } from './commands'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { affineInverse, transformPoint } from './matrix'
import { cutMeshByPlane, type MeshCutPlane } from './meshPlaneCut'
import { sceneLocalBounds, setSceneAuthoringPivot } from './pivot'
import { requireScene } from './validation'

export function scenePivotTargets(document: MoldaSceneDocument, nodeId: string) {
  const index = indexSceneDocument(document),
    node = index.scene.nodes.get(nodeId)
  requireScene(node, 'node', 'Escolha uma peça ou conjunto.')
  const world = index.scene.worldMatrices.get(nodeId)!,
    inverse = affineInverse(world)
  requireScene(
    inverse,
    'pivot',
    'Essa peça tem um eixo sem tamanho. Ajuste-o antes de mover o pivô.',
  )
  const bounds = sceneLocalBounds(document, nodeId)
  requireScene(bounds, 'pivot', 'Esse conjunto não tem peças para definir o pivô.')
  const center = transformPoint(world, bounds.center)
  const bottom = transformPoint(world, bounds.base)
  const corners: Vec3[] = []
  for (const x of [bounds.min[0], bounds.max[0]])
    for (const y of [bounds.min[1], bounds.max[1]])
      for (const z of [bounds.min[2], bounds.max[2]]) corners.push(transformPoint(world, [x, y, z]))
  return {
    center,
    bottom,
    corners,
    local: (point: Vec3) => transformPoint(inverse, point),
    size: Math.max(...bounds.max.map((value, axis) => value - bounds.min[axis]!)),
  }
}

export function moveScenePivotToWorld(document: MoldaSceneDocument, nodeId: string, point: Vec3) {
  return setSceneAuthoringPivot(document, nodeId, scenePivotTargets(document, nodeId).local(point))
}

/** Extrude a two-point screen line along the orthographic view to obtain a real world plane. */
export function sceneDivisionPlane(a: Vec3, b: Vec3, direction: Vec3): MeshCutPlane {
  const line = b.map((value, axis) => value - a[axis]!)
  const normal: Vec3 = [
    line[1]! * direction[2] - line[2]! * direction[1],
    line[2]! * direction[0] - line[0]! * direction[2],
    line[0]! * direction[1] - line[1]! * direction[0],
  ]
  const length = Math.hypot(...normal)
  requireScene(
    length > 1e-8,
    'plane',
    'Escolha dois pontos diferentes e afastados para definir a divisão.',
  )
  return { origin: [...a], normal: normal.map((value) => value / length) as Vec3 }
}

export function divideSceneByWorldPlane(
  document: MoldaSceneDocument,
  nodeId: string,
  plane: MeshCutPlane,
) {
  const index = indexSceneDocument(document),
    world = index.scene.worldMatrices.get(nodeId)
  requireScene(world, 'node', 'Escolha uma peça.')
  const inverse = affineInverse(world)
  requireScene(inverse, 'plane', 'A transformação da peça impede essa divisão.')
  const normal = [0, 1, 2].map(
    (axis) =>
      world[axis * 4]! * plane.normal[0] +
      world[axis * 4 + 1]! * plane.normal[1] +
      world[axis * 4 + 2]! * plane.normal[2],
  ) as Vec3
  return editSceneMesh(
    document,
    nodeId,
    (mesh) => cutMeshByPlane(mesh, { origin: transformPoint(inverse, plane.origin), normal }).mesh,
  )
}
