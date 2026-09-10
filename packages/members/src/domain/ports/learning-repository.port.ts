import type {
  LearningAttemptView,
  LearningBlockProgress,
  LearningTopicSummary,
  LessonLearningProgress,
  LessonSection,
  SectionProgressRecord,
} from '@sistemazero/core/learning'
import type { CourseAudience } from '../course/course'

export interface LessonStructure {
  supportBlockIds?: string[]
  revision: string
  sections: LessonSection[]
}
export interface LearningOwner {
  userId: string
  accountId: string
}
export interface SaveLearningProgress extends LearningOwner {
  lessonId: string
  progress: LearningBlockProgress
}
export interface LearningRepository {
  getSectionProgress(owner: LearningOwner, lessonId: string): Promise<SectionProgressRecord[]>
  saveSectionProgress(
    owner: LearningOwner,
    lessonId: string,
    structureRevision: string,
    records: SectionProgressRecord[],
    blockRevisions: { id: string; revision: string }[],
  ): Promise<void>
  getStructure(lessonId: string): Promise<LessonStructure | null>
  saveStructure(
    lessonId: string,
    expectedRevision: string | null,
    sections: LessonSection[],
  ): Promise<LessonStructure | null>
  getProgress(owner: LearningOwner, lessonId: string): Promise<LessonLearningProgress>
  saveNavigation(owner: LearningOwner, lessonId: string, sectionId: string): Promise<void>
  saveProgress(input: SaveLearningProgress): Promise<LearningBlockProgress>
  findAttempt(owner: LearningOwner, id: string): Promise<LearningAttemptView | null>
  recordAttempt(
    owner: LearningOwner,
    lessonId: string,
    attempt: LearningAttemptView,
  ): Promise<LearningBlockProgress>
  listAttempts(owner: LearningOwner, lessonId: string): Promise<LearningAttemptView[]>
  listActiveAccounts(audience: CourseAudience, since: Date, until: Date): Promise<string[]>
  listProfileIdsByAccount(accountId: string, audience: CourseAudience): Promise<string[]>
  weeklyTopics(
    accountId: string,
    userId: string,
    audience: CourseAudience,
    since: Date,
    until: Date,
  ): Promise<LearningTopicSummary[]>
}
