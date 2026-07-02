import type { CourseAudience } from '../course/course'
import type { QualifyingByLevel } from '../gamification/levels'
import type { MissionGoalType } from '../gamification/missions'

/**
 * Origem de um evento de XP — par (sourceType, sourceId) é a chave de
 * idempotência. `course_complete`/`quiz_perfect` são MARCOS (amount 0): só
 * contam p/ badges (cursos 100% e quizzes com nota 100); marcos NÃO movem
 * XP nem streak (streak só avança com evento novo de amount > 0).
 */
export type XpSourceType =
  | 'lesson_complete'
  | 'quiz_passed'
  | 'unit_complete'
  | 'course_complete'
  | 'quiz_perfect'
  // Atividade do Estúdio aprovada (auto-correção, fase 2). XP igual ao quiz.
  | 'studio_passed'
  // MARCO (amount 0): projeto do curso publicado no Mural dos Criadores
  // (sourceId = courseId). Gravado pelo webhook hub→members; combinado com
  // `course_complete` define o curso "qualificado" p/ o nível do aluno.
  | 'course_showcased'
  // Pensa (07/2026): etapa do ciclo concluída (z→e/e→r/r→o; sourceId = uuid
  // DETERMINÍSTICO de (cycleId, stage) — `pensaStageSourceId`) e ciclo LANÇADO
  // (o→done; sourceId = cycleId). XP real (amount > 0) — movem streak.
  | 'pensa_stage_complete'
  | 'pensa_cycle_complete'

export interface XpEventInput {
  sourceType: XpSourceType
  /** lessonId | blockId | moduleId | courseId | cycleId — snapshot, sem FK (XP é histórico). */
  sourceId: string
  amount: number
  /**
   * Moedas Zappy (faucet de rotina) que ESTE evento de aprendizado concede —
   * só faz sentido em eventos de XP real (amount > 0). Ausente/0 nos marcos
   * (course_complete/quiz_perfect não dão moeda). O repo aplica o teto diário;
   * o `coin_event` reusa o MESMO `(sourceType, sourceId)` (idempotência alinhada ao XP).
   */
  coins?: number
}

export interface GamificationProfileRecord {
  userId: string
  /** CONTA dona do perfil (elo da coorte do ranking) — usada p/ ranquear o perfil público. */
  accountId: string
  xp: number
  streakCurrent: number
  streakBest: number
  /** Data civil SP (`YYYY-MM-DD`) da última atividade que rendeu XP. */
  lastActivityDate: string | null
  /** Saldo da carteira Zappy Coins (0 sem perfil/atividade). */
  coinBalance: number
  /** Protetores de sequência disponíveis (streak-freeze). */
  streakFreezes: number
  /**
   * Mês civil (`YYYY-MM`) em que o freeze GRÁTIS já foi concedido — `null`/ausente =
   * ainda não neste mês. Só o caminho de LEITURA (`getProfile`) preenche; o display do
   * streak projeta o freeze grátis prestes a ser concedido p/ casar com o `award`.
   */
  freezeGrantedMonth?: string | null
  /** Janela de FÉRIAS (data civil SP) — `null` = sem férias agendadas. */
  vacationFrom: string | null
  vacationTo: string | null
}

/** Motivo (= source_type do `coin_event`) de um gasto de moeda — sempre cosmético. */
export type CoinSpendReason = 'spend_cosmetic' | 'spend_room' | 'spend_streak_freeze'

export interface SpendCoinsInput {
  userId: string
  audience: CourseAudience
  /** Valor a debitar (> 0). */
  amount: number
  reason: CoinSpendReason
  /** Chave estável da compra → `coin_event.source_id` (idempotência: duplo-clique não cobra 2×). */
  idempotencyKey: string
  now: Date
  /**
   * Item cosmético a CONCEDER na MESMA transação do débito (compra atômica). Sem isto, débito
   * e posse eram 2 transações separadas: um crash entre elas cobrava sem entregar (a criança
   * pagava e não recebia, só recuperável re-comprando o MESMO item). O grant é idempotente
   * (`onConflictDoNothing`) e roda TAMBÉM no caminho `ALREADY_SPENT` (recupera uma tentativa
   * anterior que debitou mas não chegou a conceder). Ausente = gasto puro (sem item).
   */
  grantInventory?: { scope: 'avatar' | 'room'; itemId: string }
}

export type SpendCoinsResult =
  | { ok: true; balanceAfter: number }
  // Gasto sem saldo é erro de negócio (fail-CLOSED). `ALREADY_SPENT` = a MESMA
  // compra (reason+key) já debitou antes → o caller trata como sucesso idempotente.
  | { ok: false; code: 'INSUFFICIENT_BALANCE' | 'ALREADY_SPENT'; balance: number }

