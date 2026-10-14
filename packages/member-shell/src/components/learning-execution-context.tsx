'use client'

import type {
  LearningAnswers,
  LearningAttemptView,
  LearningBlockProgress,
} from '@sistemazero/core/learning'
import type { StudioPlayerOriginAdapter } from '@sistemazero/studio/player'
import { createContext, useContext, useMemo } from 'react'
import { apiSend } from '../lib/api'
import { useLessonPlayer } from './lesson-player-context'

export interface LearningProgressCommand {
  revision: string
  answers: LearningAnswers
  hintsUsed: number
  positionSeconds: number | null
}
export type LearningAttemptCommand = Omit<LearningProgressCommand, 'positionSeconds'> & {
  id: string
}
export type LearningAttemptResponse = {
  attempt: LearningAttemptView
  progress: LearningBlockProgress
}

/** Execution belongs to its real host; a live meeting never pretends to be a recorded lesson. */
export interface LearningExecutionAdapter {
  context: 'recorded' | 'live'
  viewerId: string | null
  /** Keeps the existing recorded draft namespace; live supplies its own session namespace. */
  scopeId: string
  progress: LearningBlockProgress[]
  onProgress?(progress: LearningBlockProgress): void
  refresh?(): void
  saveProgress(blockId: string, input: LearningProgressCommand): Promise<LearningBlockProgress>
  attempt(blockId: string, input: LearningAttemptCommand): Promise<LearningAttemptResponse>
}
const ExecutionContext = createContext<LearningExecutionAdapter | null>(null)
export const LearningExecutionProvider = ExecutionContext.Provider
const PresentationContext = createContext<{
  projectOriginAdapter?: StudioPlayerOriginAdapter
  keepLessonVisible?: boolean
}>({})
export const LearningPresentationProvider = PresentationContext.Provider
export function useLearningPresentation() {
  return useContext(PresentationContext)
}

export function useLearningExecution(): LearningExecutionAdapter | null {
  const explicit = useContext(ExecutionContext)
  const player = useLessonPlayer()
  return useMemo(() => {
    if (explicit) return explicit
    if (!player) return null
    const base = (blockId: string) =>
      `/api/members/lessons/${encodeURIComponent(player.lessonId)}/blocks/${encodeURIComponent(blockId)}`
    const headers = { 'x-sz-viewer': player.viewerId ?? '' }
    return {
      context: 'recorded',
      viewerId: player.viewerId,
      scopeId: player.lessonId,
      progress: player.learningProgress?.blocks ?? [],
      onProgress: player.onLearningProgress,
      refresh: player.refreshAfterLearning,
      saveProgress: (blockId, input) =>
        apiSend(`${base(blockId)}/learning-progress`, 'POST', input, headers, { keepalive: true }),
      attempt: (blockId, input) =>
        apiSend(`${base(blockId)}/learning-attempts`, 'POST', input, headers),
    } satisfies LearningExecutionAdapter
  }, [explicit, player])
}
