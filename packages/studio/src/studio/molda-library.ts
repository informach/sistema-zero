import { createContext, useContext } from 'react'

/**
 * TRAZER DO MOLDA — capacidade OPCIONAL do host (community-kids) para o Estúdio
 * Completo: listar TODAS as criações da galeria do Molda (modelos `.glb`, texturas
 * `.png` e céus `.hdr`) e importar uma por id, direto do painel de Imagens. É o
 * mesmo fluxo PULL do "Trazer do Pinta": a criança não precisa lembrar o que já
 * "enviou" — ela abre a galeria de lá daqui.
 *
 * O Studio só desenha a modal (busca + grade + selo "no projeto") e chama o
 * adapter; quem fala com o Molda é o host, via o subpath
 * `@sistemazero/molda/studio-library` (zero import molda↔studio — os tipos abaixo
 * são ESPELHOS declarados, mesma regra do `PersonalAsset`). Default `null` → sem
 * botão, que é o certo no embed do admin e no bloco de aula.
 *
 * O import do host DEVE também gravar a criação em
 * `@sistemazero/studio/personal-assets` (com o `kind`, o `originalFileName` e
 * `origin: 'molda'`): é o elo `libId personal:<id>` que dá o selo "✓ no projeto", e
 * a origem é o que impede a textura de aparecer como "desenho para editar no Pinta".
 */

/** O tipo da criação na galeria do Molda (espelho do `MoldaAssetKind`). */
export type StudioMoldaCreationKind = 'model' | 'texture' | 'sky'

/** Resumo de uma criação da galeria do Molda (espelho do `MoldaLibraryItem`). */
export interface StudioMoldaCreationSummary {
  id: string
  /** Nome kebab-case (o mesmo que vira nome do asset no projeto). */
  name: string
  kind: StudioMoldaCreationKind
  updatedAt: number
  /** JPEG/PNG data URL pequeno; null → a UI mostra o emoji do tipo. */
  thumbDataUrl: string | null
}

export type StudioMoldaImportResult =
  | {
      ok: true
      /**
       * A criação exportada, JÁ gravada na biblioteca pessoal pelo host (o nome
       * pode ganhar sufixo no upsert — use ESTE nome).
       */
      asset: {
        id: string
        name: string
        /** O `ProjectAsset.kind` que a criação vira (modelo, textura, céu). */
        kind: 'model3d' | 'image' | 'environment3d'
        dataUrl: string
        /**
         * `<nome>.glb` | `.png` | `.hdr` — o `addAsset` cruza extensão × MIME ×
         * assinatura binária (um `.glb` com bytes de HDR é recusado na porta).
         */
        originalFileName: string
        /** Só a textura (imagem). */
        width?: number
        height?: number
        /** Revisão persistida na biblioteca pessoal pelo host. */
        libRevision?: number
      }
    }
  | {
      /** Mensagem amigável pronta para exibir na modal. */
      ok: false
      error: string
      /** Razão tipada opcional — `not-found` faz a modal remover o card. */
      code?: 'not-found' | 'too-big' | 'encode-failed'
    }

export interface StudioMoldaLibraryAdapter {
  /** Todas as criações do perfil, mais recente primeiro. Rejeição → erro na modal. */
  list(): Promise<StudioMoldaCreationSummary[]>
  /** Exporta + grava na biblioteca pessoal; o Studio faz o `addAsset` com o retorno. */
  import(creationId: string): Promise<StudioMoldaImportResult>
}

const StudioMoldaLibraryContext = createContext<StudioMoldaLibraryAdapter | null>(null)

export const StudioMoldaLibraryProvider = StudioMoldaLibraryContext.Provider

/** Adapter do "Trazer do Molda" (`null` quando o host não passou um). */
export function useStudioMoldaLibrary(): StudioMoldaLibraryAdapter | null {
  return useContext(StudioMoldaLibraryContext)
}
