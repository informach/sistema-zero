export interface CourseAccessResult {
  /** Subconjunto dos `courseRefs` pedidos em que o usuário tem matrícula ATIVA. */
  granted: string[]
  /** Chave-mestra ADULTA (`all_courses`) ATIVA? Cobre só cursos/espaços `adult`. */
  hasMaster: boolean
  /** Chave-mestra KIDS (`all_kids_courses`) ATIVA? Cobre só cursos/espaços `kids`. */
  hasMasterKids: boolean
}

/** Argumentos da checagem de elegibilidade da vitrine (Mural). */
export interface ShowcaseEligibilityArgs {
  /** PERFIL de criança (autoria/entrega) — `x-auth-user-id`. */
  userId: string
  /** CONTA do responsável (acesso/matrícula) — `x-auth-account-id ?? userId`. */
  accountId: string
  lessonId: string
  blockId: string
}

/** Conteúdo AUTORITATIVO do projeto + elegibilidade (espelha o `ShowcasePayloadView` do members). */
export interface ShowcaseEligibilityResult {
  eligible: boolean
  title: string
  summary: string
  defaultCoverUrl: string | null
  chain: string | null
  courseId: string
  audience: 'adult' | 'kids'
}

/**
 * Porta para o serviço de membros (S2S). Resolve, em lote, quais cursos o usuário
 * acessa — usado para gatear servidores/canais `course_gated` — e a ELEGIBILIDADE da
 * auto-publicação no Mural (o hub não confia no corpo da publicação). Implementação
 * HTTP em `infrastructure/gateways/members-http.gateway.ts`.
 */
export interface MembersGateway {
  checkAccess(userId: string, courseRefs: string[]): Promise<CourseAccessResult>
  /** `GET /members/internal/showcase-eligibility`. Erro/timeout → lança (fail-closed). */
  getShowcaseEligibility(args: ShowcaseEligibilityArgs): Promise<ShowcaseEligibilityResult>
}
