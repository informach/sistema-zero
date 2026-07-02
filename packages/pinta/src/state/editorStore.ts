/**
 * Store do EDITOR por asset aberto (factory): o asset vivo + undo/redo por
 * snapshots (`core/history.ts`) + autosave debounced (~1s) com flush explícito
 * (pagehide/unmount/voltar). O `persist` é injetado (testes passam um fake; a
 * produção usa `persistAsset`), e `onSaved` deixa a galeria absorver o asset
 * atualizado sem reler o disco.
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { bitmapBytes, createHistory } from '../core/history'
import type { PintaAsset, PintaBitmap } from '../core/project'
import type { VectorShape } from '../vector/model'

/**
 * Bytes aproximados de um shape: a base cobre os campos fixos; path/texto/
 * polígono carregam payload variável (um `d` de pincel chega a 20k chars) —
 * sem isso o orçamento do undo reteria MUITO mais memória do que estima.
 */
function shapeBytes(shape: VectorShape): number {
  let bytes = 128
  if (shape.type === 'path') bytes += shape.d.length * 2
  else if (shape.type === 'text') bytes += shape.text.length * 2
  else if (shape.type === 'polygon') bytes += shape.points.length * 16
  return bytes
}

function shapesBytes(shapes: VectorShape[]): number {
  return shapes.reduce((sum, shape) => sum + shapeBytes(shape), 0)
}

export type PintaSaveState = 'saved' | 'saving' | 'error'

export interface PintaEditorState {
  asset: PintaAsset
  saveState: PintaSaveState
  canUndo: boolean
  canRedo: boolean

  /** Aplica uma edição commitada: grava história + agenda autosave. */
  commit(next: PintaAsset): void
  /** Substitui SEM entrada de undo (ex.: rename vindo da galeria). */
  replace(next: PintaAsset): void
  /**
   * Fecha um gesto de VÁRIOS passos aplicados via `replace` (ex.: arrastar
   * pintando células do tilemap): grava o snapshot INICIAL do gesto no undo —
   * desfazer volta ao antes do arrasto inteiro, não célula a célula.
   */
  commitGesture(base: PintaAsset): void
  undo(): void
  redo(): void
  /** Salva imediatamente o que estiver pendente. Resolve mesmo em erro. */
  flush(): Promise<void>
}

export type PintaEditorStore = StoreApi<PintaEditorState>

/** Bytes aproximados de um asset (payload dominante = bitmaps). */
export function assetBytes(asset: PintaAsset): number {
  const bitmaps: PintaBitmap[] = []
  switch (asset.kind) {
    case 'pixel-sprite':
      for (const animation of asset.animations) bitmaps.push(...animation.frames)
      break
    case 'pixel-background':
      bitmaps.push(asset.bitmap)
      break
    case 'tileset':
      bitmaps.push(...asset.tiles)
      break
    case 'tilemap':
      return asset.layers.reduce((sum, layer) => sum + layer.cells.byteLength + 64, 128)
    case 'vector-background':
      return 256 + shapesBytes(asset.shapes)
    case 'vector-sprite':
      return (
        256 +
        asset.animations.reduce(
          (sum, animation) =>
            sum + animation.frames.reduce((s, frame) => s + shapesBytes(frame), 64),
          0,
        )
      )
    case 'vector-tileset':
      return 256 + asset.tiles.reduce((sum, tile) => sum + shapesBytes(tile), 64)
  }
  return bitmaps.reduce((sum, bitmap) => sum + bitmapBytes(bitmap), 128)
}

// Encurtável nos testes (sem fake timers no bun:test — mesmo trade-off do studio).
let autosaveDelayMs = 1000

export function setAutosaveDelayForTests(ms: number): void {
  autosaveDelayMs = ms
}

export function createEditorStore(options: {
  asset: PintaAsset
  persist: (asset: PintaAsset) => Promise<void>
  onSaved?: (asset: PintaAsset) => void
}): PintaEditorStore {
  const history = createHistory<PintaAsset>({ sizeOf: assetBytes })
  let timer: ReturnType<typeof setTimeout> | null = null
  let saving: Promise<void> | null = null
  let dirty = false

  const store = createStore<PintaEditorState>((set, get) => {
    async function saveNow(): Promise<void> {
      if (!dirty) return
      // Uma gravação por vez; se outra chegar no meio, o dirty re-agenda no fim.
      if (saving) {
        await saving
        if (!dirty) return
      }
      dirty = false
      const snapshot = get().asset
      set({ saveState: 'saving' })
      saving = options
        .persist(snapshot)
        .then(() => {
          // Editou de novo enquanto salvava? Continua sujo, o timer re-salva.
          set({ saveState: dirty ? 'saving' : 'saved' })
          options.onSaved?.(snapshot)
        })
        .catch(() => {
          dirty = true
          set({ saveState: 'error' })
        })
        .finally(() => {
          saving = null
        })
      await saving
    }

    function scheduleAutosave(): void {
      dirty = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void saveNow()
      }, autosaveDelayMs)
    }

    function apply(next: PintaAsset, recordHistory: boolean): void {
      const current = get().asset
      if (recordHistory) history.record(current)
      set({
        asset: { ...next, updatedAt: Date.now() } as PintaAsset,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      })
      scheduleAutosave()
    }

    return {
      asset: options.asset,
      saveState: 'saved',
      canUndo: false,
      canRedo: false,

      commit(next) {
        apply(next, true)
      },

      replace(next) {
        apply(next, false)
      },

      commitGesture(base) {
        if (base === get().asset) return
        history.record(base)
        set({ canUndo: history.canUndo(), canRedo: history.canRedo() })
        scheduleAutosave()
      },

      undo() {
        const prev = history.undo(get().asset)
        if (!prev) return
        set({ asset: prev, canUndo: history.canUndo(), canRedo: history.canRedo() })
        scheduleAutosave()
      },

      redo() {
        const next = history.redo(get().asset)
        if (!next) return
        set({ asset: next, canUndo: history.canUndo(), canRedo: history.canRedo() })
        scheduleAutosave()
      },

      async flush() {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        await saveNow()
      },
    }
  })

  return store
}
