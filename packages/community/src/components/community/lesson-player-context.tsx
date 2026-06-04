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
  /** E-mail do aluno — watermark anti-pirataria no player de vídeo. */
  viewerEmail: string | null
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
}

const LessonPlayerContext = createContext<LessonPlayerContextValue | null>(null)

export const LessonPlayerProvider = LessonPlayerContext.Provider

export function useLessonPlayer(): LessonPlayerContextValue | null {
  return useContext(LessonPlayerContext)
}
