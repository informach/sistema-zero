import type { LessonSection } from '@sistemazero/core/learning'
import type { LessonWithContent } from '../course/course'
import type { LessonBlockContent } from '../course/lesson-block'
import type { LessonStructure } from './learning-repository.port'

export interface LearningImportSnapshot {
  lesson: LessonWithContent
  structure: LessonStructure | null
}
export interface LearningImportPlan {
  lessonId: string
  fingerprint: string
  title: string
  sections: LessonSection[]
  blocks: Array<{
    id: string
    content: LessonBlockContent
    action: 'create' | 'update' | 'preserve'
  }>
  warnings: string[]
}
export interface LearningImportRepository {
  snapshot(lessonId: string): Promise<LearningImportSnapshot | null>
  apply(plan: LearningImportPlan): Promise<void>
}
