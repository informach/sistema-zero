import { createGestureCoordinator, type GestureToken } from '../core/gesture'
import { transformSceneNodes } from '../scene/commands'
import type { MoldaSceneDocument } from '../scene/document'
import { type AffineMatrix, identityMatrix } from '../scene/matrix'
import type { EditorStore } from './editorStore'

/** Absolute gizmo deltas are applied to the captured revision, never cumulatively to previews. */
export function createSceneTransformGesture(
  editor: EditorStore<MoldaSceneDocument>,
  onError: (error: unknown) => void,
) {
  const gestures = createGestureCoordinator({
    current: () => editor.getState().asset,
    revision: () => editor.getState().contentRevision,
    preview: (next: MoldaSceneDocument) => editor.getState().replace(next),
    cancel: (before) => editor.getState().cancelGesture(before),
    commit: (before, after) => editor.getState().commitGesture(before, after),
  })
  let token: GestureToken<MoldaSceneDocument> | null = null
  let selected: readonly string[] = []
  function cancel() {
    const active = token
    token = null
    if (active) gestures.cancel(active)
  }
  return {
    begin(ids: readonly string[]): boolean {
      cancel()
      if (!ids.length) return false
      try {
        transformSceneNodes(editor.getState().asset, ids, identityMatrix())
        selected = [...ids]
        token = gestures.begin()
        return true
      } catch (error) {
        onError(error)
        return false
      }
    },
    preview(delta: AffineMatrix): boolean {
      if (!token) return false
      try {
        const next = transformSceneNodes(token.before, selected, delta)
        if (gestures.preview(token, next)) return true
        token = null
        return false
      } catch (error) {
        cancel()
        onError(error)
        return false
      }
    },
    end(commit: boolean) {
      if (!commit) {
        cancel()
        return
      }
      const active = token
      token = null
      if (active) gestures.commit(active)
    },
    cancel,
  }
}
