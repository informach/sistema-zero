import { create } from 'zustand'
import type { SourceMappedFile } from '#generators'

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
  source: 'blocks' | 'editor' | null
  selectBlock: (id: string | null) => void
  setCursor: (file: SourceMappedFile, line: number, column?: number) => void
  reset: () => void
}

export const useHighlightStore = create<HighlightStore>((set) => ({
  selectedBlockId: null,
  selectionNonce: 0,
  cursorFile: null,
  cursorLine: null,
  cursorColumn: null,
  source: null,
  selectBlock: (id) =>
    set((s) => ({ selectedBlockId: id, source: 'blocks', selectionNonce: s.selectionNonce + 1 })),
  setCursor: (file, line, column) =>
    set({ cursorFile: file, cursorLine: line, cursorColumn: column ?? null, source: 'editor' }),
  reset: () =>
    set({
      selectedBlockId: null,
      cursorFile: null,
      cursorLine: null,
      cursorColumn: null,
      source: null,
    }),
}))
