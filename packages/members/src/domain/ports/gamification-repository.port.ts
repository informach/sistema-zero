import type { CourseAudience } from '../course/course'
import type { QualifyingByTier } from '../gamification/levels'
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
  // Desafio MENSAL (game jam, 07/2026): publicou no Mural com a tag do mês
  // (sourceId = uuid determinístico do monthKey — `challengeSourceId`). XP real.
  | 'challenge_entry'
  // Clube dos Criadores (07/2026): tópico/comentário APROVADO pela equipe (sourceId =
  // id do conteúdo → idempotente; premiar só na aprovação bloqueia farm/rejeitado).
  | 'clube_thread'
  | 'clube_comment'
  // MARCOS de missão (amount 0 — só contam p/ o progresso da missão; o prêmio vem do
  // claim). Idempotentes pelo sourceId natural (anti-farm): `studio_submitted` (bloco —
  // entregar ao professor), `course_rated` (curso — classificar), `room_item_buy`/
  // `avatar_part_buy` (item — comprar cosmético, sem circularidade de moeda) e
  // `mural_comment` (comentário APROVADO no Mural).
  | 'studio_submitted'
  | 'course_rated'
  | 'room_item_buy'
  | 'avatar_part_buy'
  | 'mural_comment'
  // Estúdio standalone no Mural (retenção pós-cursos, 07/2026):
  // `studio_published` = MARCO (amount 0) por publicação standalone (sourceId =
  // playId do post; republicar = post novo = marco novo, deliberado — alimenta as
  // missões semanais/mensais gated por estudio-completo). `studio_publish_day` =
  // XP REAL (move streak/liga — a âncora diária de quem já acabou os cursos e só
  // CRIA), 1×/dia pelo sourceId determinístico do dia civil SP
  // (`studioPublishDaySourceId`) — spam de republicação não infla XP.
  | 'studio_published'
  | 'studio_publish_day'
  // CRIOU/editou no Estúdio Completo (retenção pós-cursos, 07/2026): XP REAL (move
  // streak/liga), 1×/dia pelo sourceId determinístico do dia civil SP
  // (`studioActivityDaySourceId`) — a âncora de quem já terminou os cursos e cria
  // SEM publicar. Sem moeda (não é torneira). Disparado pelo autosave do editor.
  | 'studio_activity_day'
  // MARCO (amount 0): remixou um jogo de colega do Mural ("Fazer a minha versão").
  // sourceId = playId do jogo ORIGINAL → re-remixar o mesmo jogo não conta de novo.
  | 'studio_remix'
  // MARCOS (amount 0): um jogo do AUTOR cruzou 10/100 jogadas no /jogar público
  // (sourceId = playId; crossing exato detectado no hub). Só destravam as badges
  // plays-10/plays-100 (+ troféu) — anti-farm natural: exige volume real de outros.
  | 'play_milestone_10'
  | 'play_milestone_100'

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

/**
 * Os dois marcos de curso do aluno, POR CURSO. É o mesmo par que a carreira
 * cruza (`course_complete` ∩ `course_showcased`) — só que aqui vem separado,
 * porque a vitrine precisa distinguir "concluiu" de "concluiu e publicou".
 */
export interface CourseMilestones {
  completed: boolean
  showcased: boolean
}

