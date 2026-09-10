import { useEffect, useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaSceneDocument } from '../../../scene/document'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { createSceneImageTask } from '../../../state/sceneImageTask'

export function useSceneImageTask(editor: EditorStore<MoldaSceneDocument>) {
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  })
  const task = useMemo(
    () =>
      createSceneImageTask(editor, (busy, error) =>
        setState({
          busy,
          error: error
            ? error instanceof SceneValidationError
              ? error.message
              : COPY.scene.imageTaskFailed
            : null,
        }),
      ),
    [editor],
  )
  useEffect(() => {
    const cancel = () => task.cancel()
    const hidden = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
      task.cancel(false)
    }
  }, [task])
  return { ...state, run: task.run, cancel: task.cancel }
}
