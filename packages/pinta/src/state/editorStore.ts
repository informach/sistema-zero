/**
 * Store do EDITOR por asset aberto (factory): o asset vivo + undo/redo por
 * snapshots (`core/history.ts`) + autosave debounced (~1s) com flush explícito
 * (pagehide/unmount/voltar). O `persist` é injetado (testes passam um fake; a
 * produção usa `persistAssets`), e `onSaved` deixa a galeria absorver o snapshot
 * confirmado sem reler o disco.
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
  // A FIGURA carrega o PNG inteiro em base64: sem contá-lo, o orçamento de
  // 16 MB do undo erraria por ordens de grandeza (uma figura vale ~128 bytes
  // aqui e centenas de KB na memória) e a sessão comeria RAM em silêncio.
  else if (shape.type === 'image') bytes += shape.src.length * 2
  return bytes
}

function shapesBytes(shapes: VectorShape[]): number {
  return shapes.reduce((sum, shape) => sum + shapeBytes(shape), 0)
}

export type PintaSaveState = 'saved' | 'pending' | 'saving' | 'error'

export type PintaSaveResult = { ok: true } | { ok: false; error: string }

export interface PintaEditorState {
  asset: PintaAsset
  /** Último snapshot efetivamente confirmado pela persistência. */
  savedAsset: PintaAsset
  /** Assets ligados ao estado vivo do editor; `null` até o primeiro remapeamento. */
  linkedAssets: readonly PintaAsset[] | null
  /** Há uma revisão local que ainda não foi confirmada pela persistência. */
  dirty: boolean
  saveState: PintaSaveState
  saveError: string | null
  canUndo: boolean
  canRedo: boolean

  /** Aplica uma edição commitada: grava história + agenda autosave. */
  commit(next: PintaAsset): void
  /**
   * Como `commit`, mas a edição TAMBÉM remapeia ASSETS LIGADOS (ex.: editar uma
   * peça do tileset remapeia as células dos mapas dependentes). Os mapas entram
   * na MESMA entrada de undo: desfazer/refazer restaura o tileset E os mapas
   * juntos. `before` = mapas antes; `after` = mapas remapeados (já com
   * updatedAt). A galeria só recebe o conjunto depois da persistência confirmar.
   */
  commitLinked(next: PintaAsset, linked: { before: PintaAsset[]; after: PintaAsset[] }): void
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
  /** Salva imediatamente tudo que estiver pendente e informa se confirmou. */
  flush(): Promise<PintaSaveResult>
}

export type PintaEditorStore = StoreApi<PintaEditorState>

/**
 * Snapshot de undo. Além do asset editado, carrega os ASSETS LIGADOS remapeados
 * por aquela edição (mapas de um tileset) — assim o histórico restaura os dois
 * juntos. `linkedMaps` só é não-nulo depois de um `commitLinked`; edições comuns
 * (pincel etc.) carregam o `linkedMaps` corrente adiante (mapas não mudaram).
 */
interface EditorSnapshot {
  asset: PintaAsset
  linkedMaps: PintaAsset[] | null
}

/** Mescla revisões ligadas por id, preservando assets tocados em commits anteriores. */
function mergeLinkedAssets(
  current: readonly PintaAsset[] | null,
  changed: readonly PintaAsset[],
): PintaAsset[] {
  const merged = new Map((current ?? []).map((asset) => [asset.id, asset]))
  for (const asset of changed) merged.set(asset.id, asset)
  return [...merged.values()]
}

