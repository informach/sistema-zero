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
  tutorTarget: { blockId?: string; blockType: string; category: string } | null
  selectBlock: (id: string | null) => void
  setCursor: (file: SourceMappedFile, line: number, column?: number) => void
  focusTutorReference: (target: { blockId?: string; blockType: string; category: string }) => void
  reset: () => void
}

export function createHighlightStore(): StoreApi<HighlightStore> {
  return createStore<HighlightStore>((set) => ({
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
