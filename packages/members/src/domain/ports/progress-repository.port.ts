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

/** Uma aula tocada/concluída recentemente (ficha admin), com a aula/curso resolvidos. */
export interface RecentLessonActivity {
  lessonId: string
  lessonTitle: string | null
  courseTitle: string | null
  at: Date
}

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
  /** Concluídas por aprendiz e curso em uma única consulta (ficha admin da família). */
  countCompletedByUsersAndCourseIds(
    userIds: string[],
    courseIds: string[],
  ): Promise<Map<string, Map<string, number>>>
  /** Concluídas de aulas PUBLICADAS (visão do aluno — par do `countPublishedLessons`). */
  countCompletedPublished(userId: string, courseId: string): Promise<number>
  /** Concluídas de aulas PUBLICADAS por curso, em lote (visão do aluno, sem N+1). */
  countCompletedPublishedByCourseIds(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, number>>
  /** Ids das aulas concluídas pelo aluno no curso (para marcar `completed` no outline). */
  listCompletedLessonIds(userId: string, courseId: string): Promise<string[]>
  /** Ids das aulas concluídas por curso, em lote (evita N+1 na trava de "meus cursos"). */
  listCompletedLessonIdsByCourseIds(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, string[]>>
  /** Data da última conclusão no curso (ou `null`). */
  lastCompletedAt(userId: string, courseId: string): Promise<Date | null>
  /**
   * Última CONCLUSÃO por curso (max `completedAt`), sobre TODOS os cursos do
   * aprendiz — metade do "última atividade" da ficha admin (a outra metade vem do
   * `VideoPositionRepository.lastAccessByCourse`; o service faz o max dos dois).
   */
  lastCompletionByCourse(userId: string): Promise<Map<string, Date>>
  /** Última conclusão por aprendiz e curso em uma única consulta. */
  lastCompletionByUsers(userIds: string[]): Promise<Map<string, Map<string, Date>>>
  /**
   * Aulas concluídas mais recentes do aluno (ficha admin — linha do tempo), com
   * aula/curso resolvidos por join. Limitado a `limit` (mais recentes primeiro).
   */
  listRecentCompletions(userId: string, limit: number): Promise<RecentLessonActivity[]>
}
