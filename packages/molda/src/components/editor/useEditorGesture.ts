import { useMemo } from 'react'
import { createGestureCoordinator, type GestureToken } from '../../core/gesture'
import type { MoldaAsset } from '../../core/model'
import type { EditorStore } from '../../state/editorStore'

/** Continuous controls share the viewport's revision-checked gesture protocol. */
export function useEditorGesture<T extends MoldaAsset>(editor: EditorStore, current: () => T) {
  return useMemo(() => {
    let token: GestureToken<T> | null = null
    const gestures = createGestureCoordinator({
      current,
      revision: () => editor.getState().contentRevision,
      preview: (next: T) => editor.getState().replace(next),
      cancel: (before) => editor.getState().cancelGesture(before),
      commit: (before, after) => editor.getState().commitGesture(before, after),
    })
    function begin(): void {
      token ??= gestures.begin()
    }
    function finish(next: T): void {
      const active = token
      token = null
      if (active) gestures.commit(active, next)
    }
    function end(): void {
      finish(current())
    }
    return {
      begin,
      update(next: T): void {
        begin()
        if (token) gestures.preview(token, next)
      },
      end,
      finish,
      cancel(): void {
        const active = token
        token = null
        if (active) gestures.cancel(active)
      },
      commit(next: T): void {
        end()
        editor.getState().commit(next)
      },
    }
  }, [editor, current])
}
