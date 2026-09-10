import { useEffect, useMemo } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import type { SceneAnimationPlayer } from '../../../state/SceneAnimationPlayer'
import { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'

export function useSceneAnimationPoseGesture(
  editor: EditorStore<MoldaSceneDocument>,
  player: SceneAnimationPlayer,
) {
  const gesture = useMemo(() => new SceneAnimationPoseGesture(editor, player), [editor, player])
  useEffect(() => {
    const disconnect = gesture.connect()
    const hidden = () => {
      if (document.hidden) gesture.cancel()
    }
    window.addEventListener('blur', gesture.cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', gesture.cancel)
      document.removeEventListener('visibilitychange', hidden)
      disconnect()
    }
  }, [gesture])
  return gesture
}
