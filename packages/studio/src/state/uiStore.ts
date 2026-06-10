import { useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { StudioStoresContext } from './storesContext'

export type BottomTab = 'console' | 'terminal' | 'ai'

interface UIStore {
  bottomTab: BottomTab
  setBottomTab: (t: BottomTab) => void
  showExtensions: boolean
  setShowExtensions: (b: boolean) => void
  showPreview: boolean
  setShowPreview: (b: boolean) => void
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
    showPreview: true,
    setShowPreview: (showPreview) => set({ showPreview }),
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
