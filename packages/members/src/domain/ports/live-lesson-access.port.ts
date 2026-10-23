import type { CourseAudience } from '../course/course'

/** Uma aula do curso ao vivo aberta pela vaga da criança, até `endsAt` (fim do grant). */
export interface LiveOpenLesson {
  lessonId: string
  endsAt: Date
}

/**
 * Acesso a curso AO VIVO (14/10/2026). O curso `live` não se libera por matrícula nem pela
 * chave-mestra: a aula abre para quem tem `live_access_grants` ATIVO da sessão daquela aula
 * (vaga ativa, grant não revogado, dentro do prazo, turma fora de rascunho), para a professora
 * atribuída a uma turma do curso e para a equipe (quem decide isso é o `CheckAccessService`).
 *
 * As turmas e os encontros guardam a ligação com o curso no DOCUMENTO
 * (`live_cohorts.document->>'courseId'`, `live_sessions.document->>'lessonId'`), o contrato do
 * `@sistemazero/core/live`.
 */
export interface LiveLessonAccessPort {
  /**
   * As aulas do curso que esta criança pode abrir AGORA (a sessão da aula tem grant ativo na
   * vaga dela), com o fim do prazo de cada uma. Vazio = sem acesso a nenhuma aula neste instante.
   */
  openLessons(input: {
    accountId: string
    learnerId: string
    courseId: string
    now: Date
  }): Promise<LiveOpenLesson[]>
  /** A pessoa (equipe) é professora atribuída a alguma turma deste curso? */
  isAssignedTeacher(input: { teacherId: string; courseId: string }): Promise<boolean>
  /**
   * A criança tem vaga ATIVA numa turma de curso ao vivo DESTA plataforma: matrícula ativa com
   * algum grant não revogado que ainda não venceu, numa turma aberta ou fechada (nem rascunho
   * nem arquivada). É o que libera a missão semanal `live_encounter`.
   */
  hasActiveSeat(input: {
    accountId: string
    learnerId: string
    audience: CourseAudience
    now: Date
  }): Promise<boolean>
}
