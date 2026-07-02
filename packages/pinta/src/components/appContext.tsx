/**
 * Contexto por INSTÂNCIA do <PintaApp>: adapter do host, store da galeria e a
 * navegação por estado (lista ⇄ editor, sem router). Interno (não sai no index).
 */
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { PintaHostAdapter } from '../core/types'
import type { PintaGalleryState, PintaGalleryStore } from '../state/galleryStore'

export interface PintaAppContextValue {
  adapter: PintaHostAdapter
  gallery: PintaGalleryStore
  /** Abre o editor do asset (a tela troca por estado). */
  openAsset(id: string): void
  /** Volta para a galeria. */
  closeEditor(): void
}

const PintaAppContext = createContext<PintaAppContextValue | null>(null)

export const PintaAppProvider = PintaAppContext.Provider

export function usePintaApp(): PintaAppContextValue {
  const value = useContext(PintaAppContext)
  if (!value) throw new Error('usePintaApp deve ser usado dentro de <PintaApp>')
  return value
}

export function usePintaGallery<T>(selector: (state: PintaGalleryState) => T): T {
  const { gallery } = usePintaApp()
  return useStore(gallery, selector)
}
