import type { Vec3 } from '../core/model'
import type { ModelSceneNode, MoldaSceneDocument } from '../scene/document'
import { animatedScene } from './sceneAnimation'

export function makeSceneTwoBoneFixture(
  space: 'local' | 'local-delta' = 'local-delta',
): MoldaSceneDocument {
  const source = animatedScene()
  function support(id: string, parentId: string | null, translation: Vec3): ModelSceneNode {
    return {
      id,
      parentId,
      kind: 'group',
      name: id,
      hidden: false,
      locked: false,
      transform: { kind: 'trs', translation, rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    }
  }
  return {
    ...source,
    nodes: [
      ...source.nodes.map((node) => (node.id === 'body' ? { ...node, parentId: 'middle' } : node)),
      support('tip', 'middle', [1, 0, 0]),
      support('middle', 'root', [1, 0, 0]),
      support('root', 'parent', [0, 0, 0]),
      support('parent', null, [0, 0, 0]),
    ],
    animations: [{ ...source.animations[0]!, space, tracks: [] }],
  }
}
