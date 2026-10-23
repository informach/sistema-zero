import type { Vec3 } from '../src/core/model'
import { addScenePrimitive, resizeScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import type { MoldaSceneDocument } from '../src/scene/document'
import { identityMatrix } from '../src/scene/matrix'
import { setScenePieceCoordinates } from '../src/scene/pieceCoordinates'

/** Real 6 × 2 × 8 geometry. The illustrative cube in the JPEG must not falsify dimensions. */
export function fidelityFixture(): MoldaSceneDocument {
  let document = createSceneProject({ kind: 'empty', name: 'car2' })
  let serial = 0
  for (const [name, shape, dimensions, position] of [
    ['corpo', 'box', [6, 2, 8], [-5, 0, -5]],
    ['roda da frente', 'cylinder', [1, 1, 1], [-5, 0.4, -3]],
    ['roda de trás', 'cylinder', [1, 1, 1], [-5, 0.4, -7]],
    ['janela', 'box', [2, 1, 1], [-5, 0.5, -5]],
  ] satisfies Array<[string, 'box' | 'cylinder', Vec3, Vec3]>) {
    document = addScenePrimitive(document, shape, name, () => `reference-${++serial}`)
    const node = document.nodes.at(-1)!
    document = resizeScenePrimitive(document, node.id, dimensions)
    document = setScenePieceCoordinates(document, node.id, 'position', position)
  }
  const body = document.nodes[0]!,
    wheel = document.nodes[1]!
  return {
    ...document,
    id: 'fidelity-car2',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    nodes: [
      {
        id: 'carro',
        name: 'carro',
        kind: 'group',
        parentId: null,
        hidden: false,
        locked: false,
        transform: { kind: 'affine', matrix: identityMatrix() },
      },
      ...document.nodes.map((node) => ({
        ...node,
        parentId: 'carro',
        hidden: node.name === 'janela',
      })),
    ],
    animations: [
      {
        id: 'jump',
        name: 'Pular',
        duration: 2,
        fps: 24,
        loop: true,
        space: 'local-delta',
        tracks: [
          {
            nodeId: body.id,
            channel: 'translation',
            keys: [
              { time: 0, value: [0, 0, 0], interpolation: 'smooth' },
              { time: 0.5, value: [0, 1.5, 0], interpolation: 'smooth' },
              { time: 1, value: [0, 0, 0], interpolation: 'smooth' },
            ],
          },
          {
            nodeId: body.id,
            channel: 'rotation',
            keys: [
              { time: 0, value: [0, 0, 0, 1], interpolation: 'linear' },
              { time: 1, value: [0, 0, 0, 1], interpolation: 'linear' },
            ],
          },
          {
            nodeId: body.id,
            channel: 'scale',
            keys: [
              { time: 0, value: [1, 1, 1], interpolation: 'smooth' },
              { time: 0.4, value: [1, 1, 1], interpolation: 'smooth' },
              { time: 0.6, value: [1, 1, 1], interpolation: 'smooth' },
            ],
          },
          {
            nodeId: wheel.id,
            channel: 'translation',
            keys: [
              { time: 0, value: [0, 0, 0], interpolation: 'linear' },
              { time: 1, value: [0, 0, 0], interpolation: 'linear' },
              { time: 2, value: [0, 0, 0], interpolation: 'linear' },
            ],
          },
        ],
      },
      {
        id: 'walk',
        name: 'Andar',
        duration: 1,
        fps: 24,
        loop: true,
        space: 'local-delta',
        tracks: [],
      },
      {
        id: 'wheels',
        name: 'Girar rodas',
        duration: 1.5,
        fps: 24,
        loop: true,
        space: 'local-delta',
        tracks: [],
      },
    ],
  }
}
