import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../../../scene/document'
import type { AffineMatrix } from '../../../scene/matrix'
import type { SceneComponentSession } from '../../../scene/meshComponents'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { createSceneComponentTransformGesture } from '../../../state/sceneComponentTransformGesture'

export function useSceneComponentTransform(
  editor: EditorStore<MoldaSceneDocument>,
  setSession: (selection: SceneComponentSession | null) => void,
) {
  const before = useRef<SceneComponentSession | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const gesture = useMemo(
    () =>
      createSceneComponentTransformGesture(editor, (error) =>
        setError(error instanceof SceneValidationError ? error.message : COPY.scene.commandFailed),
      ),
    [editor],
  )
  const restore = useCallback(() => {
    if (before.current) setSession(before.current)
    before.current = null
    setDragging(false)
  }, [setSession])
  const cancel = useCallback(() => {
    gesture.cancel()
    restore()
  }, [gesture, restore])
  useEffect(() => {
    window.addEventListener('blur', cancel)
    const visibility = () => {
      if (document.hidden) cancel()
    }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', visibility)
      gesture.cancel()
    }
  }, [gesture, cancel])
  return {
    dragging,
    error,
    begin(selection: SceneComponentSession, mesh: SceneMeshGeometry, softRadius = 0) {
      cancel()
      setError(null)
      if (!gesture.begin(selection, mesh, softRadius)) return false
      before.current = { ...selection, ids: [...selection.ids] }
      setDragging(true)
      return true
    },
    preview(delta: AffineMatrix) {
      if (!before.current) return false
      if (!gesture.preview(delta)) {
        restore()
        return false
      }
      const node = editor.getState().asset.nodes.find((n) => n.id === before.current?.nodeId)
      if (node?.kind === 'mesh') setSession({ ...before.current, geometryId: node.geometryId })
      return true
    },
    end(commit: boolean) {
      const accepted = gesture.end(commit)
      if (!commit || !accepted) restore()
      else {
        before.current = null
        setDragging(false)
      }
    },
    cancel,
  }
}