export interface AwardInput {
  userId: string
  /**
   * CONTA do responsável (sessão de perfil estilo Netflix). Em sessão normal = o
   * próprio `userId`. Snapshot no perfil — usado SÓ pela coorte do ranking.
   */
  accountId: string
  /**
   * Vitrine da ação (audiência do CURSO que gerou o award) — TODA a
   * gamificação é segregada por audiência: perfil/streak/badges/contagens.
   */
  audience: CourseAudience
  /** Eventos CANDIDATOS — o ledger dedupa por (userId, sourceType, sourceId). */
  events: XpEventInput[]
  /** Data civil SP do instante da ação (o service calcula com o clock). */
  today: string
  now: Date
  /**
   * Ator é equipe (superadmin/admin/staff — `isPrivilegedActor` da rota)?
   * Gravado no perfil: rankings contam SÓ clientes (`privileged = false`).
   */
  privileged: boolean
}

export interface AwardResult {
  /** Soma dos eventos realmente NOVOS (0 = tudo já premiado antes). */
  xpAwarded: number
  totalXp: number
  streak: { current: number; best: number; extended: boolean }
  /** Eventos que entraram no ledger NESTA chamada (p/ o caller sinalizar baú etc). */
  newEvents: XpEventInput[]
  badgesUnlocked: { slug: string; unlockedAt: Date }[]
  /** Moedas Zappy concedidas NESTA ação (já com teto diário aplicado). */
  coinsAwarded: number
  /** Saldo da carteira após a ação. */
  coinBalance: number
  /** `true` quando o teto diário cortou parte do ganho (feedback gentil). */
  coinsCapped: boolean
}

export interface GamificationRanking {
  /** Competition ranking: nº de alunos da coorte com XP ESTRITAMENTE maior + 1 (empate divide). */
  position: number
  /** Tamanho da coorte (alunos com matrícula em curso da audiência, mesmo sem XP). */
  totalStudents: number
}

export interface GamificationRepository {
  /**
   * Concede XP/streak/badges numa transação serializada POR ALUNO (advisory
   * xact-lock). Sem evento novo, streak/lastActivityDate ficam INTOCADOS (só
   * atividade que rende XP conta) — mas badges candidatas ainda concedem.
   */
  award(input: AwardInput): Promise<AwardResult>
  /**
   * Debita moeda da carteira numa transação serializada POR ALUNO (mesmo advisory
   * lock do award). Fail-CLOSED em saldo insuficiente. Idempotente por
   * `(reason, idempotencyKey)`: a MESMA compra nunca debita 2× (duplo-clique/retry).
   * É o primitivo que as lojinhas de avatar/quarto consomem. Com `grantInventory`, a
   * posse do item é gravada na MESMA transação (compra atômica — ver `SpendCoinsInput`).
   */
  spendCoins(input: SpendCoinsInput): Promise<SpendCoinsResult>
  /** Saldo da carteira Zappy da vitrine (0 sem perfil). Leitura para a lojinha. */
  getBalance(userId: string, audience: CourseAudience): Promise<number>
  getProfile(userId: string, audience: CourseAudience): Promise<GamificationProfileRecord | null>
  listBadges(
    userId: string,
    audience: CourseAudience,
  ): Promise<{ badgeSlug: string; unlockedAt: Date }[]>
  /**
   * Cursos "qualificados" do aluno por dificuldade — concluídos (`course_complete`)
   * E publicados no Mural (`course_showcased`) — para derivar o NÍVEL do aluno. É a
   * INTERSEÇÃO dos dois marcos no ledger da vitrine, joinada com `courses.level`.
   * Curso sem ambos os marcos não conta; nível ausente do resultado = 0.
   */
  countQualifyingCoursesByLevel(
    userId: string,
    audience: CourseAudience,
  ): Promise<QualifyingByLevel>
  /**
   * Colocação do PERFIL no ranking de XP da VITRINE. Coorte (estilo Netflix) =
   * PERFIS (linhas de `gamification_profiles`, `privileged=false`) cuja CONTA
   * (`account_id`) tem ≥1 matrícula em curso da audiência. O `userId` é o perfil
   * (XP do perfil); o `accountId` decide a pertinência à coorte (acesso da conta).
   * **`null` quando a conta NÃO tem matrícula na audiência** (sem acesso) — o
   * service omite o `ranking`. O requester sem perfil (XP 0) ainda é contado.
   */
  getRanking(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    now: Date,
  ): Promise<GamificationRanking | null>
  /**
   * Colocação no ranking da vitrine para VÁRIOS perfis da MESMA conta numa só passada
   * (área dos pais). A coorte/total da audiência é idêntica p/ todos os irmãos — só a
   * posição varia por XP do perfil; resolver a coorte UMA vez evita o fan-out de N
   * transações `getRanking`. Map vazio = conta sem matrícula na audiência (sem acesso).
   * Competition ranking (mesma regra do `getRanking`).
   */
  rankProfiles(
    accountId: string,
    profileIds: string[],
    audience: CourseAudience,
    now: Date,
  ): Promise<Map<string, number>>
  /** A conta tem matrícula ativa que libera a vitrine informada? */
  hasActiveAudienceAccess(accountId: string, audience: CourseAudience, now: Date): Promise<boolean>
  /**
   * Perfis de gamificação da audiência que pertencem À CONTA (`account_id`) entre os
   * `userIds` pedidos — AUTORIZA + traz xp/streak num só passo (resumo dos filhos na
   * área dos pais). Filtra pelo `account_id`: um `userId` de OUTRA conta não volta
   * (defesa em profundidade); perfil sem atividade (sem linha) simplesmente não volta.
   * Usa o índice `gamification_profiles_account_idx`.
   */
  listByAccount(
    accountId: string,
    userIds: string[],
    audience: CourseAudience,
  ): Promise<GamificationProfileRecord[]>

