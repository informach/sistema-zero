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
/** O que um toque escolhe dentro da malha: Pontos, Arestas ou Faces. */
export type MeshSelectMode = 'vertex' | 'edge' | 'face'

export interface SessionState {
  mode: EditorMode
  tool: TransformTool
  selectedId: string | null
  /**
   * Seleção múltipla de peças: as SOMADAS à principal (`selectedId`), sem repetir e
   * nunca a própria. Alça no centro do grupo; mover/apagar/duplicar valem para todas.
   */
  extraIds: string[]
  /** "Somar à seleção" das PEÇAS (o Shift do desktop, como botão para o toque). */
  partsAdditive: boolean
  gridVisible: boolean
  /** "Ver arestas": o contorno de todas as peças. */
  edgesVisible: boolean
  paintTool: PaintTool
  paintColor: number
  brushSize: BrushSize
  mirrorPaint: boolean
  placingShape: ShapeId | null
  /**
   * "Editar malha": a peça de malha aberta (sub-modo do Montar). A seleção mora
   * AQUI, fora do asset (ideia do Blockbench): os VÉRTICES são a lista mestra e
   * arestas/faces derivam deles (`model/meshSelection.ts`).
   */
  meshEditId: string | null
  meshSelectMode: MeshSelectMode
  meshVertices: string[]
  /** "Somar à seleção" (o Shift do desktop, como botão para o toque). */
  meshAdditive: boolean
}

export interface SessionActions {
  setMode(mode: EditorMode): void
  setTool(tool: TransformTool): void
  select(id: string | null): void
  /** Soma/tira uma peça da seleção (a principal fica; sem principal, vira a principal). */
  toggleExtra(id: string): void
  /** Escolhe com a régua do momento: somar (Shift/botão) ou trocar. */
  pick(id: string | null, additive: boolean): void
  togglePartsAdditive(): void
  setExtraIds(ids: string[]): void
  toggleGrid(): void
  toggleEdges(): void
  setPaintTool(tool: PaintTool): void
  setPaintColor(index: number): void
  setBrushSize(size: BrushSize): void
  toggleMirrorPaint(): void
  setPlacingShape(shape: ShapeId | null): void
  enterMeshEdit(id: string): void
  exitMeshEdit(): void
  setMeshSelectMode(mode: MeshSelectMode): void
  setMeshVertices(keys: string[]): void
  toggleMeshAdditive(): void
}

export type SessionStore = StoreApi<SessionState & SessionActions>

export function createSessionStore(initial: Partial<SessionState> = {}): SessionStore {
  return createStore<SessionState & SessionActions>((set, get) => ({
    mode: 'build',
    tool: 'move',
    selectedId: null,
    extraIds: [],
    partsAdditive: false,
    gridVisible: true,
    edgesVisible: false,
    paintTool: 'pencil',
    paintColor: 1,
    brushSize: 1,
    mirrorPaint: false,
    placingShape: null,
    meshEditId: null,
    meshSelectMode: 'vertex',
    meshVertices: [],
    meshAdditive: false,
    ...initial,
    // Trocar de modo ou de peça fecha a edição de malha (a seleção de vértices não
    // sobrevive a outra peça).
    setMode: (mode) =>
      set({ mode, meshEditId: null, meshVertices: [], extraIds: [], partsAdditive: false }),
    setTool: (tool) => set({ tool }),
    select: (selectedId) =>
      set((state) =>
        state.meshEditId && state.meshEditId !== selectedId
          ? { selectedId, meshEditId: null, meshVertices: [], extraIds: [] }
          : { selectedId, extraIds: [] },
      ),
    toggleExtra: (id) =>
      set((state) => {
        if (!state.selectedId) return { selectedId: id, extraIds: [] }
        if (state.selectedId === id) {
          // Tirar a principal: a próxima somada assume.
          const [next, ...rest] = state.extraIds
          return { selectedId: next ?? null, extraIds: rest }
        }
        const extraIds = state.extraIds.includes(id)
          ? state.extraIds.filter((item) => item !== id)
          : [...state.extraIds, id]
        return { extraIds, meshEditId: null, meshVertices: [] }
      }),
    pick: (id, additive) => {
      const state = get()
      if (additive && id) state.toggleExtra(id)
      else if (!(additive && !id)) state.select(id)
    },
    togglePartsAdditive: () => set((state) => ({ partsAdditive: !state.partsAdditive })),
    setExtraIds: (extraIds) => set({ extraIds }),
    enterMeshEdit: (id) =>
      set({ selectedId: id, meshEditId: id, meshVertices: [], placingShape: null, extraIds: [] }),
    exitMeshEdit: () => set({ meshEditId: null, meshVertices: [] }),
    setMeshSelectMode: (meshSelectMode) => set({ meshSelectMode }),
    setMeshVertices: (meshVertices) => set({ meshVertices }),
    toggleMeshAdditive: () => set((state) => ({ meshAdditive: !state.meshAdditive })),
    toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
    toggleEdges: () => set((state) => ({ edgesVisible: !state.edgesVisible })),
    setPaintTool: (paintTool) => set({ paintTool }),
    setPaintColor: (paintColor) => set({ paintColor }),
    setBrushSize: (brushSize) => set({ brushSize }),
    toggleMirrorPaint: () => set((state) => ({ mirrorPaint: !state.mirrorPaint })),
    setPlacingShape: (placingShape) => set({ placingShape }),
  }))
}
