import { groupSceneNodes } from './commands'
import type { MoldaSceneDocument } from './document'
import { requireScene } from './validation'

export type SceneAnimationTarget = 'piece' | 'model'

/** A disposable candidate. Accepting a clip commits the group and animation together. */
export function prepareSceneAnimationTarget(
  document: MoldaSceneDocument,
  selected: readonly string[],
  target: SceneAnimationTarget,
) {
  if (target === 'piece') {
    requireScene(selected.length === 1, 'target', 'Escolha uma peça ou um conjunto para animar.')
    return { document, ids: [...selected] }
  }
  const roots = document.nodes.filter((node) => node.parentId === null)
  requireScene(roots.length > 0, 'target', 'Adicione uma peça antes de animar.')
  if (roots.length === 1 && roots[0]!.kind === 'group') return { document, ids: [roots[0]!.id] }
  const next = groupSceneNodes(
    document,
    roots.map((node) => node.id),
    { name: 'Modelo inteiro' },
  )
  const group = next.nodes.find((node) => !document.nodes.some((before) => before.id === node.id))!
  return { document: next, ids: [group.id] }
}
