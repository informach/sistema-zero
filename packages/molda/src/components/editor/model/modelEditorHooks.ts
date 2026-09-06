import type { RefObject } from 'react'
import { useEffect } from 'react'
import type { MoldaModelAsset, ShapeId, Vec3 } from '../../../core/model'
import type { BrushSize } from '../../../paint/skinPaint'
import type { EditorStore } from '../../../state/editorStore'
import type { MeshSelectMode, SessionStore } from '../../../state/sessionStore'
import type { MoldaViewportLike } from '../../../viewport/types'
import { isMoldaDialogOpen } from '../../ui/Dialog'

const THUMB_DELAY_MS = 700

/** ←→ no X, ↑↓ no Z (↑ = para o fundo), PageUp/PageDown no Y. */
const ARROWS: Record<string, Vec3> = {
  arrowleft: [-1, 0, 0],
  arrowright: [1, 0, 0],
  arrowup: [0, 0, -1],
  arrowdown: [0, 0, 1],
  pageup: [0, 1, 0],
  pagedown: [0, -1, 0],
}

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
  /** "Editar malha": abrir/fechar, o que o toque escolhe (1/2/3) e apagar a seleção. */
  editMesh: () => void
  deleteMeshSelection: () => void
  /** Setas: empurram a peça (ou os pontos, no Editar malha) em ENCAIXES; Shift = 5. */
  nudge: (steps: Vec3, repeat: boolean) => void
  /** Soltar a seta fecha o gesto da tecla segurada (um desfazer só). */
  endNudge: () => void
  /** Ctrl+A no Editar malha: todos os pontos (o caminho do teclado para escolher). */
  selectAllVertices: () => void
}): void {
  const {
    session,
    add,
    duplicate,
    remove,
    toggleMirror,
    editMesh,
    deleteMeshSelection,
    nudge,
    endNudge,
    selectAllVertices,
  } = options
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented || isMoldaDialogOpen() || isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      const state = session.getState()
      if (key === 'escape' && state.placingShape) {
        state.setPlacingShape(null)
        return
      }
      const arrow = ARROWS[key]
      if (arrow && state.mode === 'build') {
        // Sem nada escolhido a seta é do navegador (rolar a coluna de painéis).
        const hasSelection = state.meshEditId
          ? state.meshVertices.length > 0
          : state.selectedId !== null
        if (!hasSelection) return
        event.preventDefault()
        const k = event.shiftKey ? 5 : 1
        nudge([arrow[0] * k, arrow[1] * k, arrow[2] * k], event.repeat)
        return
      }
      if (state.meshEditId) {
        if ((event.ctrlKey || event.metaKey) && key === 'a') {
          event.preventDefault()
          selectAllVertices()
          return
        }
        if (key === 'escape' || key === 'e') {
          state.exitMeshEdit()
          return
        }
        if (key === '1' || key === '2' || key === '3') {
          const modes: MeshSelectMode[] = ['vertex', 'edge', 'face']
          state.setMeshSelectMode(modes[Number(key) - 1] ?? 'vertex')
          return
        }
        if (key === 'delete' || key === 'backspace') {
          event.preventDefault()
          deleteMeshSelection()
          return
        }
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
        else if (key === 'r') state.setPaintTool('rotateSkin')
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
      else if (key === 'e') editMesh()
      else if (key === 'm') toggleMirror()
      else if (key === 'delete' || key === 'backspace') {
        event.preventDefault()
        remove()
      }
    }
    function onKeyUp(event: KeyboardEvent): void {
      if (ARROWS[event.key.toLowerCase()]) endNudge()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [
    add,
    duplicate,
    remove,
    toggleMirror,
    editMesh,
    deleteMeshSelection,
    nudge,
    endNudge,
    selectAllVertices,
    session,
  ])
}
