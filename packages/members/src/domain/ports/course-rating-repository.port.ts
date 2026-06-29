import type { CourseFeedbackAnswers, CourseRating } from '../rating/course-rating'

export interface CourseRatingUpsert {
  ratingHalf: number
  comment: string | null
  feedbackAnswers: CourseFeedbackAnswers | null
}

/** Classificação dada por um aluno, com o curso resolvido (ficha admin). */
export interface MemberCourseRating extends CourseRating {
  /** Título do curso atual (join; `null` se o curso foi apagado). */
  courseTitle: string | null
  /** Slug do curso atual (join; `null` se apagado). */
  courseRef: string | null
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
  /**
   * Classificações que um aluno deu, mais recentes primeiro, com o curso resolvido
   * (join `courses`). Visão admin (ficha do aluno). Curso apagado → título/ref `null`.
   */
  listByUser(userId: string): Promise<MemberCourseRating[]>
}