/** Bytes aproximados de um asset (payload dominante = bitmaps). */
export function assetBytes(asset: PintaAsset): number {
  const bitmaps: PintaBitmap[] = []
  switch (asset.kind) {
    case 'pixel-sprite':
      // Cada quadro é uma PILHA de cels (um por camada) — contar só o primeiro
      // subestimaria o snapshot em N× e furaria o orçamento do undo.
      for (const animation of asset.animations)
        for (const cels of animation.frames) bitmaps.push(...cels)
      break
    case 'pixel-background':
      bitmaps.push(...asset.cels)
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

/** Bytes do snapshot de undo = o asset + os mapas ligados (se houver). */
function snapshotBytes(snapshot: EditorSnapshot): number {
  let bytes = assetBytes(snapshot.asset)
  if (snapshot.linkedMaps) for (const map of snapshot.linkedMaps) bytes += assetBytes(map)
  return bytes
}

export function createEditorStore(options: {
  asset: PintaAsset
  persist: (asset: PintaAsset, linkedAssets: readonly PintaAsset[]) => Promise<void>
  onSaved?: (asset: PintaAsset, linkedAssets: readonly PintaAsset[]) => void
  /** Delay por instância; produção usa 1s, testes podem injetar um valor curto. */
  autosaveDelayMs?: number
  /** Traduz erros de persistência para o badge sem acoplar o store à UI. */
  persistErrorMessage?: (error: unknown) => string
}): PintaEditorStore {
  const history = createHistory<EditorSnapshot>({ sizeOf: snapshotBytes })
  let timer: ReturnType<typeof setTimeout> | null = null
  let saving: Promise<PintaSaveResult> | null = null
  let dirty = false
  // Mapas ligados ao ESTADO CORRENTE do asset (null até o 1º commitLinked).
  let currentLinked: PintaAsset[] | null = null

  const store = createStore<PintaEditorState>((set, get) => {
    async function saveNow(): Promise<PintaSaveResult> {
      // Drena revisões criadas durante uma gravação antes de confirmar o flush.
      // Em erro, para imediatamente e conserva `dirty=true` para o retry.
      while (true) {
        if (saving) {
          const result = await saving
          if (!result.ok) return result
          continue
        }
        if (!dirty) return { ok: true }

        dirty = false
        const snapshot = get().asset
        const linkedSnapshot = currentLinked ? [...currentLinked] : []
        set({ dirty: false, saveState: 'saving', saveError: null })

        const request = (async (): Promise<PintaSaveResult> => {
          try {
            await options.persist(snapshot, linkedSnapshot)
            options.onSaved?.(snapshot, linkedSnapshot)
            set(
              dirty
                ? { savedAsset: snapshot }
                : {
                    savedAsset: snapshot,
                    dirty: false,
                    saveState: 'saved',
                    saveError: null,
                  },
            )
            return { ok: true }
          } catch (error) {
            dirty = true
            const message =
              options.persistErrorMessage?.(error) ??
              (error instanceof Error ? error.message : String(error))
            set({ dirty: true, saveState: 'error', saveError: message })
            return { ok: false, error: message }
          }
        })()
        saving = request
        const result = await request
        if (saving === request) saving = null
        if (!result.ok) return result
      }
    }

    function scheduleAutosave(): void {
      dirty = true
      set({ dirty: true, saveState: 'pending', saveError: null })
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void saveNow()
      }, options.autosaveDelayMs ?? 1000)
    }

    function apply(
      next: PintaAsset,
      recordHistory: boolean,
      linked?: { before: PintaAsset[]; after: PintaAsset[] },
    ): void {
      const current = get().asset
      const previousLinked = linked
        ? mergeLinkedAssets(currentLinked, linked.before)
        : currentLinked
      if (recordHistory) {
        // O snapshot restaurado por undo carrega o ESTADO ANTERIOR: para uma
        // edição com remap, os mapas ANTES; senão, o `currentLinked` corrente.
        history.record({ asset: current, linkedMaps: previousLinked })
      }
      if (linked) currentLinked = mergeLinkedAssets(previousLinked, linked.after)
      set({
        asset: { ...next, updatedAt: Date.now() } as PintaAsset,
        linkedAssets: currentLinked,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      })
      scheduleAutosave()
    }

    return {
      asset: options.asset,
      savedAsset: options.asset,
      linkedAssets: null,
      dirty: false,
      saveState: 'saved',
      saveError: null,
      canUndo: false,
      canRedo: false,

      commit(next) {
        apply(next, true)
      },

      commitLinked(next, linked) {
        apply(next, true, linked)
      },

      replace(next) {
        apply(next, false)
      },

      commitGesture(base) {
        if (base === get().asset) return
        history.record({ asset: base, linkedMaps: currentLinked })
        set({ canUndo: history.canUndo(), canRedo: history.canRedo() })
        scheduleAutosave()
      },

      undo() {
        const prev = history.undo({ asset: get().asset, linkedMaps: currentLinked })
        if (!prev) return
        currentLinked = prev.linkedMaps
        set({
          asset: prev.asset,
          linkedAssets: currentLinked,
          canUndo: history.canUndo(),
          canRedo: history.canRedo(),
        })
        scheduleAutosave()
      },

      redo() {
        const next = history.redo({ asset: get().asset, linkedMaps: currentLinked })
        if (!next) return
        currentLinked = next.linkedMaps
        set({
          asset: next.asset,
          linkedAssets: currentLinked,
          canUndo: history.canUndo(),
          canRedo: history.canRedo(),
        })
        scheduleAutosave()
      },

      async flush() {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        return saveNow()
      },
    }
  })

  return store
}
