import { createGestureCoordinator, type GestureToken } from '../core/gesture'
import type { Vec3 } from '../core/model'
import type { MoldaSceneDocument } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { type AffineMatrix, affineInverse } from '../scene/matrix'
import { sceneNodePivot, setSceneAuthoringPivot } from '../scene/pivot'
import { requireScene } from '../scene/validation'
import type { EditorStore } from './editorStore'

/** Pivot authoring stages metadata only; a cancelled drag never reaches autosave. */
export function createScenePivotGesture(
  editor: EditorStore<MoldaSceneDocument>,
  onError: (error: unknown) => void,
) {
  const coordinator = createGestureCoordinator({
    current: () => editor.getState().content,
    revision: () => editor.getState().contentRevision,
    preview: (next: MoldaSceneDocument) => editor.getState().stage(next),
    cancel: (before) => editor.getState().cancelGesture(before),
    commit: (before, after) => editor.getState().commitGesture(before, after),
  })
  let active: {
    token: GestureToken<MoldaSceneDocument>
    id: string
    pivot: Vec3
    inverse: AffineMatrix
  } | null = null
  const cancel = () => {
    const owner = active
    active = null
    if (owner) coordinator.cancel(owner.token)
  }
  return {
    begin(id: string, world: Readonly<AffineMatrix>) {
      cancel()
      try {
        const source = editor.getState().content,
          node = indexSceneDocument(source).scene.nodes.get(id),
          inverse = affineInverse(world)
        requireScene(node && inverse, 'pivot', 'Escolha uma peça com eixos de tamanho positivo.')
        const pivot = sceneNodePivot(node)
        setSceneAuthoringPivot(source, id, pivot)
        active = { token: coordinator.begin(), id, pivot, inverse }
        return true
      } catch (error) {
        onError(error)
        return false
      }
    },
    preview(delta: Vec3) {
      if (!active) return false
      const { token, id, pivot, inverse } = active
      try {
        const point = pivot.map(
          (n, i) =>
            n + inverse[i]! * delta[0] + inverse[4 + i]! * delta[1] + inverse[8 + i]! * delta[2],
        ) as Vec3
        return coordinator.preview(token, setSceneAuthoringPivot(token.before, id, point))
      } catch (error) {
        cancel()
        onError(error)
        return false
      }
    },
    end(commit: boolean) {
      if (!commit) return cancel()
      const owner = active
      active = null
      if (owner) coordinator.commit(owner.token)
    },
    cancel,
  }
}
