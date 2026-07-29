import { useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { IDEMode } from '#core'
import { StudioStoresContext } from './storesContext'

export type BottomTab = 'console' | 'terminal' | 'ai'
export type ConsoleVisibilityOverride = boolean | null

/**
 * Sem escolha manual, o Console segue o padrão pedagógico do modo. Depois da
 * primeira ação no menu, a preferência da instância prevalece até o Studio ser
 * desmontado (a store não é persistida nem pertence ao projeto).
 */
export function resolveConsoleVisibility(
  mode: IDEMode | undefined,
  override: ConsoleVisibilityOverride,
): boolean {
  return override ?? mode === 'code'
}

interface UIStore {
  bottomTab: BottomTab
  setBottomTab: (t: BottomTab) => void
  showExtensions: boolean
  setShowExtensions: (b: boolean) => void
  /** Abre o gerenciador de Assets (imagens/sprites) — overlay, espelho do showExtensions. */
  showAssets: boolean
  setShowAssets: (b: boolean) => void
  showPreview: boolean
  setShowPreview: (b: boolean) => void
  // O Console deriva do modo enquanto `null` (Blocos/Ponte oculto, Código
  // visível). A primeira ação manual grava um boolean que prevalece em qualquer
  // modo/projeto nesta instância. Terminal/IA continuam booleanos porque só
  // existem no contexto de Código.
  consoleVisibilityOverride: ConsoleVisibilityOverride
  setConsoleVisibilityOverride: (value: ConsoleVisibilityOverride) => void
  showTerminal: boolean
  setShowTerminal: (b: boolean) => void
  showAI: boolean
  setShowAI: (b: boolean) => void
  /** Quando `true`, o preview executa e atualiza automaticamente (Play). Quando `false`, para de renderizar e esvazia o iframe (Parar). */
  previewRunning: boolean
  setPreviewRunning: (b: boolean) => void
  togglePreviewRunning: () => void
}

export function createUIStore(): StoreApi<UIStore> {
  return createStore<UIStore>((set) => ({
    bottomTab: 'console',
    setBottomTab: (bottomTab) => set({ bottomTab }),
    showExtensions: false,
    setShowExtensions: (showExtensions) => set({ showExtensions }),
    showAssets: false,
    setShowAssets: (showAssets) => set({ showAssets }),
    showPreview: true,
    setShowPreview: (showPreview) => set({ showPreview }),
    consoleVisibilityOverride: null,
    setConsoleVisibilityOverride: (consoleVisibilityOverride) => set({ consoleVisibilityOverride }),
    showTerminal: true,
    setShowTerminal: (showTerminal) => set({ showTerminal }),
    showAI: true,
    setShowAI: (showAI) => set({ showAI }),
    previewRunning: true,
    setPreviewRunning: (previewRunning) => set({ previewRunning }),
    togglePreviewRunning: () => set((s) => ({ previewRunning: !s.previewRunning })),
  }))
}

const defaultUIStore = createUIStore()

type BoundUseUIStore = (<T>(selector: (s: UIStore) => T) => T) & StoreApi<UIStore>

/**
 * Hook por instância: lê a store do <Studio> mais próximo; fora de um Studio
 * cai na default de módulo. As estáticas (getState/setState/subscribe) operam
 * SEMPRE na default — contrato dos testes.
 */
export const useUIStore: BoundUseUIStore = Object.assign(function useUIStoreHook<T>(
  selector: (s: UIStore) => T,
): T {
  const stores = useContext(StudioStoresContext)
  return useStore(stores?.ui ?? defaultUIStore, selector)
}, defaultUIStore)

export function useUIStoreApi(): StoreApi<UIStore> {
  const stores = useContext(StudioStoresContext)
  return stores?.ui ?? defaultUIStore
}
