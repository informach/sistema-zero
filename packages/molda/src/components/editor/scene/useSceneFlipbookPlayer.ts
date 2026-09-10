import { useEffect, useState } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { SceneFlipbookPlayer } from '../../../state/SceneFlipbookPlayer'

export function useSceneFlipbookPlayer(editor: EditorStore<MoldaSceneDocument>) {
  const [player] = useState(
    () =>
      new SceneFlipbookPlayer({
        now: () => performance.now(),
        request: (callback) => requestAnimationFrame(callback),
        cancel: (id) => cancelAnimationFrame(id),
      }),
  )
  useEffect(() => {
    const unsubscribe = editor.subscribe((state, before) => {
      if (state.contentRevision === before.contentRevision) return
      player.pause()
      const id = player.getSnapshot().source?.imageId
      player.setImage(state.asset.images.find((image) => image.id === id) ?? null)
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
      player.setImage(null)
    }
  }, [editor, player])
  return player
}
