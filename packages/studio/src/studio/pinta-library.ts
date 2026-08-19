import { createContext, useContext } from 'react'

/**
 * TRAZER DO PINTA — capacidade OPCIONAL do host (community-kids) para o Estúdio
 * Completo: listar TODOS os desenhos da galeria do Pinta e importar um por id,
 * direto do painel de Imagens (fluxo PULL — a criança não precisa mais lembrar
 * o que já "enviou").
 *
 * O Studio só desenha a modal (busca + grade + selo "no projeto") e chama o
 * adapter; quem fala com o Pinta é o host, via o subpath
 * `@sistemazero/pinta/studio-library` (zero import pinta↔studio — os tipos
 * abaixo são ESPELHOS declarados, mesma regra do `PersonalAsset`). Default
 * `null` → sem botão, que é o certo no embed do admin e no bloco de aula.
 *
 * O import do host DEVE também gravar o desenho em
 * `@sistemazero/studio/personal-assets`: é isso que liga o auto-update dos
 * jogos quando a criança edita no Pinta (ver `asset-library/personalSync.ts`).
 */

/** Resumo de um desenho da galeria do Pinta (espelho do `PintaGallerySummary`). */
export interface StudioPintaDrawingSummary {
  id: string
  /** Nome kebab-case (o mesmo que vira nome de imagem no projeto). */
  name: string
  role: 'sprite' | 'background' | 'tileset' | 'tilemap'
  /** Ausente/undefined = tilemap (papel dos dois estilos). */
  style?: 'pixel' | 'vector' | null
  updatedAt: number
  /** Nome do jogo do Pensa, quando o desenho pertence a um. */
  projectName?: string
  /** PNG ou SVG dataUrl pequeno; null → a UI mostra o emoji do tipo. */
  thumbDataUrl: string | null
}

export type StudioPintaImportResult =
  | {
      ok: true
      /**
       * O desenho exportado, JÁ gravado na biblioteca pessoal pelo host (o nome
       * pode ganhar sufixo no upsert — use ESTE nome). Os metadados chegam
       * `unknown` e o `addAsset` re-sanitiza no `#core`, como no upload.
       */
      asset: {
        id: string
        name: string
        dataUrl: string
        width?: number
        height?: number
        sprite?: unknown
        tileset?: unknown
        tilemap?: unknown
        /** Revisão persistida na biblioteca pessoal pelo host. */
        libRevision?: number
      }
    }
  | {
      /** Mensagem amigável pronta para exibir na modal. */
      ok: false
      error: string
      /** Razão tipada opcional — `not-found` faz a modal remover o card. */
      code?: 'not-found' | 'too-big' | 'raster-failed'
    }

export interface StudioPintaLibraryAdapter {
  /** Todos os desenhos do perfil, mais recente primeiro. Rejeição → erro na modal. */
  list(): Promise<StudioPintaDrawingSummary[]>
  /** Exporta + grava na biblioteca pessoal; o Studio faz o `addAsset` com o retorno. */
  import(drawingId: string): Promise<StudioPintaImportResult>
}

const StudioPintaLibraryContext = createContext<StudioPintaLibraryAdapter | null>(null)

export const StudioPintaLibraryProvider = StudioPintaLibraryContext.Provider

/** Adapter do "Trazer do Pinta" (`null` quando o host não passou um). */
export function useStudioPintaLibrary(): StudioPintaLibraryAdapter | null {
  return useContext(StudioPintaLibraryContext)
}
