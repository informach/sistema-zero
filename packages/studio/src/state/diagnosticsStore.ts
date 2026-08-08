import { useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { StudioStoresContext } from './storesContext'

/**
 * O que o editor JÁ SABE de errado no projeto — e que até 08/2026 morria num
 * balão amarelo no canvas.
 *
 * O Blockly calcula duas coisas a cada edição e descartava as duas: quais pilhas
 * estão SOLTAS (fora das Áreas do projeto, ou seja, nunca executam) e quais
 * problemas semânticos a IR tem, já com frase pronta em português ("A variável X
 * ainda não foi declarada neste ponto"). Para o tutor, isso é o diagnóstico
 * pronto: sem essa informação ele não consegue distinguir um bloco que roda de
 * um rascunho morto, nem apontar um nome escrito diferente do que foi criado.
 *
 * Efêmero e por instância, como o highlight: nada aqui é persistido.
 */
export interface SemanticIssue {
  /** Bloco que carrega o problema, quando dá para resolver. */
  blockId?: string
  /** Frase já em português, escrita para a criança. */
  message: string
}

interface DiagnosticsStore {
  /** Ids das pilhas soltas — salvas, mas que nunca rodam. */
  draftBlockIds: string[]
  semanticIssues: SemanticIssue[]
  setDraftBlockIds: (ids: string[]) => void
  setSemanticIssues: (issues: SemanticIssue[]) => void
  reset: () => void
}

export function createDiagnosticsStore() {
  return createStore<DiagnosticsStore>((set) => ({
    draftBlockIds: [],
    semanticIssues: [],
    setDraftBlockIds: (draftBlockIds) => set({ draftBlockIds }),
    setSemanticIssues: (semanticIssues) => set({ semanticIssues }),
    reset: () => set({ draftBlockIds: [], semanticIssues: [] }),
  }))
}

const defaultDiagnosticsStore = createDiagnosticsStore()

type BoundUseDiagnosticsStore = (<T>(selector: (s: DiagnosticsStore) => T) => T) &
  StoreApi<DiagnosticsStore>

/** Hook por instância (ver uiStore.ts para o contrato default/estáticas). */
export const useDiagnosticsStore: BoundUseDiagnosticsStore = Object.assign(
  function useDiagnosticsStoreHook<T>(selector: (s: DiagnosticsStore) => T): T {
    const stores = useContext(StudioStoresContext)
    return useStore(stores?.diagnostics ?? defaultDiagnosticsStore, selector)
  },
  defaultDiagnosticsStore,
)

/** A store crua da instância — para escrever de dentro de effects/listeners. */
export function useDiagnosticsStoreApi(): StoreApi<DiagnosticsStore> {
  const stores = useContext(StudioStoresContext)
  return stores?.diagnostics ?? defaultDiagnosticsStore
}
