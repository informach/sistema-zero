import type {
  LessonDraft,
  LessonDraftCommand,
  LessonDraftDocument,
  LessonDraftIssue,
} from '@sistemazero/core/learning'

export interface LessonDraftRepository {
  read(lessonId: string): Promise<LessonDraft>
  change(lessonId: string, authorId: string, command: LessonDraftCommand): Promise<LessonDraft>
  replace(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
    document: LessonDraftDocument,
  ): Promise<LessonDraft>
  publish(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
    readyVideoIds: string[],
  ): Promise<LessonDraft>
  validate(
    lessonId: string,
    expectedRevision: string,
    readyVideoIds: string[],
  ): Promise<LessonDraftIssue[]>
  unpublish(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
  ): Promise<LessonDraft>
}