  // ── Missões (progresso DERIVADO do ledger; claim idempotente) ─────────────
  /** Conta eventos de XP do tipo dado na janela `[from, to)` (progresso da missão). */
  countEventsInPeriod(
    userId: string,
    audience: CourseAudience,
    sourceTypes: MissionGoalType[],
    from: Date,
    to: Date,
  ): Promise<number>
  /** Missões já resgatadas nos períodos dados → set de `<slug>:<periodKey>`. */
  listClaimedMissions(
    userId: string,
    audience: CourseAudience,
    periodKeys: string[],
  ): Promise<Set<string>>
  /**
   * Resgata o prêmio de uma missão CONCLUÍDA (o service revalida a conclusão antes).
   * Atômico sob o advisory lock: grava o claim (idempotente por slug+período) e, SÓ se
   * novo, credita XP + moedas (com teto diário). `claimed:false` = já resgatado.
   */
  claimMission(input: ClaimMissionInput): Promise<ClaimMissionResult>

  // ── Proteção de sequência (streak-freeze + férias) ────────────────────────
  /** Compra 1 protetor de sequência com moedas (idempotente por chave; máx por aluno). */
  buyStreakFreeze(input: BuyStreakFreezeInput): Promise<BuyStreakFreezeResult>
  /** Define (ou limpa, com `from=to=null`) a janela de férias do perfil. */
  setVacation(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    from: string | null,
    to: string | null,
    now: Date,
  ): Promise<void>

  // ── Ligas semanais (tier por semana; XP da semana DERIVADO do ledger) ─────
  /** Membership do perfil naquela semana (`null` = ainda não resolvida). */
  getLeagueMembership(
    userId: string,
    audience: CourseAudience,
    weekKey: string,
  ): Promise<LeagueMembershipRecord | null>
  /** Membership MAIS RECENTE do perfil ANTES de `beforeWeekKey` (p/ resolver o tier). */
  getMostRecentLeagueMembership(
    userId: string,
    audience: CourseAudience,
    beforeWeekKey: string,
  ): Promise<LeagueMembershipRecord | null>
  /** Cria a membership da semana (idempotente — corrida de resoluções não duplica). */
  createLeagueMembership(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    weekKey: string,
    tier: string,
    now: Date,
  ): Promise<void>
  /** userIds da coorte (audiência, semana, tier), filtrando matrícula ativa da conta. */
  listLeagueCohort(
    audience: CourseAudience,
    weekKey: string,
    tier: string,
    now: Date,
  ): Promise<string[]>
  /** Soma de XP por perfil na janela `[from, to)` (XP da semana, do ledger). */
  sumWeeklyXp(
    audience: CourseAudience,
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, number>>
}

export interface LeagueMembershipRecord {
  weekKey: string
  tier: string
}

export interface ClaimMissionInput {
  userId: string
  audience: CourseAudience
  missionSlug: string
  periodKey: string
  rewardXp: number
  rewardCoins: number
  /** Data civil SP (teto diário das moedas do prêmio). */
  today: string
  now: Date
}
export interface ClaimMissionResult {
  claimed: boolean
  xpAwarded: number
  coinsAwarded: number
  coinBalance: number
}

/** Teto de protetores acumuláveis (anti-hoarding) — espelha o plano. */
export const MAX_STREAK_FREEZES = 5

export interface BuyStreakFreezeInput {
  userId: string
  audience: CourseAudience
  price: number
  idempotencyKey: string
  now: Date
}
export type BuyStreakFreezeResult =
  | { ok: true; freezes: number; balance: number }
  | { ok: false; code: 'INSUFFICIENT_BALANCE' | 'MAX_FREEZES'; freezes: number; balance: number }
