import type { RecentLessonActivity } from './progress-repository.port'

/**
 * Posição de reprodução por aluno+aula (1 linha, upsert) — também serve de
 * "last-accessed" do curso (a linha mais recente por `updatedAt`).
 */
export interface VideoPositionRepository {
  /** Grava/atualiza a posição (ON CONFLICT (userId, lessonId) DO UPDATE). */
  upsert(
    userId: string,
    lessonId: string,
    courseId: string,
    positionSeconds: number,
    now: Date,
  ): Promise<void>
  /** Posição salva da aula (ou `null` se o aluno nunca tocou o vídeo). */
  findPosition(userId: string, lessonId: string): Promise<number | null>
  /** Última aula acessada no curso (maior `updatedAt`) — ou `null`. */
  lastAccessedLessonId(userId: string, courseId: string): Promise<string | null>
  /** Última aula acessada por curso, em lote (evita N+1 em listagens). courseId → lessonId. */
  lastAccessedByCourseIds(userId: string, courseIds: string[]): Promise<Map<string, string>>
  /**
   * Último ACESSO por curso (max `updatedAt`), sobre TODOS os cursos do aprendiz —
   * par do `ProgressRepository.lastCompletionByCourse` no "última atividade" da
   * ficha admin.
   */
  lastAccessByCourse(userId: string): Promise<Map<string, Date>>
  /** Último acesso por aprendiz e curso em uma única consulta. */
  lastAccessByUsers(userIds: string[]): Promise<Map<string, Map<string, Date>>>
  /**
   * Aulas acessadas mais recentes do aluno (ficha admin — linha do tempo), com
   * aula/curso resolvidos por join. Limitado a `limit` (mais recentes primeiro).
   */
  listRecentAccessed(userId: string, limit: number): Promise<RecentLessonActivity[]>
}
