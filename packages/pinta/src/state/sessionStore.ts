/**
 * Preferências VIVAS da sessão de edição (ferramenta, cor, zoom, onion,
 * animação/quadro selecionados) — por instância do editor, não persistidas.
 * Separada do editorStore de propósito: mudar de ferramenta não é edição
 * (não suja o autosave nem entra no undo).
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { TRANSPARENT_INDEX } from '../core/palette'
import type { PixelToolId } from '../pixel/tools'
import type { TileStamp } from '../tiles/stamp'
import { addGuide, type GuideAxis, moveGuide, removeGuide, type StageGuide } from '../vector/guides'

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

/** Qual das duas cores da caixa de ferramentas recebe o clique na paleta. */
export type PintaColorSlot = 'primary' | 'secondary'

export interface PintaSessionState {
  tool: PintaSessionTool
  /** Cor PRINCIPAL (botão esquerdo do mouse). Índice na paleta. */
  color: number
  /** Cor SECUNDÁRIA (botão direito do mouse). */
  colorSecondary: number
  /** Qual das duas está selecionada na caixa de ferramentas. */
  activeSlot: PintaColorSlot
  brushSize: number
  mirrorX: boolean
  /** Simetria de cima e de baixo (espelha no eixo horizontal central). */
  mirrorY: boolean
  filled: boolean
  /** Grade de pixels por cima do desenho (só rende em zoom alto). */
  showGrid: boolean
  /**
   * Réguas em cima e à esquerda do palco (só o editor de VETOR as desenha). Nascem
   * LIGADAS: ficam fora do papel, então não sujam o desenho como a grade sujaria.
   */
  showRulers: boolean
  /**
   * Linhas-guia do palco do VETOR (puxadas da régua). Moram na SESSÃO de propósito: valem só
   * enquanto o desenho está aberto, para TODOS os quadros/peças dele, e não entram no undo
   * (como a grade, não são edição do desenho). Só visuais: nada encaixa nelas.
   */
  guides: readonly StageGuide[]
  showGuides: boolean
  /** Travadas: não dá para arrastar nem apagar arrastando (para não mexer sem querer). */
  guidesLocked: boolean
  zoom: number
  /** Degraus de zoom do editor (pixel e vetor usam escalas diferentes). */
  zoomLevels: readonly number[]
  onion: boolean
  playing: boolean
  /** Animação/quadro em edição (sprites; null = a primeira do asset). */
  animationId: string | null
  frameIndex: number
  /**
   * CAMADA em edição (kinds de pixel com camadas; null = a de cima). Vive na
   * sessão — e não no editor — porque interage com quadro/onion/seleção, e
   * escolher camada não é edição do desenho (não entra no undo).
   */
  layerId: string | null
  /**
   * Carimbo de tiles ATIVO no editor de mapa (bloco multi-tile pego no picker
   * ou "copiar pedaço"); `null` = pinta uma peça só (`frameIndex`). Vive na
   * sessão porque pegar um carimbo não é edição.
   */
  stamp: TileStamp | null
  // A área de transferência (copiar/colar) NÃO mora mais aqui: subiu para o
  // `clipboardStore` do APLICATIVO (08/2026), para sobreviver a voltar à galeria e
  // abrir outro desenho — a sessão morre com o editor.
  /** Auto-expandir: pintar na borda do mapa faz ele crescer (off por padrão). */
  autoExpand: boolean

