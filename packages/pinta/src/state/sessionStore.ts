/**
 * Preferências VIVAS da sessão de edição (ferramenta, cor, zoom, onion,
 * animação/quadro selecionados) — por instância do editor, não persistidas.
 * Separada do editorStore de propósito: mudar de ferramenta não é edição
 * (não suja o autosave nem entra no undo).
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { PixelToolId } from '../pixel/tools'

export const ZOOM_LEVELS = [2, 4, 6, 8, 12, 16, 24, 32] as const

export interface PintaSessionState {
  tool: PixelToolId
  /** Índice de paleta selecionado (1 = primeira cor visível). */
  color: number
  brushSize: number
  mirrorX: boolean
  filled: boolean
  zoom: number
  onion: boolean
  playing: boolean
  /** Animação/quadro em edição (sprites; null = a primeira do asset). */
  animationId: string | null
  frameIndex: number

  setTool(tool: PixelToolId): void
  setColor(color: number): void
  setBrushSize(size: number): void
  toggleMirror(): void
  toggleFilled(): void
  setZoom(zoom: number): void
  zoomIn(): void
  zoomOut(): void
  toggleOnion(): void
  setPlaying(playing: boolean): void
  selectAnimation(id: string): void
  selectFrame(index: number): void
}

export type PintaSessionStore = StoreApi<PintaSessionState>

function nextZoom(current: number, direction: 1 | -1): number {
  const index = ZOOM_LEVELS.findIndex((level) => level >= current)
  const at = index === -1 ? ZOOM_LEVELS.length - 1 : index
  const target = Math.min(Math.max(at + direction, 0), ZOOM_LEVELS.length - 1)
  return ZOOM_LEVELS[target] ?? 8
}

export function createSessionStore(initial?: Partial<PintaSessionState>): PintaSessionStore {
  return createStore<PintaSessionState>((set) => ({
    tool: 'pencil',
    color: 1,
    brushSize: 1,
    mirrorX: false,
    filled: false,
    zoom: 8,
    onion: false,
    playing: true,
    animationId: null,
    frameIndex: 0,
    ...initial,

    setTool: (tool) => set({ tool }),
    setColor: (color) => set({ color }),
    setBrushSize: (size) => set({ brushSize: Math.min(Math.max(Math.round(size), 1), 3) }),
    toggleMirror: () => set((state) => ({ mirrorX: !state.mirrorX })),
    toggleFilled: () => set((state) => ({ filled: !state.filled })),
    setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 1), 48) }),
    zoomIn: () => set((state) => ({ zoom: nextZoom(state.zoom, 1) })),
    zoomOut: () => set((state) => ({ zoom: nextZoom(state.zoom, -1) })),
    toggleOnion: () => set((state) => ({ onion: !state.onion })),
    setPlaying: (playing) => set({ playing }),
    selectAnimation: (id) => set({ animationId: id, frameIndex: 0 }),
    selectFrame: (index) => set({ frameIndex: Math.max(index, 0) }),
  }))
}
