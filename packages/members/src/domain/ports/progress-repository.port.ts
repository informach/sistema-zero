/**
 * Progresso por aluno: conclusão de aulas (fato leve) + agregações derivadas.
 *
 * Duas famílias de contagem:
 * - `countCompleted*` (cruas) — TODAS as conclusões registradas, inclusive de
 *   aulas hoje despublicadas/movidas. Visão ADMIN (numerador real vs total real).
 * - `countCompletedPublished*` — só conclusões de aulas AINDA publicadas. Visão
 *   do ALUNO: o denominador dela é `countPublishedLessons*`; sem o filtro, o
 *   numerador inflava (curso "100%" sem o aluno ter feito as aulas visíveis).
 */
export interface ProgressRepository {
  /**
   * Marca a aula como concluída. Idempotente (ON CONFLICT DO NOTHING);
   * devolve `true` quando a conclusão é NOVA (re-complete → `false`).
   */
  markComplete(userId: string, lessonId: string, courseId: string, now: Date): Promise<boolean>
  /** Quantas aulas do curso o aluno concluiu (cru — visão admin). */
  countCompleted(userId: string, courseId: string): Promise<number>
  /** Concluídas por curso, em lote (cru — visão admin). courseId → concluídas. */
  countCompletedByCourseIds(userId: string, courseIds: string[]): Promise<Map<string, number>>
  /** Concluídas de aulas PUBLICADAS (visão do aluno — par do `countPublishedLessons`). */
  countCompletedPublished(userId: string, courseId: string): Promise<number>
  /** Concluídas de aulas PUBLICADAS por curso, em lote (visão do aluno, sem N+1). */
  countCompletedPublishedByCourseIds(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, number>>
  /** Ids das aulas concluídas pelo aluno no curso (para marcar `completed` no outline). */
  listCompletedLessonIds(userId: string, courseId: string): Promise<string[]>
  /** Data da última conclusão no curso (ou `null`). */
  lastCompletedAt(userId: string, courseId: string): Promise<Date | null>
}
