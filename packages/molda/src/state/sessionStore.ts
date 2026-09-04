/**
 * O estado de SESSÃO do editor de modelo: modo (Montar/Pintar), ferramenta
 * das alças, seleção, grade e o que a criança segura no Pintar (ferramenta,
 * cor, tamanho do lápis, espelho de pintura). Não entra no desfazer nem no
 * disco. Um store por criação aberta.
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { ShapeId } from '../core/model'
import type { BrushSize } from '../paint/skinPaint'
import type { PaintTool } from '../paint/stroke'

export type TransformTool = 'move' | 'rotate' | 'scale'
export type EditorMode = 'build' | 'paint'

export interface SessionState {
  mode: EditorMode
  tool: TransformTool
  selectedId: string | null
  gridVisible: boolean
  paintTool: PaintTool
  paintColor: number
  brushSize: BrushSize
  mirrorPaint: boolean
  placingShape: ShapeId | null
}

export interface SessionActions {
  setMode(mode: EditorMode): void
  setTool(tool: TransformTool): void
  select(id: string | null): void
  toggleGrid(): void
  setPaintTool(tool: PaintTool): void
  setPaintColor(index: number): void
  setBrushSize(size: BrushSize): void
  toggleMirrorPaint(): void
  setPlacingShape(shape: ShapeId | null): void
}

export type SessionStore = StoreApi<SessionState & SessionActions>

export function createSessionStore(initial: Partial<SessionState> = {}): SessionStore {
  return createStore<SessionState & SessionActions>((set) => ({
    mode: 'build',
    tool: 'move',
    selectedId: null,
    gridVisible: true,
    paintTool: 'pencil',
    paintColor: 1,
    brushSize: 1,
    mirrorPaint: false,
    placingShape: null,
    ...initial,
    setMode: (mode) => set({ mode }),
    setTool: (tool) => set({ tool }),
    select: (selectedId) => set({ selectedId }),
    toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
    setPaintTool: (paintTool) => set({ paintTool }),
    setPaintColor: (paintColor) => set({ paintColor }),
    setBrushSize: (brushSize) => set({ brushSize }),
    toggleMirrorPaint: () => set((state) => ({ mirrorPaint: !state.mirrorPaint })),
    setPlacingShape: (placingShape) => set({ placingShape }),
  }))
}
