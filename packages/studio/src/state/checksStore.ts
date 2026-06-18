import { useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { ActivityRunResult } from '../studio/activity'
import { StudioStoresContext } from './storesContext'

/**
 * Estado da AUTO-CORREÇÃO da atividade, POR INSTÂNCIA. O `ActivityPanel` roda as
 * checagens e grava aqui; o `StudioHandle.getActivityResult()` lê daqui para o
 * host (member-shell) anexar o resultado reportado no envio.
 */
interface ChecksStore {
  running: boolean
  setRunning: (b: boolean) => void
  lastResult: ActivityRunResult | null
  setResult: (r: ActivityRunResult | null) => void
}

export function createChecksStore(): StoreApi<ChecksStore> {
  return createStore<ChecksStore>((set) => ({
    running: false,
    setRunning: (running) => set({ running }),
    lastResult: null,
    setResult: (lastResult) => set({ lastResult }),
  }))
}

const defaultChecksStore = createChecksStore()

type BoundUseChecksStore = (<T>(selector: (s: ChecksStore) => T) => T) & StoreApi<ChecksStore>

/** Hook por instância; fora de um <Studio> cai na default de módulo. */
export const useChecksStore: BoundUseChecksStore = Object.assign(function useChecksStoreHook<T>(
  selector: (s: ChecksStore) => T,
): T {
  const stores = useContext(StudioStoresContext)
  return useStore(stores?.checks ?? defaultChecksStore, selector)
}, defaultChecksStore)

export function useChecksStoreApi(): StoreApi<ChecksStore> {
  const stores = useContext(StudioStoresContext)
  return stores?.checks ?? defaultChecksStore
}
