/**
 * Preferências VIVAS da sessão de edição (ferramenta, cor, zoom, onion,
 * animação/quadro selecionados) — por instância do editor, não persistidas.
 * Separada do editorStore de propósito: mudar de ferramenta não é edição
 * (não suja o autosave nem entra no undo).
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { PintaBitmap } from '../core/project'
import type { PixelToolId } from '../pixel/tools'
import type { TileStamp } from '../tiles/stamp'

/**
 * Ferramentas da sessão: as do motor pixel + a Mão (navegação, mapa/vetor) + a
 * Seleção (recorta/move um retângulo — vive no PixelCanvas, não no motor puro).
 */
export type PintaSessionTool = PixelToolId | 'pan' | 'select'

export const ZOOM_LEVELS = [2, 4, 6, 8, 12, 16, 24, 32] as const

/**
 * Zoom do editor VETORIAL: o palco desenha em px de documento (não em células),
 * então faz sentido reduzir (<1) para documentos grandes; sprites pequenos
 * (32px) ainda alcançam um palco confortável no topo da escala.
 */
export const VECTOR_ZOOM_LEVELS = [0.25, 0.5, 1, 2, 4, 8, 12, 16] as const

/**
 * Zoom do editor de MAPA: o fator multiplica o tileSize por célula — com
 * níveis próprios o mostrador diz a verdade (antes um "8×" desenhava a 2×).
 */
export const TILEMAP_ZOOM_LEVELS = [0.5, 1, 2, 4, 8] as const

export interface PintaSessionState {
  tool: PintaSessionTool
  /** Índice de paleta selecionado (1 = primeira cor visível). */
  color: number
  brushSize: number
  mirrorX: boolean
  /** Simetria de cima e de baixo (espelha no eixo horizontal central). */
  mirrorY: boolean
  filled: boolean
  /** Grade de pixels por cima do desenho (só rende em zoom alto). */
  showGrid: boolean
  zoom: number
  /** Degraus de zoom do editor (pixel e vetor usam escalas diferentes). */
  zoomLevels: readonly number[]
  onion: boolean
  playing: boolean
  /** Animação/quadro em edição (sprites; null = a primeira do asset). */
  animationId: string | null
  frameIndex: number
  /**
   * Carimbo de tiles ATIVO no editor de mapa (bloco multi-tile pego no picker
   * ou "copiar pedaço"); `null` = pinta uma peça só (`frameIndex`). Vive na
   * sessão porque pegar um carimbo não é edição.
   */
  stamp: TileStamp | null
  /**
   * Área de transferência do PIXEL (copiar/colar um pedaço do desenho). Vive na
   * sessão — e não no canvas — para sobreviver à troca de quadro/animação:
   * copiar no quadro 1 e colar no 2 é o caso de uso da animação.
   */
  clipboard: PintaBitmap | null
  /** Auto-expandir: pintar na borda do mapa faz ele crescer (off por padrão). */
  autoExpand: boolean

  setTool(tool: PintaSessionTool): void
  setColor(color: number): void
  setBrushSize(size: number): void
  toggleMirror(): void
  toggleMirrorY(): void
  toggleFilled(): void
  toggleGrid(): void
  setZoom(zoom: number): void
  zoomIn(): void
  zoomOut(): void
  toggleOnion(): void
  setPlaying(playing: boolean): void
  selectAnimation(id: string): void
  selectFrame(index: number): void
  setStamp(stamp: TileStamp | null): void
  setClipboard(bitmap: PintaBitmap | null): void
  toggleAutoExpand(): void
}

export type PintaSessionStore = StoreApi<PintaSessionState>

function nextZoom(levels: readonly number[], current: number, direction: 1 | -1): number {
  const index = levels.findIndex((level) => level >= current)
  const at = index === -1 ? levels.length - 1 : index
  const target = Math.min(Math.max(at + direction, 0), levels.length - 1)
  return levels[target] ?? 8
}

export function createSessionStore(initial?: Partial<PintaSessionState>): PintaSessionStore {
  return createStore<PintaSessionState>((set) => ({
    tool: 'pencil',
    color: 1,
    brushSize: 1,
    mirrorX: false,
    mirrorY: false,
    filled: false,
    showGrid: true,
    zoom: 8,
    zoomLevels: ZOOM_LEVELS,
    onion: false,
    playing: true,
    animationId: null,
    frameIndex: 0,
    stamp: null,
    clipboard: null,
    autoExpand: false,
    ...initial,

    setTool: (tool) => set({ tool }),
    setColor: (color) => set({ color }),
    setBrushSize: (size) => set({ brushSize: Math.min(Math.max(Math.round(size), 1), 3) }),
    toggleMirror: () => set((state) => ({ mirrorX: !state.mirrorX })),
    toggleMirrorY: () => set((state) => ({ mirrorY: !state.mirrorY })),
    toggleFilled: () => set((state) => ({ filled: !state.filled })),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.25), 48) }),
    zoomIn: () => set((state) => ({ zoom: nextZoom(state.zoomLevels, state.zoom, 1) })),
    zoomOut: () => set((state) => ({ zoom: nextZoom(state.zoomLevels, state.zoom, -1) })),
    toggleOnion: () => set((state) => ({ onion: !state.onion })),
    setPlaying: (playing) => set({ playing }),
    selectAnimation: (id) => set({ animationId: id, frameIndex: 0 }),
    selectFrame: (index) => set({ frameIndex: Math.max(index, 0) }),
    setStamp: (stamp) => set({ stamp }),
    setClipboard: (clipboard) => set({ clipboard }),
    toggleAutoExpand: () => set((state) => ({ autoExpand: !state.autoExpand })),
  }))
}