  setTool(tool: PintaSessionTool): void
  /** Define a cor PRINCIPAL (caminho histórico dos chamadores). */
  setColor(color: number): void
  setColorSecondary(color: number): void
  /** Escolhe qual cor a paleta vai pintar (a "selecionada" na caixa). */
  setActiveSlot(slot: PintaColorSlot): void
  /** Aplica uma cor da paleta no slot pedido (padrão: o ativo). */
  applyColor(color: number, slot?: PintaColorSlot): void
  /** Troca principal ↔ secundária (as setinhas da caixa de ferramentas). */
  swapColors(): void
  setBrushSize(size: number): void
  toggleMirror(): void
  toggleMirrorY(): void
  toggleFilled(): void
  toggleGrid(): void
  toggleRulers(): void
  /** Devolve `false` quando o teto de guias já foi atingido (nada é criado). */
  addGuide(axis: GuideAxis, pos: number, docSize: number): boolean
  moveGuide(id: string, pos: number, docSize: number): void
  removeGuide(id: string): void
  clearGuides(): void
  toggleGuides(): void
  toggleGuidesLock(): void
  setZoom(zoom: number): void
  zoomIn(): void
  zoomOut(): void
  toggleOnion(): void
  setPlaying(playing: boolean): void
  selectAnimation(id: string): void
  selectFrame(index: number): void
  selectLayer(id: string | null): void
  setStamp(stamp: TileStamp | null): void
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
    // Nasce no TRANSPARENTE: o botão direito começa apagando, que é o uso mais
    // natural da 2ª cor antes de a criança escolher uma.
    colorSecondary: TRANSPARENT_INDEX,
    activeSlot: 'primary',
    brushSize: 1,
    mirrorX: false,
    mirrorY: false,
    filled: false,
    showGrid: true,
    showRulers: true,
    guides: [],
    showGuides: true,
    guidesLocked: false,
    zoom: 8,
    zoomLevels: ZOOM_LEVELS,
    onion: false,
    playing: true,
    animationId: null,
    frameIndex: 0,
    layerId: null,
    stamp: null,
    autoExpand: false,
    ...initial,

    setTool: (tool) => set({ tool }),
    setColor: (color) => set({ color }),
    setColorSecondary: (color) => set({ colorSecondary: color }),
    setActiveSlot: (activeSlot) => set({ activeSlot }),
    applyColor: (color, slot) =>
      set((state) =>
        (slot ?? state.activeSlot) === 'secondary' ? { colorSecondary: color } : { color },
      ),
    swapColors: () =>
      set((state) => ({ color: state.colorSecondary, colorSecondary: state.color })),
    setBrushSize: (size) => set({ brushSize: Math.min(Math.max(Math.round(size), 1), 3) }),
    toggleMirror: () => set((state) => ({ mirrorX: !state.mirrorX })),
    toggleMirrorY: () => set((state) => ({ mirrorY: !state.mirrorY })),
    toggleFilled: () => set((state) => ({ filled: !state.filled })),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    toggleRulers: () => set((state) => ({ showRulers: !state.showRulers })),
    addGuide: (axis, pos, docSize) => {
      let added = false
      set((state) => {
        const guides = addGuide(state.guides, axis, pos, docSize)
        added = guides !== state.guides
        return added ? { guides } : {}
      })
      return added
    },
    moveGuide: (id, pos, docSize) =>
      set((state) => {
        const guides = moveGuide(state.guides, id, pos, docSize)
        return guides === state.guides ? {} : { guides }
      }),
    removeGuide: (id) =>
      set((state) => {
        const guides = removeGuide(state.guides, id)
        return guides === state.guides ? {} : { guides }
      }),
    clearGuides: () => set((state) => (state.guides.length === 0 ? {} : { guides: [] })),
    toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),
    toggleGuidesLock: () => set((state) => ({ guidesLocked: !state.guidesLocked })),
    setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.25), 48) }),
    zoomIn: () => set((state) => ({ zoom: nextZoom(state.zoomLevels, state.zoom, 1) })),
    zoomOut: () => set((state) => ({ zoom: nextZoom(state.zoomLevels, state.zoom, -1) })),
    toggleOnion: () => set((state) => ({ onion: !state.onion })),
    setPlaying: (playing) => set({ playing }),
    selectAnimation: (id) => set({ animationId: id, frameIndex: 0 }),
    selectFrame: (index) => set({ frameIndex: Math.max(index, 0) }),
    selectLayer: (id) => set({ layerId: id }),
    setStamp: (stamp) => set({ stamp }),
    toggleAutoExpand: () => set((state) => ({ autoExpand: !state.autoExpand })),
  }))
}
