import { createContext, useContext } from 'react'
import type { StudioMoldaImportResult } from './molda-library'
import type { StudioPintaImportResult } from './pinta-library'

/**
 * TRAZER DA EQUIPE (14/10/2026) — capacidade OPCIONAL do host (community-kids) para o
 * Estúdio de QUEM PROGRAMA um plano do Pensa em equipe: listar as artes ENTREGUES pelas
 * colegas nas missões do plano (Pinta e Molda, concluídas por OUTRA pessoa) e trazer uma
 * para os materiais do jogo.
 *
 * O Studio só desenha a janela e chama o adapter; quem fala com o servidor (a lista, o
 * arquivo da colega, a conversão pelo Pinta ou pelo Molda e a gravação em
 * `@sistemazero/studio/personal-assets`) é o host. Os tipos abaixo são ESPELHOS declarados
 * (zero import do core do Pensa aqui), mesma regra do `pintaLibrary`/`moldaLibrary`.
 *
 * O import devolve o MESMO resultado do "Trazer do Pinta" (desenho) ou do "Trazer do Molda"
 * (3D), e a janela entra pelo MESMO caminho de "adicionar ao projeto" das duas
 * (`components/assets/addCreationToProject.ts`): o asset ganha o `libId personal:<id>` e o
 * `libOrigin` de quem fez, e trazer de novo atualiza o que já está no jogo.
 *
 * ⚠️ NÃO latchado no `StudioCore` (diferente do Pinta e do Molda): o host só descobre se o
 * plano tem equipe e arte entregue DEPOIS de abrir o jogo, e o botão aparece quando a
 * resposta chega. O host passa uma referência ESTÁVEL (memo), e `null`/ausente = sem botão
 * (aula, admin, jogo fora do Pensa, plano solo, nenhuma arte entregue).
 */

/** O tipo da arte, no idioma da janela: desenho do Pinta ou as três criações do Molda. */
export type StudioTeamArtKind = 'drawing' | 'model' | 'texture' | 'sky'

/** Uma arte entregue numa missão do plano por outra pessoa da equipe. */
export interface StudioTeamArtSummary {
  /** O que o `import` recebe (o host usa o id da MISSÃO). */
  id: string
  /**
   * O id com que a arte entra na biblioteca pessoal (e vira o `libId personal:<id>` no
   * projeto): é o que acende o "✓ no projeto", e o `import` devolve o MESMO id. O host o
   * escolhe (o kids usa uma cópia por missão). Ausente = a janela não sabe dizer se já está
   * no jogo.
   */
  assetId?: string
  /** Nome da arte (o que aparece no cartão). */
  name: string
  kind: StudioTeamArtKind
  /** 1º nome de quem fez ("Colega" quando o host não sabe). */
  byName: string
  /** O título da missão em que a arte foi entregue. */
  missionTitle: string
  /** Miniatura pequena; `null` → a janela mostra o emoji do tipo. */
  thumbDataUrl: string | null
}

/**
 * O resultado de trazer: o mesmo do Pinta ou do Molda, com a ferramenta que fez a arte.
 * Erros antes de saber o formato (rede, arquivo ilegível) vêm no `result` da ferramenta do
 * cartão, com a frase pronta para a criança.
 */
export type StudioTeamImportResult =
  | { tool: 'pinta'; result: StudioPintaImportResult }
  | { tool: 'molda'; result: StudioMoldaImportResult }

export interface StudioTeamLibraryAdapter {
  /** As artes entregues pela equipe, mais recente primeiro. Rejeição → erro na janela. */
  list(): Promise<StudioTeamArtSummary[]>
  /**
   * Baixa, converte e grava na biblioteca pessoal; o Studio faz o "adicionar ao projeto"
   * com o retorno. `acceptedReview` é a resposta ao `needs-review` do Molda (o mesmo
   * consentimento do "Trazer do Molda").
   */
  import(id: string, options?: { acceptedReview?: string }): Promise<StudioTeamImportResult>
}

const StudioTeamLibraryContext = createContext<StudioTeamLibraryAdapter | null>(null)

export const StudioTeamLibraryProvider = StudioTeamLibraryContext.Provider

/** Adapter do "Trazer da equipe" (`null` quando o host não passou um). */
export function useStudioTeamLibrary(): StudioTeamLibraryAdapter | null {
  return useContext(StudioTeamLibraryContext)
}
