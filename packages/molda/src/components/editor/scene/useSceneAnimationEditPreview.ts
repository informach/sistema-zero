import { useEffect, useMemo } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { SceneAnimationEditPreview } from '../../../state/SceneAnimationEditPreview'
import type { SceneAnimationPlayer } from '../../../state/SceneAnimationPlayer'
import { isMoldaDialogOpen } from '../../ui/Dialog'
import type { useSceneContextTransition } from './useSceneContextTransition'

export function useSceneAnimationEditPreview(
  editor: EditorStore<MoldaSceneDocument>,
  player: SceneAnimationPlayer,
  context: ReturnType<typeof useSceneContextTransition>,
  allowed: boolean,
) {
  const preview = useMemo(() => new SceneAnimationEditPreview(editor, player), [editor, player])
  useEffect(() => preview.connect(), [preview])
  useEffect(() => {
    if (!allowed) preview.cancel()
  }, [allowed, preview])
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) preview.cancel()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !preview.getSnapshot().pending || isMoldaDialogOpen()) return
      event.preventDefault()
      event.stopPropagation()
      preview.cancel()
    }
    window.addEventListener('blur', preview.cancel)
    window.addEventListener('keydown', onEscape, true)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('webglcontextlost', preview.cancel, true)
    return () => {
      window.removeEventListener('blur', preview.cancel)
      window.removeEventListener('keydown', onEscape, true)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('webglcontextlost', preview.cancel, true)
    }
  }, [preview])
  const register = context.register
  useEffect(
    () =>
      register('animation-edit', () =>
        preview.getSnapshot().pending
          ? {
              title: 'Este conjunto de poses está em prévia',
              applyLabel: 'Aplicar ajuste',
              canApply: !preview.getSnapshot().error,
              apply: preview.confirm,
              discard: preview.cancel,
              pause: () => player.pause(),
            }
          : null,
      ),
    [register, preview, player],
  )
  return preview
}
