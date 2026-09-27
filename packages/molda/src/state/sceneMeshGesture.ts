import { createGestureCoordinator, type GestureToken } from '../core/gesture'
import { newId } from '../core/id'
import { editSceneMesh } from '../scene/commands'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../scene/document'
import { requireScene, SceneValidationError } from '../scene/validation'
import type { EditorStore } from './editorStore'

export type SceneMeshPreview = (
  mesh: SceneMeshGeometry,
  allocate: () => string,
) => SceneMeshGeometry

/** All previews use one revision and replay the same IDs, including copy-on-write geometry. */
export function createSceneMeshGesture(
  editor: EditorStore<MoldaSceneDocument>,
  onError: (error: unknown) => void,
  nextId: () => string = newId,
) {
  const gestures = createGestureCoordinator({
    current: () => editor.getState().asset,
    revision: () => editor.getState().contentRevision,
    preview: (next: MoldaSceneDocument) => editor.getState().replace(next),
    cancel: (before) => editor.getState().cancelGesture(before),
    commit: (before, after) => editor.getState().commitGesture(before, after),
  })
  let active: { token: GestureToken<MoldaSceneDocument>; nodeId: string; ids: string[] } | null =
    null
  function cancel() {
    const current = active
    active = null
    if (current) gestures.cancel(current.token)
  }
  return {
    begin(id: string, expected?: SceneMeshGeometry): boolean {
      cancel()
      try {
        editSceneMesh(editor.getState().asset, id, (mesh) => {
          requireScene(
            !expected || mesh === expected,
            'geometry',
            'A malha mudou. Escolha as faces novamente.',
          )
          return mesh
        })
        active = { token: gestures.begin(), nodeId: id, ids: [] }
        return true
      } catch (error) {
        onError(error)
        return false
      }
    },
    preview(edit: SceneMeshPreview): boolean {
      const owner = active
      if (!owner) return false
      if (!gestures.isCurrent(owner.token)) {
        cancel()
        onError(
          new SceneValidationError(
            'revision',
            'A criação mudou durante o ajuste. Escolha as faces novamente.',
          ),
        )
        return false
      }
      let cursor = 0
      const allocate = () => {
        const i = cursor++
        const id = owner.ids[i] ?? nextId()
        owner.ids[i] = id
        return id
      }
      try {
        const next = editSceneMesh(
          owner.token.before,
          owner.nodeId,
          (mesh) => edit(mesh, allocate),
          allocate,
        )
        if (!gestures.preview(owner.token, next)) {
          if (active === owner) active = null
          return false
        }
        return true
      } catch (error) {
        if (active === owner) {
          cancel()
          if (active === null) onError(error)
        }
        return false
      }
    },
    end(commit: boolean): boolean {
      if (!commit) {
        cancel()
        return true
      }
      const current = active
      active = null
      return current !== null && gestures.commit(current.token)
    },
    isCurrent: () => active !== null && gestures.isCurrent(active.token),
    cancel,
  }
}
