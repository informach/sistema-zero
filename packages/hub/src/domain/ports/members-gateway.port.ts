export interface CourseAccessResult {
  /** Subconjunto dos `courseRefs` pedidos em que o usuário tem matrícula ATIVA. */
  granted: string[]
  /** O usuário tem uma chave-mestra (`all_courses`) ATIVA? (cobre só cursos adult). */
  hasMaster: boolean
}

/**
 * Porta para o serviço de membros (S2S). Resolve, em lote, quais cursos o usuário
 * acessa — usado para gatear servidores/canais `course_gated`. Implementação HTTP
 * em `infrastructure/gateways/members-http.gateway.ts`.
 */
export interface MembersGateway {
  checkAccess(userId: string, courseRefs: string[]): Promise<CourseAccessResult>
}
