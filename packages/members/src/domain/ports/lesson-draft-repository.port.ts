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
  /** O que está publicado AGORA, no formato do rascunho (o painel compara com ele). */
  readPublished(lessonId: string): Promise<{ document: LessonDraftDocument; revision: string }>
  /** Traz o publicado de volta: `'all'` substitui tudo; uma lista traz só aquelas peças. */
  restorePublished(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
    ids: string[] | 'all',
  ): Promise<LessonDraft>
  /** Desfaz a última restauração — vale só até a próxima alteração do rascunho. */
  undoRestore(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
  ): Promise<LessonDraft>
  unpublish(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
  ): Promise<LessonDraft>
}
