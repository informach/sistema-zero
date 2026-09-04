/**
 * O editor de UMA criação: histórico por snapshots com orçamento em bytes e
 * salvamento automático com debounce e laço de drenagem (uma gravação por vez;
 * se algo mudou enquanto gravava, grava de novo até alcançar). Um store por
 * criação aberta.
 *
 * - `commit(next)`: um passo de desfazer + agenda o salvamento.
 * - `replace(next)`: sem histórico (arrasto ao vivo); o `commitGesture` fecha
 *   o gesto com o estado de ANTES do arrasto.
 * - `undo`/`redo`: também agendam o salvamento (o disco acompanha a tela).
 * - `flush()`: grava agora o que estiver pendente (saída do editor).
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { assetBytes } from '../core/bytes'
import { COPY } from '../core/copy'
import { createHistory } from '../core/history'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaAsset } from '../core/model'
import { isStorageBudgetError, type MoldaPersistence } from './persistence'

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

export interface EditorState {
  asset: MoldaAsset
  /** A última versão que chegou ao disco. */
  savedAsset: MoldaAsset
  saveState: SaveState
  saveError: string | null
  canUndo: boolean
  canRedo: boolean
}

export interface EditorActions {
  commit(next: MoldaAsset): void
  replace(next: MoldaAsset): void
  commitGesture(before: MoldaAsset, after: MoldaAsset): void
  /** Miniatura pronta (data URL) ou nenhuma: sem histórico, mas salva. */
  setThumb(thumb: string | undefined): void
  undo(): void
  redo(): void
  flush(): Promise<void>
  dispose(): void
}

export type EditorStore = StoreApi<EditorState & EditorActions>

export interface CreateEditorStoreOptions {
  asset: MoldaAsset
  persistence: MoldaPersistence
  onSaved?: (asset: MoldaAsset) => void
  autosaveMs?: number
  byteBudget?: number
  now?: () => number
}

export const DEFAULT_AUTOSAVE_MS = 600

export function createEditorStore(options: CreateEditorStoreOptions): EditorStore {
  const { persistence, onSaved } = options
  const autosaveMs = options.autosaveMs ?? DEFAULT_AUTOSAVE_MS
  const now = options.now ?? (() => Date.now())
  const history = createHistory<MoldaAsset>({
    sizeOf: assetBytes,
    byteBudget: options.byteBudget ?? MOLDA_LIMITS.undoBudgetBytes,
  })

  let timer: ReturnType<typeof setTimeout> | null = null
  let inflight: Promise<void> | null = null

  const store = createStore<EditorState & EditorActions>((set, get) => {
    function historyFlags(): Pick<EditorState, 'canUndo' | 'canRedo'> {
      return { canUndo: history.canUndo(), canRedo: history.canRedo() }
    }

    function stamp(asset: MoldaAsset): MoldaAsset {
      return { ...asset, updatedAt: now() }
    }

    function schedule(): void {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void saveNow()
      }, autosaveMs)
    }

    async function drain(): Promise<void> {
      for (;;) {
        const snapshot = get().asset
        if (snapshot === get().savedAsset) return
        set({ saveState: 'saving' })
        try {
          await persistence.save(snapshot)
        } catch (error) {
          set({
            saveState: 'error',
            saveError: isStorageBudgetError(error)
              ? COPY.gallery.storageBudget
              : COPY.editor.saveError,
          })
          return
        }
        set({
          savedAsset: snapshot,
          saveError: null,
          saveState: get().asset === snapshot ? 'saved' : 'dirty',
        })
        onSaved?.(snapshot)
      }
    }

    function saveNow(): Promise<void> {
      if (inflight) return inflight
      // ⚠️ O "em voo" é zerado num `.finally` ENCADEADO, nunca dentro da função
      // async: sem nada pendente o corpo termina de forma SÍNCRONA, e um
      // `finally` interno rodava antes desta atribuição — a variável ficava
      // presa numa promessa já resolvida e nenhum salvamento acontecia mais
      // (visto no navegador: o StrictMode chama `flush()` na montagem).
      const run: Promise<void> = drain().finally(() => {
        if (inflight === run) inflight = null
      })
      inflight = run
      return run
    }

    function apply(next: MoldaAsset): void {
      set({ asset: next, saveState: 'dirty', ...historyFlags() })
      schedule()
    }

    return {
      asset: options.asset,
      savedAsset: options.asset,
      saveState: 'saved',
      saveError: null,
      canUndo: false,
      canRedo: false,

      commit(next) {
        const current = get().asset
        if (next === current) return
        history.record(current)
        apply(stamp(next))
      },

      replace(next) {
        if (next === get().asset) return
        set({ asset: next, saveState: 'dirty' })
      },

      commitGesture(before, after) {
        history.record(before)
        apply(stamp(after))
      },

      setThumb(thumb) {
        const current = get().asset
        if (current.thumb === thumb) return
        const { thumb: _old, ...rest } = current
        const next = (thumb ? { ...rest, thumb } : rest) as MoldaAsset
        set({ asset: next, saveState: 'dirty' })
        schedule()
      },

      undo() {
        const previous = history.undo(get().asset)
        if (!previous) return
        apply(stamp(previous))
      },

      redo() {
        const next = history.redo(get().asset)
        if (!next) return
        apply(stamp(next))
      },

      async flush() {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        await saveNow()
      },

      // Só cancela o salvamento agendado (o `flush` da saída já gravou). Não
      // trava o store: no StrictMode o React desmonta e remonta o editor com o
      // MESMO store, e um store travado deixaria o salvamento automático morto.
      dispose() {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
      },
    }
  })

  return store
}
