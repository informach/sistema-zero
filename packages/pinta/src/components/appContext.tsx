/**
 * Contexto por INSTÂNCIA do <PintaApp>: adapter do host, store da galeria e a
 * navegação por estado (lista ⇄ editor, sem router). Interno (não sai no index).
 */
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { PintaHostAdapter, PintaInitialIntent } from '../core/types'
import type { PintaGalleryState, PintaGalleryStore } from '../state/galleryStore'

export interface PintaAppContextValue {
  adapter: PintaHostAdapter
  gallery: PintaGalleryStore
  /** Abre o editor do asset (a tela troca por estado). */
  openAsset(id: string): void
  /** Volta para a galeria. */
  closeEditor(): void
  /**
   * Intent do Pensa consumido UMA vez (missão de arte): a 1ª chamada devolve e
   * limpa — voltar do editor à galeria não reabre o "Criar novo".
   */
  takeInitialIntent(): PintaInitialIntent | null
  /** Número que muda quando o brief pede para recriar um desenho ausente. */
  initialIntentVersion: number
  /** Abre a criação guiada novamente sem remontar o Pinta inteiro. */
  requestInitialIntent(intent: PintaInitialIntent): void
  /**
   * Id do desenho a abrir direto (botão "Editar" do Estúdio), consumido UMA
   * vez — voltar à galeria não reabre o editor.
   */
  takeInitialAssetId(): string | null
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
