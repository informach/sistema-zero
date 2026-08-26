/**
 * Contexto por INSTÂNCIA do <PintaApp>: adapter do host, store da galeria e a
 * navegação por estado (lista ⇄ editor, sem router). Interno (não sai no index).
 */
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { PintaHostAdapter, PintaInitialIntent } from '../core/types'
import type { PintaClipboardStore } from '../state/clipboardStore'
import type { PintaEditorStore } from '../state/editorStore'
import type { PintaGalleryState, PintaGalleryStore } from '../state/galleryStore'
import type { PaletteLibraryStore } from '../state/paletteLibraryStore'
import type { PintaPersistence } from '../state/persistence'

/**
 * Moldura do modo AULA (`<PintaLesson>`): o editor está dentro de um bloco, num desenho só.
 * Ausente = Pinta solto, com a galeria atrás.
 *
 * Só entra aqui o que muda a MOLDURA (o que o editor mostra em volta do desenho). O que a
 * criança pode DESENHAR é curadoria de ferramenta e vem pelo `adapter.allowTools`.
 */
export interface PintaLessonChrome {
  /** Deixar a criança mudar o tamanho? Default do bloco: NÃO — o tamanho é escolha do professor. */
  allowResize: boolean
  /** O botão "Baixar" do topo (PNG/ZIP/SVG). Default do bloco: NÃO — o bloco tem o download dele. */
  allowExport: boolean
}

export interface PintaAppContextValue {
  adapter: PintaHostAdapter
  gallery: PintaGalleryStore
  /**
   * O MESMO armazenamento que a galeria usa. Está aqui porque o editor também grava (autosave,
   * tileset + mapas ligados numa transação) e antes ele chamava o `persistAssets` de MÓDULO —
   * que vai direto ao IndexedDB do perfil e ignoraria qualquer armazenamento injetado.
   */
  persistence: PintaPersistence
  /**
   * Área de transferência do APLICATIVO (copiar num desenho, colar em outro). Vive
   * aqui, e não na sessão do editor, porque a sessão morre ao voltar à galeria.
   */
  clipboard: PintaClipboardStore
  /**
   * Biblioteca "Minhas paletas" do perfil (registro único fora da galeria).
   * `enabled: false` = armazenamento sem os métodos, ou modo AULA — a UI
   * esconde a seção e só a paleta EMBUTIDA no asset funciona.
   */
  paletteLibrary: PaletteLibraryStore
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
  /** Presente = modo AULA (um desenho só, sem galeria atrás). Ver `PintaLessonChrome`. */
  lesson?: PintaLessonChrome
  /**
   * O editor se anuncia aqui ao montar (e passa `null` ao sair). É o que dá ao host o
   * `PintaHandle` — ler o desenho vivo, forçar o salvamento, trocar o desenho — sem que o
   * `EditorScreen` precise receber ref por prop em todo o caminho.
   */
  onEditorReady?(editor: PintaEditorStore | null): void
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
