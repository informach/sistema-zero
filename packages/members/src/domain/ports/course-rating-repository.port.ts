import type { CourseFeedbackAnswers, CourseRating } from '../rating/course-rating'

export interface CourseRatingUpsert {
  ratingHalf: number
  comment: string | null
  feedbackAnswers: CourseFeedbackAnswers | null
}

export interface CourseRatingRepository {
  find(userId: string, courseId: string): Promise<CourseRating | null>
  /**
   * Upsert com semântica de OVERWRITE puro (não merge): o client manda sempre o
   * estado ACUMULADO do fluxo (a nota está presente em todo passo). `createdAt`
   * do 1º registro é preservado; `updatedAt` avança a cada chamada.
   */
  upsert(
    userId: string,
    courseId: string,
    fields: CourseRatingUpsert,
    now: Date,
  ): Promise<CourseRating>
}
