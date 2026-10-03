'use client'

import type {
  LearningBlockProgress,
  LessonLearningProgress,
  PlatformActionResult,
  VideoWatchCoverage,
} from '@sistemazero/core/learning'
import { createContext, type ReactNode, useContext } from 'react'
import type { DialogueSpeech } from './dialogue-block'

/** O que um player de vídeo da aula sabe fazer a pedido de fora (o flutuante e o aviso). */
export type LessonVideoControls = { play: () => void; pause: () => void }

/**
 * Contexto provido pelo `LessonPlayer` aos blocos da aula (evita prop-drilling
 * por `LessonBlocks` → `BlockRenderer`). Fora do player (não acontece hoje) os
 * blocos exibem a prévia sem watermark ou persistência de posição.
 */
export interface LessonPlayerContextValue {
  /**
   * O rótulo técnico da regra de conclusão. No Kids, toda etapa participa da aula e a criança
   * acompanha o percurso pela barra de progresso, então esse aviso não acrescenta orientação.
   */
  showActivityRequirement?: boolean
  renderInstruction?: (
    text: string,
    pose?: 'speaking' | 'thinking' | 'celebrating',
    speech?: DialogueSpeech,
  ) => ReactNode
  renderActionEvidence?: (result: PlatformActionResult) => ReactNode
  refreshAfterLearning?: () => void
  sectionProjectCheck?: {
    sectionId: string
    revision: string
    blockId: string
    objectives?: { id: string; label: string }[]
  }
  submissionAllowedBlockIds?: string[]
  learningProgress?: LessonLearningProgress
  onLearningProgress?: (progress: LearningBlockProgress) => void
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
  onVideoCoverage?: (coverage: VideoWatchCoverage) => void
  /**
   * O vídeo começou ou parou de tocar. Quem liga é o `LessonSections`, POR BLOCO (o `BlockScope`
   * amarra o id): é o que decide se, ao ampliar a atividade, o vídeo vira o flutuante.
   */
  onVideoPlayingChange?: (playing: boolean) => void
  /** O player entrega como dar play e pausa nele (`null` ao desmontar). Mesmo dono do anterior. */
  registerVideoControls?: (controls: LessonVideoControls | null) => void
  /**
   * O mascote do aviso "assista ao vídeo primeiro". O shell não conhece o Zappy: o kids passa o
   * dele, o adulto e o admin ficam sem.
   */
  videoGateMascot?: ReactNode
  videoWatchRequiredBlockIds?: string[]
  materialRequiredBlockIds?: string[]
  materialRequiredItems?: { blockId: string; itemIds: string[] }[]
  materialAccessed?: boolean
  onMaterialAccess?: (method: 'opened' | 'downloaded') => Promise<void>
  /** Atualiza o estado do quiz e o gate da aula após responder. */
  refreshAfterQuiz?: () => void
  /** Re-renderiza a página após o envio do projeto do Estúdio (destrava o gate). */
  refreshAfterStudio?: () => void
}

const LessonPlayerContext = createContext<LessonPlayerContextValue | null>(null)

export const LessonPlayerProvider = LessonPlayerContext.Provider

export function useLessonPlayer(): LessonPlayerContextValue | null {
  return useContext(LessonPlayerContext)
}
