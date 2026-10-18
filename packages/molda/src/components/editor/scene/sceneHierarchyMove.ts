import { requireSceneAnimationReparent } from '../../../scene/animationIndex'
import type { indexSceneDocument } from '../../../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { selectSceneSubtrees } from '../../../scene/graph'
import { affineInverse } from '../../../scene/matrix'
import { SceneValidationError } from '../../../scene/validation'

/** A read-only plan for one selection. Actual writes still use the document command. */
export function prepareHierarchyMove(
  index: ReturnType<typeof indexSceneDocument>,
  ids: readonly string[],
) {
  const scene = index.scene
  const selection = selectSceneSubtrees(scene, ids)
  const flags = evaluateSceneNodeFlags(scene)
  const editable =
    selection.roots.size > 0 && [...selection.covered].every((id) => !flags.get(id)?.locked)
  return {
    ids: [...selection.roots],
    editable,
    allows(parentId: string | null) {
      if (!editable) return false
      if (parentId !== null) {
        if (
          scene.nodes.get(parentId)?.kind !== 'group' ||
          flags.get(parentId)?.locked ||
          selection.covered.has(parentId)
        )
          return false
        const matrix = scene.worldMatrices.get(parentId)
        if (!matrix || !affineInverse(matrix)) return false
      }
      if ([...selection.roots].every((id) => scene.nodes.get(id)?.parentId === parentId))
        return false
      try {
        requireSceneAnimationReparent(scene, index.animatedNodes, selection.roots, parentId)
      } catch (error) {
        if (error instanceof SceneValidationError) return false
        throw error
      }
      return true
    },
  }
}
