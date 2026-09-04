/**
 * O contexto do app: o adapter do host, o store da galeria e a persistência.
 * Um por `<MoldaApp>` (nada global: dois apps na mesma página não se veem).
 */
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { GalleryActions, GalleryState, GalleryStore } from '../state/galleryStore'
import type { MoldaPersistence } from '../state/persistence'

export interface MoldaHostAdapter {
  /** Tema do host; o root ganha `data-molda-theme`. Default `light`. */
  theme?: 'light' | 'dark'
  /** O perfil tem o Estúdio: a galeria mostra o atalho e a dica do "Trazer do Molda". */
  studioOwned?: boolean
  onOpenStudio?: () => void
  /** Abre esta criação assim que a galeria carregar (deep link `?criacao=`). */
  initialAssetId?: string
  /** A lista de criações mudou (criar, renomear, apagar, salvar, releitura). */
  onChange?: () => void
}

export interface MoldaAppContextValue {
  adapter: MoldaHostAdapter
  gallery: GalleryStore
  persistence: MoldaPersistence
}

const MoldaAppContext = createContext<MoldaAppContextValue | null>(null)

export const MoldaAppProvider = MoldaAppContext.Provider

export function useMoldaApp(): MoldaAppContextValue {
  const value = useContext(MoldaAppContext)
  if (!value) throw new Error('useMoldaApp deve ser usado dentro de <MoldaApp>')
  return value
}

export function useGallery<T>(selector: (state: GalleryState & GalleryActions) => T): T {
  const { gallery } = useMoldaApp()
  return useStore(gallery, selector)
}
