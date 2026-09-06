import type { RefObject } from 'react'
import { useEffect } from 'react'
import type { MoldaModelAsset, ShapeId, Vec3 } from '../../../core/model'
import type { EditorStore } from '../../../state/editorStore'
import type { MeshSelectMode, SessionStore } from '../../../state/sessionStore'
import type { MoldaViewportLike } from '../../../viewport/types'
import { isMoldaDialogOpen } from '../../ui/Dialog'
import { isTypingTarget } from '../../ui/interaction'
import { commandForShortcut, type ModelCommandContext } from './commandRegistry'

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
  /** G liga; G de novo ou Esc cancela o fluxo de dois toques do “Grudar”. */
  toggleSnap: () => void
  cancelSnap: () => void
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
    toggleSnap,
    cancelSnap,
  } = options
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented || isMoldaDialogOpen() || isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      const state = session.getState()
      if (key === 'escape' && state.tool === 'snap') {
        cancelSnap()
        return
      }
      if (key === 'escape' && state.placingShape) {
        state.setPlacingShape(null)
        return
      }
      const arrow = ARROWS[key]
      if (arrow && state.mode === 'build') {
        // Sem nada escolhido a seta é do navegador (rolar a coluna de painéis).
        const hasSelection = state.meshEditId
          ? state.meshSelection.length > 0
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
      }

      const context: ModelCommandContext = state.meshEditId
        ? `mesh-${state.meshSelectMode}`
        : state.mode
      const command = commandForShortcut(context, event)
      if (!command) return

      if (state.meshEditId) {
        const modes: Partial<Record<typeof command, MeshSelectMode>> = {
          'mesh.mode.vertex': 'vertex',
          'mesh.mode.edge': 'edge',
          'mesh.mode.face': 'face',
        }
        const nextMode = modes[command]
        if (nextMode) state.setMeshSelectMode(nextMode)
        else if (command === 'mesh.done') state.exitMeshEdit()
        else if (command === 'mesh.delete') {
          event.preventDefault()
          deleteMeshSelection()
        }
        return
      }

      if (state.mode === 'paint') {
        if (command === 'paint.pencil') state.setPaintTool('pencil')
        else if (command === 'paint.eraser') state.setPaintTool('eraser')
        else if (command === 'paint.fill-face') state.setPaintTool('fillFace')
        else if (command === 'paint.picker') state.setPaintTool('picker')
        else if (command === 'paint.rotate') state.setPaintTool('rotateSkin')
        else if (command === 'paint.face-editor') state.setPaintTool('faceEditor')
        else if (command === 'paint.mirror') state.toggleMirrorPaint()
        else if (command === 'paint.brush-1') state.setBrushSize(1)
        else if (command === 'paint.brush-2') state.setBrushSize(2)
        else if (command === 'paint.brush-3') state.setBrushSize(3)
        return
      }

      if (command === 'part.duplicate') {
        event.preventDefault()
        duplicate()
      } else if (command === 'tool.move' || command === 'tool.rotate' || command === 'tool.scale') {
        cancelSnap()
        state.setTool(
          command === 'tool.move' ? 'move' : command === 'tool.rotate' ? 'rotate' : 'scale',
        )
      } else if (command === 'tool.snap') toggleSnap()
      else if (command === 'add.box') add('box')
      else if (command === 'part.mesh') {
        cancelSnap()
        editMesh()
      } else if (command === 'build.mirror') toggleMirror()
      else if (command === 'part.remove') {
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
    toggleSnap,
    cancelSnap,
    session,
  ])
}
