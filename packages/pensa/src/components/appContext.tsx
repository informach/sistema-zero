/**
 * Contexto por INSTÂNCIA do <PensaApp>: adapter do host, copy resolvida pelo
 * mode e a store criada com o transport injetado. Interno (não sai no index).
 */
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { PensaCopy } from '../core/copy'
import type { PensaHostAdapter } from '../core/types'
import type { PensaProjectStore, PensaProjectStoreState } from '../state/projectStore'

export interface PensaAppContextValue {
  adapter: PensaHostAdapter
  copy: PensaCopy
  store: PensaProjectStore
}

const PensaAppContext = createContext<PensaAppContextValue | null>(null)

export const PensaAppProvider = PensaAppContext.Provider

export function usePensaApp(): PensaAppContextValue {
  const value = useContext(PensaAppContext)
  if (!value) throw new Error('usePensaApp deve ser usado dentro de <PensaApp>')
  return value
}

export function usePensaStore<T>(selector: (state: PensaProjectStoreState) => T): T {
  const { store } = usePensaApp()
  return useStore(store, selector)
}
