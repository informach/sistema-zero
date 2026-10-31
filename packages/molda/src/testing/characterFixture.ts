import type { Vec3 } from '../core/model'
import { addScenePrimitive, groupSceneNodes } from '../scene/commands'
import { createSceneProject } from '../scene/createProject'
import type { MoldaSceneDocument } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { transformPoint } from '../scene/matrix'
import { sceneGeometryMesh } from '../scene/parametricGeometry'
import { scenePieceCoordinates, setScenePieceCoordinates } from '../scene/pieceCoordinates'

/** Caixa entre dois cantos do mundo. */
function box(document: MoldaSceneDocument, name: string, min: Vec3, max: Vec3) {
  let next = addScenePrimitive(document, 'box', name)
  const id = next.nodes.at(-1)!.id
  next = setScenePieceCoordinates(
    next,
    id,
    'dimensions',
    max.map((value, axis) => value - min[axis]!) as Vec3,
  )
  const index = indexSceneDocument(next)
  const node = index.scene.nodes.get(id)!
  const geometry = node.kind === 'mesh' ? index.geometries.get(node.geometryId)! : null
  const world = index.scene.worldMatrices.get(id)!
  const low: Vec3 = [Infinity, Infinity, Infinity]
  for (const point of Object.values(sceneGeometryMesh(geometry!).vertices)) {
    const p = transformPoint(world, point)
    for (const axis of [0, 1, 2] as const) low[axis] = Math.min(low[axis], p[axis])
  }
  const { position } = scenePieceCoordinates(next, id)
  return setScenePieceCoordinates(
    next,
    id,
    'position',
    position.map((value, axis) => value + min[axis]! - low[axis]!) as Vec3,
  )
}

/**
 * Boneco de blocos em pose T, olhando para +Z, com 2 de altura e a sola em y = 0. Os pontos que
 * a criança marcaria de frente vêm junto (queixo, virilha, cotovelo, pulso e joelho esquerdos).
 */
export function makeCharacterFixture() {
  let document = createSceneProject({ kind: 'empty', name: 'Boneco' })
  document = box(document, 'tronco', [-0.25, 0.9, -0.12], [0.25, 1.55, 0.12])
  document = box(document, 'cabeça', [-0.18, 1.6, -0.17], [0.18, 2, 0.17])
  document = box(document, 'pescoço', [-0.07, 1.5, -0.06], [0.07, 1.65, 0.06])
  document = box(document, 'braço esquerdo', [0.25, 1.4, -0.06], [0.95, 1.52, 0.06])
  document = box(document, 'braço direito', [-0.95, 1.4, -0.06], [-0.25, 1.52, 0.06])
  document = box(document, 'perna esquerda', [0.03, 0.06, -0.08], [0.22, 0.95, 0.08])
  document = box(document, 'perna direita', [-0.22, 0.06, -0.08], [-0.03, 0.95, 0.08])
  document = box(document, 'pé esquerdo', [0.03, 0, -0.08], [0.22, 0.06, 0.2])
  document = box(document, 'pé direito', [-0.22, 0, -0.08], [-0.03, 0.06, 0.2])
  document = groupSceneNodes(
    document,
    document.nodes.map((node) => node.id),
    { name: 'Boneco' },
  )
  const group = document.nodes.find((node) => node.kind === 'group')!.id
  const marks: Vec3[] = [
    [0, 1.62, 0],
    [0, 0.92, 0],
    [0.62, 1.46, 0],
    [0.9, 1.46, 0],
    [0.12, 0.5, 0],
  ]
  return { document, group, marks }
}
