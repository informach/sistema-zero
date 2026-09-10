/**
 * O editor de UMA criação: histórico por deltas com orçamento em bytes e
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
import { retainSnapshotDelta } from '../core/snapshotDelta'
import { isStorageBudgetError, type MoldaPersistence } from './persistence'

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

export interface EditableDocument {
  id: string
  updatedAt: number
  thumb?: string
}

export interface EditorState<T extends EditableDocument = MoldaAsset> {
  asset: T
  /** Stable authoring snapshot. Derived thumbnail/save stamps never replace this owner. */
  content: T
  /**
   * Versão monotônica do CONTEÚDO editável. Miniaturas e estado de salvamento não
   * avançam esta revisão; ações adiadas usam-na para não reaplicar snapshots velhos.
   */
  contentRevision: number
  /** A última versão que chegou ao disco. */
  savedAsset: T
  saveState: SaveState
  saveError: string | null
  canUndo: boolean
  canRedo: boolean
}

export interface EditorActions<T extends EditableDocument = MoldaAsset> {
  commit(next: T): void
  replace(next: T): void
  commitGesture(before: T, after: T): void
  /** Restore the captured content and persist the restoration if disk already changed. */
  cancelGesture(before: T): void
  /**
   * Troca o estado ATUAL sem novo passo de desfazer (o painel "Ajustar" reexecuta
   * a última operação sobre o "antes" dela): um passo só no histórico, e salva.
   */
  amend(next: T): void
  /** Miniatura pronta (data URL) ou nenhuma: sem histórico, mas salva. */
  setThumb(thumb: string | undefined): void
  undo(): void
  redo(): void
  flush(): Promise<void>
  dispose(): void
}

export type EditorStore<T extends EditableDocument = MoldaAsset> = StoreApi<
  EditorState<T> & EditorActions<T>
>

export interface CreateDocumentEditorStoreOptions<T extends EditableDocument> {
  asset: T
  /** Infer the domain from asset, never from a broader counter or persistence port. */
  persistence: { save(asset: NoInfer<T>): Promise<void> }
  sizeOf(asset: NoInfer<T>): number
  onSaved?: (asset: NoInfer<T>) => void
  saveErrorMessage?: (error: unknown) => string | undefined
  autosaveMs?: number
  byteBudget?: number
  now?: () => number
}

export interface CreateEditorStoreOptions
  extends Omit<CreateDocumentEditorStoreOptions<MoldaAsset>, 'sizeOf' | 'persistence'> {
  persistence: MoldaPersistence
}

export const DEFAULT_AUTOSAVE_MS = 600

/** Derived thumbnails must be regenerated, not retained as editable history content. */
function historyAsset<T extends EditableDocument>(asset: T): T {
  if (!Object.hasOwn(asset, 'thumb')) return asset
  const content = { ...asset }
  delete content.thumb
  return content
}

export function createEditorStore(options: CreateEditorStoreOptions): EditorStore {
  return createDocumentEditorStore({ ...options, sizeOf: assetBytes })
}

/** The same history/save engine serves legacy assets and the new scene domain. */
export function createDocumentEditorStore<T extends EditableDocument>(
  options: CreateDocumentEditorStoreOptions<T>,
): EditorStore<T> {
  const { persistence, onSaved } = options
  const autosaveMs = options.autosaveMs ?? DEFAULT_AUTOSAVE_MS
  const now = options.now ?? (() => Date.now())
  const history = createHistory<T>({
    sizeOf: options.sizeOf,
    byteBudget: options.byteBudget ?? MOLDA_LIMITS.undoBudgetBytes,
    retain: retainSnapshotDelta,
  })
  // Deltas apply to the last committed state, never to an interrupted live preview.
  let historyCurrent = historyAsset(options.asset)

  let timer: ReturnType<typeof setTimeout> | null = null
  let inflight: Promise<void> | null = null

  const store = createStore<EditorState<T> & EditorActions<T>>((set, get) => {
    function historyFlags(): Pick<EditorState<T>, 'canUndo' | 'canRedo'> {
      return { canUndo: history.canUndo(), canRedo: history.canRedo() }
    }

    function stamp(asset: T): T {
      return { ...asset, updatedAt: Math.max(now(), get().asset.updatedAt + 1) }
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
        const state = get()
        if (state.asset === state.savedAsset) return
        // `replace` mantém o carimbo estável durante um gesto ao vivo. Se a saída do
        // editor interromper o gesto antes do `commitGesture`, o próprio limite de
        // persistência precisa transformar aquele snapshot sujo numa versão nova.
        // Sem isso, nuvem e Estúdio tratam conteúdo novo como cache já sincronizado.
        const snapshot =
          state.asset.updatedAt > state.savedAsset.updatedAt
            ? state.asset
            : {
                ...state.asset,
                updatedAt: Math.max(now(), state.savedAsset.updatedAt + 1),
              }
        if (snapshot !== state.asset) set({ asset: snapshot })
        set({ saveState: 'saving' })
        try {
          await persistence.save(snapshot)
        } catch (error) {
          set({
            saveState: 'error',
            saveError:
              options.saveErrorMessage?.(error) ??
              (isStorageBudgetError(error) ? COPY.gallery.storageBudget : COPY.editor.saveError),
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

    function apply(next: T, contentChanged = true): void {
      set((state) => ({
        asset: next,
        content: contentChanged ? next : state.content,
        contentRevision: state.contentRevision + (contentChanged ? 1 : 0),
        saveState: 'dirty',
        ...historyFlags(),
      }))
      schedule()
    }

    return {
      asset: options.asset,
      content: options.asset,
      contentRevision: 0,
      savedAsset: options.asset,
      saveState: 'saved',
      saveError: null,
      canUndo: false,
      canRedo: false,

      commit(next) {
        const current = get().asset
        if (next === current || next === get().content) return
        const stamped = stamp(next)
        const previous = historyCurrent
        historyCurrent = historyAsset(stamped)
        history.record(previous, historyCurrent)
        apply(stamped)
      },

      replace(next) {
        if (next === get().asset) return
        set((state) => ({
          asset: next,
          content: next,
          contentRevision: state.contentRevision + 1,
          saveState: next === state.savedAsset ? 'saved' : 'dirty',
        }))
      },

      commitGesture(before, after) {
        if (before === after) return
        const stamped = stamp(after)
        const previous = historyCurrent
        historyCurrent = historyAsset(stamped)
        history.record(previous, historyCurrent)
        apply(stamped)
      },

      cancelGesture(before) {
        get().replace(before)
        if (get().asset !== get().savedAsset) schedule()
      },

      amend(next) {
        if (next === get().asset) return
        const stamped = stamp(next)
        history.amend(historyCurrent, historyAsset(stamped))
        historyCurrent = historyAsset(stamped)
        apply(stamped)
      },

      setThumb(thumb) {
        const current = get().asset
        if (current.thumb === thumb) return
        const next = { ...current }
        if (thumb) next.thumb = thumb
        else delete next.thumb
        apply(stamp(next), false)
      },

      undo() {
        const previous = history.undo(historyCurrent)
        if (!previous) return
        historyCurrent = stamp(previous)
        apply(historyCurrent)
      },

      redo() {
        const next = history.redo(historyCurrent)
        if (!next) return
        historyCurrent = stamp(next)
        apply(historyCurrent)
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
