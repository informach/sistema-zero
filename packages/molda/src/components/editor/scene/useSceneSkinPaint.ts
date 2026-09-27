import { useEffect, useMemo } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { createSceneSkinPaintSession } from '../../../state/sceneSkinPaintSession'

export function useSceneSkinPaint(editor: EditorStore<MoldaSceneDocument>) {
  const session = useMemo(() => createSceneSkinPaintSession(editor), [editor])
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) session.cancel()
    }
    window.addEventListener('blur', session.cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', session.cancel)
      document.removeEventListener('visibilitychange', hidden)
      session.cancel()
    }
  }, [session])
  return session
}
