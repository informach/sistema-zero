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
  /** Print PNG (data URL) ou `null` quando o projeto não é canvas / deu timeout. */
  coverDataUrl: string | null
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
   * Gera um rascunho CURTO (≤1 parágrafo, PT) via SERVIDOR (chave no servidor).
   * NUNCA usa a BYOK do painel de IA do aluno. Pode rejeitar/voltar vazio — o
   * dialog cai no modo "escreva você mesmo" sem travar a publicação.
   */
  generateDescription(input: StudioShareGenerateInput): Promise<string>
  /** Publica no Mural. Resolve com os links; rejeita em falha (mensagem ao aluno). */
  publish(input: StudioSharePublishInput): Promise<StudioShareResult>
}

// Contexto INTERNO (como o StudioActivityContext): `null` = sem adapter → o botão
// "Compartilhar" não aparece. Provido SÓ pelo StudioCore quando o host passa `share`.
const StudioShareContext = createContext<StudioShareAdapter | null>(null)

export const StudioShareProvider = StudioShareContext.Provider

/** Adapter de compartilhar da instância atual (`null` quando o host não passou um). */
export function useStudioShare(): StudioShareAdapter | null {
  return useContext(StudioShareContext)
}
