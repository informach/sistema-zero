import { useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { SourceMappedFile } from '#generators'
import { StudioStoresContext } from './storesContext'

/**
 * Estado efêmero de highlight cruzado. Quando o aluno seleciona um bloco no
 * Blockly, publicamos `selectedBlockId`; o painel Monaco reage rolando até
 * a linha mapeada. Quando o cursor do Monaco mexe, publicamos `cursorLine`;
 * o Blockly reage destacando o bloco que gerou aquele trecho.
 *
 * Não é persistido — vive só na sessão da IDE.
 */
interface HighlightStore {
  selectedBlockId: string | null
  /**
   * Incrementa a cada `selectBlock`, mesmo quando o id repete. Permite que o
   * editor re-role/re-realce ao clicar de novo no MESMO bloco (sem o nonce, o
   * memo do highlight manteria a mesma referência e o efeito não dispararia).
   */
  selectionNonce: number
  cursorFile: SourceMappedFile | null
  cursorLine: number | null
  cursorColumn: number | null
  /** Última fonte de evento; evita loops bloco→linha→bloco. */
  source: 'blocks' | 'editor' | 'tutor' | null
  tutorTarget: {
    blockId?: string
    blockType: string
    category: string
    /** Subcategoria da paleta (nó folha) — preferida no fallback por rótulo. */
    subcategory?: string
  } | null
  /**
   * O erro de execução do jogo, na linha do código gerado (redesenho do clássico, 11/2026). O
   * editor de blocos acha o bloco daquela linha e põe nele o sinal vermelho
   * (`setWarningText(…, 'sz-runtime-error')`); `null` tira o sinal. Quem marca e desmarca é a
   * prévia: a cada jogo novo (Rodar, Rodar de novo ou uma edição) o sinal sai.
   */
  runtimeMark: RuntimeMark | null
  /**
   * "Mostrar o bloco": o editor rola até o bloco, seleciona e abre o balão. O nonce sobe a cada
   * pedido (apertar duas vezes mostra de novo). `runtime` = o bloco do `runtimeMark`.
   */
  revealRequest: {
    target: { kind: 'runtime' } | { kind: 'block'; blockId: string }
    nonce: number
  } | null
  setRuntimeMark: (mark: RuntimeMark | null) => void
  revealBlock: (target: { kind: 'runtime' } | { kind: 'block'; blockId: string }) => void
  selectBlock: (id: string | null) => void
  setCursor: (file: SourceMappedFile, line: number, column?: number) => void
  focusTutorReference: (target: {
    blockId?: string
    blockType: string
    category: string
    subcategory?: string
  }) => void
  reset: () => void
}

export interface RuntimeMark {
  /** O arquivo gerado (JavaScript: `script.js`; Python: o caminho do `.py`). */
  file: string
  line: number
  column: number | null
  /** A frase do balão, já em português para a criança. */
  message: string
}

export function createHighlightStore(): StoreApi<HighlightStore> {
  return createStore<HighlightStore>((set) => ({
    runtimeMark: null,
    revealRequest: null,
    setRuntimeMark: (runtimeMark) => set({ runtimeMark }),
    revealBlock: (target) =>
      set((s) => ({ revealRequest: { target, nonce: (s.revealRequest?.nonce ?? 0) + 1 } })),
    selectedBlockId: null,
    selectionNonce: 0,
    cursorFile: null,
    cursorLine: null,
    cursorColumn: null,
    source: null,
    tutorTarget: null,
    selectBlock: (id) =>
      set((s) => ({ selectedBlockId: id, source: 'blocks', selectionNonce: s.selectionNonce + 1 })),
    setCursor: (file, line, column) =>
      set({ cursorFile: file, cursorLine: line, cursorColumn: column ?? null, source: 'editor' }),
    focusTutorReference: (tutorTarget) =>
      set((s) => ({
        tutorTarget,
        selectedBlockId: tutorTarget.blockId ?? null,
        source: 'tutor',
        selectionNonce: s.selectionNonce + 1,
      })),
    reset: () =>
      set({
        selectedBlockId: null,
        cursorFile: null,
        cursorLine: null,
        cursorColumn: null,
        source: null,
        tutorTarget: null,
        runtimeMark: null,
        revealRequest: null,
      }),
  }))
}

const defaultHighlightStore = createHighlightStore()

type BoundUseHighlightStore = (<T>(selector: (s: HighlightStore) => T) => T) &
  StoreApi<HighlightStore>

/** Hook por instância (ver uiStore.ts para o contrato default/estáticas). */
export const useHighlightStore: BoundUseHighlightStore = Object.assign(
  function useHighlightStoreHook<T>(selector: (s: HighlightStore) => T): T {
    const stores = useContext(StudioStoresContext)
    return useStore(stores?.highlight ?? defaultHighlightStore, selector)
  },
  defaultHighlightStore,
)

export function useHighlightStoreApi(): StoreApi<HighlightStore> {
  const stores = useContext(StudioStoresContext)
  return stores?.highlight ?? defaultHighlightStore
}
