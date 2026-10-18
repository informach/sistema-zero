import { useMemo } from 'react'
import { COPY } from '../../../core/copy'
import {
  groupSceneNodes,
  renameSceneNode,
  reparentSceneNodes,
  ungroupSceneNodes,
} from '../../../scene/commands'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { requireScene } from '../../../scene/validation'
import { prepareHierarchyMove } from './sceneHierarchyMove'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function useSceneHierarchyOrganization(workshop: ReturnType<typeof useSceneWorkshop>) {
  const { editor, document, index, selected, run } = workshop
  // Autosave thumbnails do not change the tree or revoke an otherwise valid drag.
  const owner = useMemo(
    () => ({
      editor,
      documentId: document.id,
      nodes: document.nodes,
      animations: document.animations,
    }),
    [editor, document.id, document.nodes, document.animations],
  )
  const plan = useMemo(() => prepareHierarchyMove(index, selected), [index, selected])
  const flags = useMemo(() => evaluateSceneNodeFlags(index.scene), [index])
  const blockedSubtrees = useMemo(() => {
    const blocked = new Set([...flags].filter(([, value]) => value.locked).map(([id]) => id))
    for (const id of [...index.scene.order].reverse()) {
      const parentId = index.scene.nodes.get(id)?.parentId
      if (blocked.has(id) && parentId) blocked.add(parentId)
    }
    return blocked
  }, [index, flags])
  return {
    owner,
    plan,
    destinations: document.nodes.filter((node) => node.kind === 'group' && plan.allows(node.id)),
    canUngroup:
      plan.editable &&
      selected.every(
        (id) => index.scene.nodes.get(id)?.kind === 'group' && !index.animatedNodes.has(id),
      ),
    prepareMove: (ids: readonly string[]) => prepareHierarchyMove(index, ids),
    canDrag: (id: string) => index.scene.nodes.has(id) && !blockedSubtrees.has(id),
    canRename: (id: string) => !!index.scene.nodes.has(id) && !flags.get(id)?.locked,
    rename: (id: string, name: string) =>
      !!run((source) => {
        requireScene(
          source.nodes === document.nodes,
          'nodes',
          'A lista mudou. Escolha a peça novamente.',
        )
        return renameSceneNode(source, id, name)
      }),
    move: (ids: readonly string[], parentId: string | null) =>
      !!run((source) => {
        requireScene(
          source.nodes === document.nodes,
          'nodes',
          'A lista mudou. Arraste a peça novamente.',
        )
        return reparentSceneNodes(source, ids, parentId)
      }),
    group: () =>
      run((source) => {
        let name: string = COPY.scene.groupName
        let number = 2
        while (source.nodes.some((node) => node.name === name))
          name = `${COPY.scene.groupName} ${number++}`
        return groupSceneNodes(source, selected, { name })
      }, 'created'),
    ungroup: () => run((source) => ungroupSceneNodes(source, selected), 'clear'),
  }
}

export type SceneHierarchyOrganization = ReturnType<typeof useSceneHierarchyOrganization>
