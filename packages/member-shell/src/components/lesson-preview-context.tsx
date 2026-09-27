'use client'

import type {
  InteractiveBlock,
  LearningAnswers,
  LearningResult,
  QuizGrade,
} from '@sistemazero/core/learning'
import type { Project } from '@sistemazero/studio'
import { createContext, useContext } from 'react'

/** Only the admin's local rehearsal provides this context. It is deliberately separate from
 * LessonPlayerContext, so no profile, navigation endpoint or submission credential is available. */
export interface LessonPreviewContextValue {
  answers: Record<string, LearningAnswers>
  hintsUsed: Record<string, number>
  results: Record<string, LearningResult>
  workspaces: Record<string, Project>
  onWorkspaceChange: (blockId: string, project: Project) => void
  onProjectCheck: (blockId: string, project: unknown) => Promise<string>
  onChange: (blockId: string, answers: LearningAnswers, hintsUsed: number) => void
  onAttempt: (
    blockId: string,
    content: InteractiveBlock,
    answers: LearningAnswers,
  ) => Promise<LearningResult>
  onQuiz: (blockId: string, grade: QuizGrade) => Promise<void>
}
const LessonPreviewContext = createContext<LessonPreviewContextValue | null>(null)
export const LessonPreviewProvider = LessonPreviewContext.Provider
export const useLessonPreview = () => useContext(LessonPreviewContext)