/** Estado de carreira derivado de uma única leitura consistente do ledger. */
export interface CareerCourseState {
  qualified: QualifyingByTier
  milestones: Map<string, CourseMilestones>
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
  /**
   * O ledger tem o evento (user, audience, sourceType, sourceId)? Leitura pontual
   * (ex.: `entered` do Desafio do mês — sourceId = uuid determinístico do monthKey).
   */
  hasXpEvent(
    userId: string,
    audience: CourseAudience,
    sourceType: XpSourceType,
    sourceId: string,
  ): Promise<boolean>
  getProfile(userId: string, audience: CourseAudience): Promise<GamificationProfileRecord | null>
  listBadges(
    userId: string,
    audience: CourseAudience,
  ): Promise<{ badgeSlug: string; unlockedAt: Date }[]>
  /**
   * Cursos "qualificados" do aluno por DEGRAU (dificuldade × eixo 2D/3D) —
   * concluídos (`course_complete`) E publicados no Mural (`course_showcased`) —
   * para derivar o NÍVEL do aluno. É a INTERSEÇÃO dos dois marcos no ledger da
   * vitrine. A dificuldade/eixo vêm do SNAPSHOT (`source_level`/`source_track`)
   * com fallback no `courses.level`/`courses.track` ao vivo (linhas legadas sem
   * snapshot; track legado sem curso → `'2d'`). Curso sem ambos os marcos não
   * conta; degrau ausente do resultado = 0.
   */
  listQualifyingCareerSlots(userId: string, audience: CourseAudience): Promise<QualifyingByTier>
  /**
   * Os marcos de cada curso do aluno na vitrine, SEM cruzar: `Map<courseId,
   * {completed, showcased}>`. É a matéria-prima do selo do card ("já é sua" ×
   * "falta publicar no Mural") e do contador da trilha.
   *
   * ⚠️ Vem do LEDGER, e não do `progress`: o progresso é recalculado ao vivo e
   * REGRIDE quando a autora publica uma aula nova, enquanto o marco é congelado.
   * Selo e contador precisam da MESMA fonte que a carreira usa, senão o card diz
   * "pronta" para um curso que o contador não conta.
   *
   * Curso sem marco algum não aparece no mapa (o chamador trata como nenhum dos
   * dois). Marco de curso apagado/despublicado também vem — inofensivo, o
   * chamador consulta pelos cursos que já tem em mãos.
   */
  listCourseMilestones(
    userId: string,
    audience: CourseAudience,
  ): Promise<Map<string, CourseMilestones>>
  /**
   * Qualificação e marcos calculados sobre o MESMO snapshot do ledger. As telas
   * que precisam dos dois usam este contrato para não misturar eventos gravados
   * entre duas consultas independentes.
   */
  listCareerCourseState(userId: string, audience: CourseAudience): Promise<CareerCourseState>
  /**
   * Blocos do Estúdio que os cursos ELEGÍVEIS do aluno liberam AGORA, POR CURSO.
   * Curso Kids bônus exige `course_complete`; curso Kids com posição e curso Adult
   * exigem também `course_showcased`. Lê `metadata.studioUnlockBlocks` de cada curso
   * vivo. É a parte "ao vivo" da paleta: acrescentar um bloco ao JSON de um curso
   * chega sozinho em quem já atende ao critério atual.
   * Vem POR CURSO (não achatado) porque é essa a chave do snapshot que impede a
   * revogação. ⚠️ Curso APAGADO não aparece aqui (join interno, sem metadata para
   * ler) — quem garante que nada se perde é o snapshot (`StudioUnlockRepository`).
   */
  listStudioUnlocksByCourse(
    userId: string,
    audience: CourseAudience,
  ): Promise<{ courseId: string; blocks: string[] }[]>
  /**
   * Revisão curta da união de ferramentas. Muda quando um curso passa a ficar elegível,
   * some, ou seu registro vivo é editado; não lê nem devolve o JSON pesado de blocos.
   */
  getStudioUnlockRevision(userId: string, audience: CourseAudience): Promise<string>
  /**
   * Versão em LOTE do `listQualifyingCareerSlots` — slots qualificados por
   * degrau de VÁRIOS perfis numa query só (para o BFF derivar o nível/aura de
   * cada autor do fórum kids sem N+1). Mapa id→qualificados; perfil sem marco algum
   * some do mapa (o serviço trata como zero → nível Faísca/noob).
   */
  listQualifyingCareerSlotsForProfiles(
    profileIds: string[],
    audience: CourseAudience,
  ): Promise<Map<string, QualifyingByTier>>
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
  /** Badges destravadas na janela `[from, to)` — bloco "Esta semana" do report dos pais. */
  countBadgesUnlockedInPeriod(
    userId: string,
    audience: CourseAudience,
    from: Date,
    to: Date,
  ): Promise<number>
  /**
   * CONTAS (account_id) com atividade de XP na vitrine dentro da janela — enumeração
   * dos destinatários do report semanal dos pais. Distinct, sem PII.
   */
  listActiveAccountsInPeriod(audience: CourseAudience, from: Date, to: Date): Promise<string[]>
  /** Perfis (userId) da CONTA na vitrine (gamification_profiles por account_id). */
  listProfileIdsByAccount(accountId: string, audience: CourseAudience): Promise<string[]>
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
