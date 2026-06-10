import { useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { SourceMap } from '#generators'
import { StudioStoresContext } from './storesContext'

interface SourcemapStore {
  map: SourceMap
  setMap: (map: SourceMap) => void
  clear: () => void
}

/**
 * Mantém o último source-map produzido por `generateProjectFilesWithMap`.
 * Os hooks `useCrossHighlight` leem este store para resolver bloco ↔ linha.
 */
export function createSourcemapStore(): StoreApi<SourcemapStore> {
  return createStore<SourcemapStore>((set) => ({
    map: {},
    setMap: (map) => set({ map }),
    clear: () => set({ map: {} }),
  }))
}

const defaultSourcemapStore = createSourcemapStore()

type BoundUseSourcemapStore = (<T>(selector: (s: SourcemapStore) => T) => T) &
  StoreApi<SourcemapStore>

/** Hook por instância (ver uiStore.ts para o contrato default/estáticas). */
export const useSourcemapStore: BoundUseSourcemapStore = Object.assign(
  function useSourcemapStoreHook<T>(selector: (s: SourcemapStore) => T): T {
    const stores = useContext(StudioStoresContext)
    return useStore(stores?.sourcemap ?? defaultSourcemapStore, selector)
  },
  defaultSourcemapStore,
)
