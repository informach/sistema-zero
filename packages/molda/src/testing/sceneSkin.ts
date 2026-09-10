import type { SceneSkinBindInput } from '../scene/skinBinding'
import { makeSceneGlbFixture } from './sceneGlbFixture'

export function makeSceneSkinFixture() {
  const document = makeSceneGlbFixture(1, 1, 0, 0)
  document.animations = []
  document.nodes[0] = {
    ...document.nodes[0]!,
    parentId: 'rig',
    transform: {
      kind: 'affine',
      matrix: [1, 0, 0, 0, 0.125, 1.5, 0, 0, 0, 0.2, 1, 0, 1, -2, 3, 1],
    },
  }
  document.nodes.push(
    {
      id: 'rig',
      name: 'Corpo',
      kind: 'group',
      parentId: null,
      hidden: false,
      locked: false,
      transform: {
        kind: 'affine',
        matrix: [-2, 0, 0, 0, 0.2, 1.5, 0, 0, 0.1, 0, 1, 0, 3, 2, -1, 1],
      },
    },
    {
      id: 'upper',
      name: 'Braço',
      kind: 'group',
      parentId: 'rig',
      hidden: false,
      locked: false,
      transform: { kind: 'trs', translation: [0, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    },
    {
      id: 'lower',
      name: 'Antebraço',
      kind: 'locator',
      parentId: 'upper',
      hidden: false,
      locked: false,
      transform: { kind: 'trs', translation: [0, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    },
  )
  const input: SceneSkinBindInput = {
    id: 'skin',
    name: 'Braço macio',
    nodeId: 'part-0',
    jointIds: ['upper', 'lower'],
    weights: Object.fromEntries(
      ['v_0_0', 'v_1_0', 'v_0_1', 'v_1_1'].map((id, i) => [
        id,
        [
          { jointId: 'upper', weight: i / 3 },
          { jointId: 'lower', weight: 1 - i / 3 },
        ],
      ]),
    ),
  }
  return { document, input }
}
