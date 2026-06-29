import { createContext, useContext } from 'react'
import type { Project } from '#core'

/**
 * COMPARTILHAR — publicar o projeto no "Mural dos Criadores".
 *
 * O botão "Compartilhar" da Topbar aparece SÓ quando o host fornece um adapter.
 * Toda a parte de rede/servidor (gerar descrição com IA, subir print + projeto,
 * criar o post no Mural, gerar o link público de jogar) vive no HOST
 * (community-kids via member-shell). O Studio só ORQUESTRA a UX (confirmação,
 * edição da descrição, captura do print) e delega as duas operações de I/O ao
 * adapter — assim o pacote continua sem nenhum conhecimento de R2/hub/IA.
 *
 * Genérico de propósito: o mesmo adapter serve ao estúdio de AULA (`<StudioLesson>`,
 * hoje) e ao estúdio COMPLETO independente (`<StudioEditor>`, produto futuro) — os
 * dois recebem a prop `share`.
 *
 * Segue o padrão do {@link useStudioActivity}: contexto INTERNO, latchado uma vez
 * por instância (valor estável), default `null` (sem adapter → sem botão), e NÃO
 * exportado pelo index — só os TIPOS do adapter são públicos.
 */

/** Links devolvidos pela publicação (o que a tela de sucesso mostra). */
export interface StudioShareResult {
  /** Página do Mural onde o projeto aparece (fechado, só comunidade). Opcional. */
  muralUrl?: string
  /** Página PÚBLICA de jogar (sem login), só o jogo + título. Opcional. */
  playUrl?: string
}

/** Entrada de {@link StudioShareAdapter.generateDescription}. */
export interface StudioShareGenerateInput {
  project: Project
  /** Título atual (default = `project.name`) — contextualiza o servidor. */
  title: string
}

/** Entrada de {@link StudioShareAdapter.publish}. */
export interface StudioSharePublishInput {
  project: Project
  /**
   * Imagem da capa (data URL) — print automático do jogo OU upload da criança.
   * `null` quando a criança optou pela capa padrão do curso (ver `useAdminCover`).
   */
  coverDataUrl: string | null
  /**
   * `true` = usar a capa padrão configurada pelo admin (o HOST resolve a URL de
   * forma autoritativa no servidor). Mutuamente exclusivo com `coverDataUrl`.
   */
  useAdminCover?: boolean
  title: string
  /** Descrição final, já revisada/editada pela criança. */
  description: string
}

/**
 * Implementado pelo HOST. Duas operações assíncronas; o Studio não sabe (nem
 * precisa saber) como elas funcionam por dentro.
 */
export interface StudioShareAdapter {
  /**
   * Título inicial do post. Ausente (ex.: Estúdio Completo) → cai no nome do projeto.
   */
  presetTitle?: string
  /**
   * `false` quando o título é autoritativo do host/servidor e não deve aparecer como
   * campo editável na UX. Default `true` para o Estúdio Completo/standalone.
   */
  titleEditable?: boolean
  /**
   * Descrição inicial do post. Na AULA, é o resumo do admin (a criança só ajusta);
   * abre já preenchido. No Estúdio Completo costuma vir vazio (a IA gera o rascunho).
   */
  presetDescription?: string
  /**
   * URL da capa PADRÃO configurada pelo admin (vitrine da aula). Quando presente,
   * o ShareDialog oferece "usar a capa do curso" como fallback do print e a usa no
   * preview. O HOST re-resolve a URL no servidor ao publicar (não confia no cliente).
   */
  presetCoverUrl?: string
  /**
   * Gera um rascunho CURTO (≤1 parágrafo, PT) via SERVIDOR (chave no servidor).
   * NUNCA usa a BYOK do painel de IA do aluno. Pode rejeitar/voltar vazio — o
   * dialog cai no modo "escreva você mesmo" sem travar a publicação.
   *
   * **OPCIONAL**: ausente → o dialog NÃO mostra o botão "Gerar/Regerar" nem gera
   * automaticamente (caso do Estúdio da AULA, onde o projeto já é conhecido e o
   * admin define o resumo — a criança só ajusta). Presente → IA disponível (Estúdio
   * Completo, onde o projeto é livre e ninguém sabe do que se trata).
   */
  generateDescription?(input: StudioShareGenerateInput): Promise<string>
  /** Publica no Mural. Resolve com os links; rejeita em falha (mensagem ao aluno). */
  publish(input: StudioSharePublishInput): Promise<StudioShareResult>
  /**
   * Opcional: chamado UMA vez quando a publicação dá certo (com os links). Presente → o
   * `ShareDialog` NÃO mostra a própria tela de sucesso: fecha e deixa o HOST comemorar (ex.: o
   * overlay do Zappy no kids, com o "Jogar"). Ausente (ex.: Estúdio Completo) → tela padrão.
   */
  onPublished?(result: StudioShareResult): void
}

// Contexto INTERNO (como o StudioActivityContext): `null` = sem adapter → o botão
// "Compartilhar" não aparece. Provido SÓ pelo StudioCore quando o host passa `share`.
const StudioShareContext = createContext<StudioShareAdapter | null>(null)

export const StudioShareProvider = StudioShareContext.Provider

/** Adapter de compartilhar da instância atual (`null` quando o host não passou um). */
export function useStudioShare(): StudioShareAdapter | null {
  return useContext(StudioShareContext)
}

/**
 * Motivo de DESABILITAR o botão Compartilhar (tooltip), ou `null` = habilitado.
 * Diferente do adapter, este valor é VOLÁTIL (lido ao vivo, NÃO latchado): o host
 * troca conforme o estado (ex.: habilita após a entrega ao professor). `null`
 * default → botão habilitado quando há adapter.
 */
const StudioShareDisabledContext = createContext<string | null>(null)

export const StudioShareDisabledProvider = StudioShareDisabledContext.Provider

export function useStudioShareDisabledReason(): string | null {
  return useContext(StudioShareDisabledContext)
}
