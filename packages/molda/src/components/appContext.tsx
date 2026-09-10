/**
 * O contexto do app: o adapter do host, o store da galeria e a persistência.
 * Um por `<MoldaApp>` (nada global: dois apps na mesma página não se veem).
 */
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { MoldaExportedAsset, MoldaStudioResyncResult } from '../export/studioLibrary'
import type { GallerySceneSource } from '../state/gallerySceneSource'
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
   * PROMOVER modelos antigos para a oficina da geração seguinte. Desligada por padrão.
   *
   * ⚠️ Ela governa só a promoção, e não o acesso: uma criação JÁ promovida continua
   * listada e continua abrindo na oficina mesmo com isto desligado. É o que torna
   * desligar reversível — do contrário, voltar atrás deixaria o trabalho da criança
   * inalcançável, porque o editor antigo não sabe ler o documento novo.
   *
   * Promover é escrever o formato novo no disco e na nuvem: só ligar depois que os
   * leitores compatíveis (lote 230) estiverem implantados.
   */
  sceneWorkshop?: boolean
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

export function useGallery<T>(selector: (state: GalleryState & GalleryActions) => T): T {
  const { gallery } = useMoldaApp()
  return useStore(gallery, selector)
}
