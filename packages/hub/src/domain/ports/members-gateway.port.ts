export interface CourseAccessResult {
  /** Subconjunto dos `courseRefs` pedidos em que o usuário tem matrícula ATIVA. */
  granted: string[]
  /** Chave-mestra ADULTA (`all_courses`) ATIVA? Cobre só cursos/espaços `adult`. */
  hasMaster: boolean
  /** Chave-mestra KIDS (`all_kids_courses`) ATIVA? Cobre só cursos/espaços `kids`. */
  hasMasterKids: boolean
  /** Chaves de COMUNIDADE ativas (entitlement `community`) — gatear `community_gated`. */
  communities: string[]
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
/** Argumentos da notificação "aluno publicou no Mural" (alimenta o nível do aluno). */
export interface ShowcasePublishedArgs {
  /** PERFIL de criança (dono da gamificação) — `x-auth-user-id`. */
  userId: string
  /** CONTA do responsável (dona do perfil de gamificação) — `x-auth-account-id ?? userId`. */
  accountId: string
  /** Curso cujo projeto foi publicado (do `getShowcaseEligibility`). */
  courseId: string
  audience: 'adult' | 'kids'
}

/** Argumentos da notificação "aluno publicou no DESAFIO do mês" (XP + badge). */
export interface ChallengeEntryArgs {
  /** PERFIL de criança (dono da gamificação) — `x-auth-user-id`. */
  userId: string
  /** CONTA do responsável — `x-auth-account-id ?? userId`. */
  accountId: string
  audience: 'adult' | 'kids'
  /** `m:YYYY-MM` — o service SÓ chama com a chave já VALIDADA (posse + mês corrente). */
  challengeKey: string
}

export interface MembersGateway {
  checkAccess(
    userId: string,
    courseRefs: string[],
    communityRefs?: string[],
  ): Promise<CourseAccessResult>
  /** `GET /members/internal/showcase-eligibility`. Erro/timeout → lança (fail-closed). */
  getShowcaseEligibility(args: ShowcaseEligibilityArgs): Promise<ShowcaseEligibilityResult>
  /**
   * Avisa o members que o aluno PUBLICOU o projeto do curso no Mural — grava o marco
   * `course_showcased` (alimenta o nível do aluno). **Best-effort**: NUNCA lança (a
   * publicação não pode falhar por causa disso); o members é idempotente por user+curso.
   */
  notifyShowcasePublished(args: ShowcasePublishedArgs): Promise<void>
  /**
   * Avisa o members que o aluno publicou no Mural com a tag do DESAFIO do mês —
   * grava o marco `challenge_entry` (XP + badge). **Best-effort** como o showcase;
   * o members deduplica por mês (sourceId determinístico do monthKey).
   */
  notifyChallengeEntry(args: ChallengeEntryArgs): Promise<void>
}
