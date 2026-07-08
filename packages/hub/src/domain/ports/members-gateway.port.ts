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
  /**
   * Ator é EQUIPE (superadmin/admin/staff — `actor.privileged`)? Repassado ao members
   * p/ a chave-mestra virtual: equipe publica no Mural p/ TESTAR o fluxo (o papel vem do
   * gateway; aluno comum é sempre `false`). Ver `internal.routes.ts` do members.
   */
  privileged: boolean
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

/** Argumentos da recompensa por CONTRIBUIR no Clube (dado na APROVAÇÃO do conteúdo). */
export interface ClubContributionArgs {
  /** PERFIL de criança (dono da gamificação) — o `authorId` do conteúdo. */
  userId: string
  /** CONTA do responsável (coorte da gamificação) — snapshot `authorAccountId`. */
  accountId: string
  audience: 'adult' | 'kids'
  /** Tópico ou comentário (define a fonte de XP + o valor). */
  kind: 'thread' | 'comment'
  /** Id do conteúdo aprovado — chave de IDEMPOTÊNCIA do ledger (re-aprovar é inerte). */
  contentId: string
}

/** Argumentos da missão "comentar no Mural" (marco, dado na APROVAÇÃO do comentário). */
export interface MuralCommentArgs {
  /** PERFIL de criança (dono da gamificação) — o `authorId` do comentário. */
  userId: string
  /** CONTA do responsável (coorte da gamificação) — snapshot `authorAccountId`. */
  accountId: string
  audience: 'adult' | 'kids'
  /** Id do comentário aprovado — chave de IDEMPOTÊNCIA do ledger (re-aprovar é inerte). */
  commentId: string
}

/** Argumentos da notificação "publicou jogo STANDALONE no Mural" (retenção pós-cursos). */
export interface StandaloneShowcaseArgs {
  /** PERFIL de criança (dono da gamificação) — `x-auth-user-id`. */
  userId: string
  /** CONTA do responsável — `x-auth-account-id ?? userId`. */
  accountId: string
  audience: 'adult' | 'kids'
  /** playId público do post — sourceId do marco `studio_published` no members. */
  playId: string
}

/** Argumentos do marco "um jogo do autor cruzou N jogadas" (badges plays-10/100). */
export interface PlaysMilestoneArgs {
  /** PERFIL autor do post (dono da gamificação) — snapshot `authorId` da thread. */
  userId: string
  /** CONTA do responsável — snapshot `authorAccountId` (legado sem snapshot → userId). */
  accountId: string
  audience: 'adult' | 'kids'
  playId: string
  milestone: 10 | 100
}

/**
 * Argumentos do RECADO ao aluno quando a equipe ESCONDE/RECUSA seu jogo no Mural
 * (canal de retorno professor↔aluno — vira uma mensagem `teacher` no members).
 */
export interface MuralModerationMessageArgs {
  /** PERFIL autor do post — snapshot `authorId` da thread (dono da conversa). */
  userId: string
  /** CONTA do responsável — snapshot `authorAccountId` (pode faltar em legado). */
  accountId: string | null
  audience: 'adult' | 'kids'
  /** Id do TÓPICO no hub — `contextRef` da conversa `mural_publication` (texto). */
  contextRef: string
  /** O motivo que o moderador escreveu p/ a criança. */
  reason: string
  /** Nome de EXIBIÇÃO do moderador (snapshot; ausente → a UI kids mostra "Professor(a)"). */
  moderatorName?: string | null
  /** Título do jogo p/ a caixa de entrada renderizar (snapshot). */
  title?: string | null
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
  /**
   * Avisa o members que um conteúdo do Clube foi APROVADO (staff) → recompensa a
   * criança (XP + badge de comunidade). Disparado só na aprovação (conteúdo rejeitado
   * não rende). **Best-effort**: NUNCA lança; o ledger é idempotente pelo `contentId`.
   */
  notifyClubContribution(args: ClubContributionArgs): Promise<void>
  /**
   * Avisa o members que um comentário no MURAL foi APROVADO (staff) → marco
   * `mural_comment` (missão "comentar no Mural"). **Best-effort**: NUNCA lança; o
   * ledger é idempotente pelo `commentId`. Distinto do `notifyClubContribution`
   * (fórum do Clube) — o Mural é universal, o Clube é gated por produto.
   */
  notifyMuralComment(args: MuralCommentArgs): Promise<void>
  /**
   * Avisa o members que a criança publicou um jogo STANDALONE no Mural (retenção
   * pós-cursos) → marco `studio_published` (missões gated) + XP diário de publicar.
   * **Best-effort**: NUNCA lança; o members deduplica (marco por playId, XP por dia).
   */
  notifyStandaloneShowcase(args: StandaloneShowcaseArgs): Promise<void>
  /**
   * Avisa o members que um jogo do AUTOR cruzou 10/100 jogadas no /jogar público →
   * marco `play_milestone_10|100` (badges plays-10/plays-100 + troféu). **Best-effort**:
   * NUNCA lança; o ledger é idempotente pelo playId.
   */
  notifyPlaysMilestone(args: PlaysMilestoneArgs): Promise<void>
  /**
   * Avisa o members que a equipe ESCONDEU/RECUSOU um jogo do Mural COM um motivo p/ a
   * criança → mensagem `teacher` numa conversa `mural_publication` (canal de retorno).
   * **Best-effort**: NUNCA lança; o members deduplica por id determinístico da entrega.
   */
  notifyMuralModerationMessage(args: MuralModerationMessageArgs): Promise<void>
}
