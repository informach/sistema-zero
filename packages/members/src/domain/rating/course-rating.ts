/**
 * Classificação do curso pelo aluno (estilo Udemy): nota 1–5 com meia estrela,
 * justificativa livre e respostas opcionais a perguntas fixas de feedback.
 * 1 linha por (aluno, curso); cada passo do fluxo persiste o estado ACUMULADO.
 */

/** Perguntas fixas do passo "Conte-nos mais (opcional)" — ordem de exibição. */
export const COURSE_FEEDBACK_QUESTION_KEYS = [
  'importantInfo',
  'clearExplanations',
  'engagingInstructor',
  'enoughPractice',
  'meetsExpectations',
  'knowledgeable',
] as const

export type CourseFeedbackQuestionKey = (typeof COURSE_FEEDBACK_QUESTION_KEYS)[number]

export type CourseFeedbackAnswer = 'yes' | 'no' | 'unsure'

/** Respostas parciais (toda pergunta é opcional). */
export type CourseFeedbackAnswers = Partial<Record<CourseFeedbackQuestionKey, CourseFeedbackAnswer>>

/**
 * A nota é persistida como `ratingHalf` = nota×2 (inteiro 2..10) — evita float
 * no banco e a serialização string do `numeric` do Drizzle. A conversão ×2/÷2
 * vive SÓ na borda: rota (entrada) e mapper (saída).
 */
export const COURSE_RATING_HALF_MIN = 2
export const COURSE_RATING_HALF_MAX = 10

export function isValidRatingHalf(value: number): boolean {
  return (
    Number.isInteger(value) && value >= COURSE_RATING_HALF_MIN && value <= COURSE_RATING_HALF_MAX
  )
}

export interface CourseRating {
  id: string
  userId: string
  courseId: string
  /** Nota×2 (2..10) — ver comentário acima. */
  ratingHalf: number
  comment: string | null
  feedbackAnswers: CourseFeedbackAnswers | null
  createdAt: Date
  updatedAt: Date
}
