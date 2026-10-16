import { useEffect, useMemo, useRef } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import type { SceneAnimationPlayer } from '../../../state/SceneAnimationPlayer'
import { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'

export function useSceneAnimationPoseGesture(
  editor: EditorStore<MoldaSceneDocument>,
  player: SceneAnimationPlayer,
  onRecorded?: (clipId: string, time: number) => void,
) {
  const recorded = useRef(onRecorded)
  recorded.current = onRecorded
  const gesture = useMemo(
    () =>
      new SceneAnimationPoseGesture(editor, player, (clipId, time) =>
        recorded.current?.(clipId, time),
      ),
    [editor, player],
  )
  useEffect(() => {
    const disconnect = gesture.connect()
    const hidden = () => {
      if (document.hidden) gesture.interrupt()
    }
    window.addEventListener('blur', gesture.interrupt)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', gesture.interrupt)
      document.removeEventListener('visibilitychange', hidden)
      disconnect()
    }
  }, [gesture])
  return gesture
}
