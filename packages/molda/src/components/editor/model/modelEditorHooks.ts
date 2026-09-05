import type { RefObject } from 'react'
import { useEffect } from 'react'
import type { MoldaModelAsset, ShapeId } from '../../../core/model'
import type { BrushSize } from '../../../paint/skinPaint'
import type { EditorStore } from '../../../state/editorStore'
import type { SessionStore } from '../../../state/sessionStore'
import type { MoldaViewportLike } from '../../../viewport/types'
import { isMoldaDialogOpen } from '../../ui/Dialog'

const THUMB_DELAY_MS = 700

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function useModelThumbnail(
  editor: EditorStore,
  viewport: MoldaViewportLike | null,
  gestureBefore: RefObject<MoldaModelAsset | null>,
): void {
  useEffect(() => {
    if (!viewport) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = (): void => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        if (gestureBefore.current) {
          schedule()
          return
        }
        editor.getState().setThumb(viewport.renderThumb() ?? undefined)
      }, THUMB_DELAY_MS)
    }
    const unsubscribe = editor.subscribe((state, previous) => {
      if (state.asset.kind !== 'model' || previous.asset.kind !== 'model') return
      if (
        state.asset.parts !== previous.asset.parts ||
        state.asset.paletteId !== previous.asset.paletteId ||
        state.asset.extraColors !== previous.asset.extraColors ||
        state.asset.customPalette !== previous.asset.customPalette
      ) {
        schedule()
      }
    })
    if (!editor.getState().asset.thumb) schedule()
    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [viewport, editor, gestureBefore])
}

export function useModelEditorShortcuts(options: {
  session: SessionStore
  add: (shape: ShapeId) => void
  duplicate: () => void
  remove: () => void
  toggleMirror: () => void
}): void {
  const { session, add, duplicate, remove, toggleMirror } = options
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented || isMoldaDialogOpen() || isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      const state = session.getState()
      if (key === 'escape' && state.placingShape) {
        state.setPlacingShape(null)
        return
      }
      if ((event.ctrlKey || event.metaKey) && key === 'd') {
        event.preventDefault()
        if (state.mode === 'build') duplicate()
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (state.mode === 'paint') {
        if (key === 'p') state.setPaintTool('pencil')
        else if (key === 'e') state.setPaintTool('eraser')
        else if (key === 'g') state.setPaintTool('fillFace')
        else if (key === 'i') state.setPaintTool('picker')
        else if (key === 'm') state.toggleMirrorPaint()
        else if (key === '1' || key === '2' || key === '3') {
          state.setBrushSize(Number(key) as BrushSize)
        }
        return
      }
      if (key === 'v') state.setTool('move')
      else if (key === 'r') state.setTool('rotate')
      else if (key === 't') state.setTool('scale')
      else if (key === 'b') add('box')
      else if (key === 'm') toggleMirror()
      else if (key === 'delete' || key === 'backspace') {
        event.preventDefault()
        remove()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [add, duplicate, remove, toggleMirror, session])
}
