/**
 * O contexto do app: o adapter do host, o store da galeria e a persistência.
 * Um por `<MoldaApp>` (nada global: dois apps na mesma página não se veem).
 */
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { MoldaStarterBox } from '../core/model'
import type { MoldaToolAccess } from '../core/toolFamilies'
import type { MoldaExportedAsset, MoldaStudioResyncResult } from '../export/studioLibrary'
import type { GallerySceneSource } from '../state/gallerySceneSource'
import type { GalleryActions, GalleryState, GalleryStore } from '../state/galleryStore'
import type { MoldaPersistence } from '../state/persistence'

/** Biblioteca de paletas do perfil fornecida pelo host (a mesma usada pelo Pinta). */
export interface MoldaPaletteLibraryPort {
  getState(): {
    loaded: boolean
    palettes: readonly { id: string; name: string; colors: readonly string[] }[]
    load(): Promise<void>
    savePalette(input: {
      name: string
      colors: readonly string[]
    }): Promise<{ id: string; name: string; colors: readonly string[] } | null>
    renamePalette(id: string, name: string): Promise<boolean>
    removePalette(id: string): Promise<boolean>
  }
  subscribe(listener: () => void): () => void
}

export interface MoldaHostAdapter {
  /** "Minhas paletas" compartilhada com o Pinta pelo mesmo perfil. */
  paletteLibrary?: MoldaPaletteLibraryPort
  /** Tema do host; o root ganha `data-molda-theme`. Default `light`. */
  theme?: 'light' | 'dark'
  /** O perfil tem o Estúdio: a galeria mostra o atalho e a dica do "Trazer do Molda". */
  studioOwned?: boolean
  onOpenStudio?: () => void
  /** Abre esta criação assim que a galeria carregar (deep link `?criacao=`). */
  initialAssetId?: string
  /**
   * Molde pedido pelo host (28/10/2026, o Arquipélago): abre o modelo com este nome ou, se ainda
   * não existe, cria um com a caixa do molde como peça de começo. 1x, depois que a galeria carrega.
   */
  initialModel?: MoldaInitialModel
  /**
   * A VOLTA da ponte "Trazer do Molda": depois de SALVAR, o editor reenvia a criação já
   * no formato do Estúdio (`.glb`/`.hdr`/`.png`) e o host atualiza a biblioteca pessoal
   * de lá, de onde ela entra sozinha nos jogos. `updated: false` quando a criação nunca
   * foi levada ao Estúdio (o host decide pela guarda dele). Nunca chamado ao abrir.
   */
  resyncToStudio?: (asset: MoldaExportedAsset) => Promise<MoldaStudioResyncResult>
  /** Check the existing link before encoding or asking to review a Studio copy. */
  canResyncToStudio?: (creationId: string) => Promise<boolean>
  /** A lista de criações mudou (criar, renomear, apagar, salvar, releitura). */
  onChange?: () => void
  /**
   * As famílias de ferramentas que a criança pode USAR: o portão por nível de jornada, que o
   * host calcula (o Molda não conhece jornada). Ausente = tudo liberado. Trancar tira a
   * autoria, nunca a leitura: ver `core/toolFamilies.ts`.
   */
  toolAccess?: MoldaToolAccess
}

/** O modelo com molde: o nome (kebab-case) e a caixa em unidades da grade. */
export interface MoldaInitialModel {
  name: string
  box: MoldaStarterBox
  /** O teto de triângulos do molde ("Leve para a ilha"); ausente = o do Molda. */
  maxTriangles?: number
}

export interface MoldaAppContextValue {
  adapter: MoldaHostAdapter
  gallery: GalleryStore
  persistence: MoldaPersistence
  /** A geração seguinte, para o que a galeria precisa dela além da lista. */
  scene: GallerySceneSource
}

const MoldaAppContext = createContext<MoldaAppContextValue | null>(null)

export const MoldaAppProvider = MoldaAppContext.Provider

export function useMoldaApp(): MoldaAppContextValue {
  const value = useContext(MoldaAppContext)
  if (!value) throw new Error('useMoldaApp deve ser usado dentro de <MoldaApp>')
  return value
}

/** O mesmo, ou `null` fora do app: a oficina montada sozinha (playground e testes) não tem galeria. */
export function useOptionalMoldaApp(): MoldaAppContextValue | null {
  return useContext(MoldaAppContext)
}

export function useGallery<T>(selector: (state: GalleryState & GalleryActions) => T): T {
  const { gallery } = useMoldaApp()
  return useStore(gallery, selector)
}
