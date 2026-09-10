import { useEffect, useState } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { SceneAnimationPlayer } from '../../../state/SceneAnimationPlayer'

export function useSceneAnimationPlayer(editor: EditorStore<MoldaSceneDocument>) {
  const [player] = useState(
    () =>
      new SceneAnimationPlayer({
        now: () => performance.now(),
        request: (callback) => requestAnimationFrame(callback),
        cancel: (id) => cancelAnimationFrame(id),
      }),
  )
  useEffect(() => {
    const unsubscribe = editor.subscribe((state, before) => {
      // Poses own the exact document object, including thumbnail-only replacements.
      if (state.asset === before.asset) return
      if (player.getSnapshot().source?.preview) {
        player.setClip(null, null)
        return
      }
      const id = player.getSnapshot().source?.clip.id
      if (!id) return
      const clip = state.asset.animations?.find((clip) => clip.id === id)
      try {
        player.setClip(clip ? state.asset : null, clip?.id ?? null)
      } catch (error) {
        player.setClip(null, null)
        player.reportError(error)
      }
    })
    const hidden = () => {
      if (document.hidden) player.pause()
    }
    window.addEventListener('blur', player.pause)
    document.addEventListener('visibilitychange', hidden)
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const reduce = () => {
      if (motion?.matches) player.pause()
    }
    motion?.addEventListener('change', reduce)
    return () => {
      unsubscribe()
      window.removeEventListener('blur', player.pause)
      document.removeEventListener('visibilitychange', hidden)
      motion?.removeEventListener('change', reduce)
      player.setClip(null, null)
    }
  }, [editor, player])
  return player
}
