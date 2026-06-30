'use client'

import { createContext, useContext } from 'react'

/**
 * Contexto provido pelo `LessonPlayer` aos blocos da aula (evita prop-drilling
 * por `LessonBlocks` → `BlockRenderer`). Fora do player (não acontece hoje) os
 * blocos degradam graciosamente (sem watermark/posição/auto-conclusão).
 */
export interface LessonPlayerContextValue {
  lessonId: string
  courseSlug: string
  /**
   * Rótulo do watermark anti-pirataria do player de vídeo. Adulto = e-mail do
   * aluno; kids = rótulo do perfil ("Perfil <id8>", sem PII do responsável).
   */
  viewerWatermark: string | null
  /**
   * Id da sessão (no kids = PERFIL ativo; no adulto = conta). Isola o rascunho LOCAL do Estúdio
   * por perfil — irmãos no mesmo navegador não misturam o trabalho. `null` fora do player.
   */
  viewerId: string | null
  /** Posição salva do vídeo (segundos) para retomar de onde parou. */
  initialPositionSeconds: number | null
  /** A cada `timeupdate` do vídeo (o consumidor faz o throttle de persistência). */
  onVideoProgress?: (seconds: number, percent: number) => void
  /** Flush imediato da posição (pause/ended). */
  onVideoFlush?: (seconds: number) => void
  /** Atingiu ~90% assistido → auto-conclusão (uma vez por aula). */
  onVideoReachedThreshold?: () => void
  /** Marca a aula como concluída (mesmo fluxo do botão). Usado pelo quiz. */
  refreshAfterQuiz?: () => void
  /** Re-renderiza a página após o envio do projeto do Estúdio (destrava o gate). */
  refreshAfterStudio?: () => void
}

const LessonPlayerContext = createContext<LessonPlayerContextValue | null>(null)

export const LessonPlayerProvider = LessonPlayerContext.Provider

export function useLessonPlayer(): LessonPlayerContextValue | null {
  return useContext(LessonPlayerContext)
}
