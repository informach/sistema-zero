import type { Vec3 } from '../core/model'
import { addScenePrimitive } from '../scene/commands'
import { createSceneProject } from '../scene/createProject'
import { sceneGeometryMesh } from '../scene/parametricGeometry'

/** A wheel cap flush with the car side: selection must resolve coincident visible surfaces. */
export function makeSceneWheelSelection() {
  let document = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Selecionar roda' }),
    'box',
    'carro',
  )
  document = addScenePrimitive(document, 'cylinder', 'corpo')
  const bodyId = document.nodes[0]!.id
  const wheelId = document.nodes[1]!.id
  document = {
    ...document,
    geometries: document.geometries.map((g) =>
      g.kind === 'cylinder' ? { ...g, tessellation: { around: 8 } } : g,
    ),
    nodes: document.nodes.map((node) =>
      node.id === wheelId
        ? {
            ...node,
            transform: {
              kind: 'trs',
              translation: [0, 0, 0],
              rotation: [Math.SQRT1_2, 0, 0, Math.SQRT1_2],
              scale: [1, 1, 1],
            },
          }
        : {
            ...node,
            transform: {
              kind: 'trs',
              translation: [0, 1, 0],
              rotation: [0, 0, 0, 1],
              scale: [2, 1, 1],
            },
          },
    ),
  }
  const wheel = document.nodes.find((node) => node.id === wheelId)!
  if (wheel.kind !== 'mesh') throw new Error('Expected wheel mesh')
  const mesh = sceneGeometryMesh(document.geometries.find((g) => g.id === wheel.geometryId)!)
  const capPoint: Vec3 = [0.25, 1, -0.4]
  return { document, wheelId, bodyId, mesh, capPoint }
}
