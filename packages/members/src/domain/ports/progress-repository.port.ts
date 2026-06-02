/** Progresso por aluno: conclusão de aulas (fato leve) + agregações derivadas. */
export interface ProgressRepository {
  /** Marca a aula como concluída. Idempotente (ON CONFLICT DO NOTHING). */
  markComplete(userId: string, lessonId: string, courseId: string, now: Date): Promise<void>
  /** Quantas aulas do curso o aluno concluiu. */
  countCompleted(userId: string, courseId: string): Promise<number>
  /** Ids das aulas concluídas pelo aluno no curso (para marcar `completed` no outline). */
  listCompletedLessonIds(userId: string, courseId: string): Promise<string[]>
  /** Data da última conclusão no curso (ou `null`). */
  lastCompletedAt(userId: string, courseId: string): Promise<Date | null>
}
