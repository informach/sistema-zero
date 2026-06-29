import type { CourseAudience } from '../course/course'

/** Curso + contagem de aulas publicadas (base do overview de analytics). */
export interface CourseLessonCount {
  courseId: string
  courseRef: string
  title: string
  audience: CourseAudience
  status: string
  publishedLessons: number
}

/** Uma aula no funil de um curso (ordem do curso) + quantos a concluíram. */
export interface LessonFunnelRow {
  lessonId: string
  title: string
  moduleTitle: string
  completions: number
}

/**
 * Leituras agregadas para analytics de APRENDIZADO (admin). Tudo derivado das
 * conclusões (`lesson_completions`) sobre as aulas PUBLICADAS — sem tocar
 * matrícula/chave-mestra (o foco é engajamento/funil, não acesso). Read-only.
 */
export interface AnalyticsRepository {
  /** Cursos não-rascunho com a contagem de aulas publicadas (ordenado por título). */
  coursesWithLessonCounts(): Promise<CourseLessonCount[]>
  /** courseId → nº de aprendizes que concluíram ≥1 aula publicada (engajaram). */
  startedCountsByCourse(): Promise<Map<string, number>>
  /** courseId → nº de aprendizes que concluíram TODAS as aulas publicadas. */
  completedCountsByCourse(): Promise<Map<string, number>>
  /** Funil por aula de um curso: aulas publicadas na ordem do curso + conclusões. */
  lessonFunnel(courseId: string): Promise<LessonFunnelRow[]>
  /**
   * `started`/`completed` de UM curso — filtrado por courseId (índice-friendly),
   * para o funil NÃO recomputar os agregados globais de todos os cursos. Curso
   * rascunho/inexistente → `{started:0, completed:0}` (espelha o overview).
   */
  startedAndCompletedForCourse(courseId: string): Promise<{ started: number; completed: number }>
}
