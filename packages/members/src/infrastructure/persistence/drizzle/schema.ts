import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { AvatarConfig } from '../../../domain/avatar/avatar-config'
import type { LessonBlockContent } from '../../../domain/course/lesson-block'
import type { QuizAnswers } from '../../../domain/course/quiz'
import type { EntitlementSnapshot } from '../../../domain/entitlement/entitlement-snapshot'
import type { PensaBuildEnv, PensaChatMessage, PensaMission } from '../../../domain/pensa/pensa'
import type { CourseFeedbackAnswers } from '../../../domain/rating/course-rating'
import type { RoomState } from '../../../domain/room/room-catalog'

// Compartilha o MESMO Postgres do payments/auth/catalog/funnel, mas é dono do
// schema `members` (isolamento por `pgSchema`). Todo o DDL gerado fica em `members.*`.
// Sem FK cross-schema: `user_id`/`product_id`/`offer_id`/`subscription_id` são
// snapshots de outros serviços (auth/catalog/payments).
export const members = pgSchema('members')

export const courseStatusEnum = members.enum('course_status', ['draft', 'published', 'archived'])
// Audiência do curso: segmenta a VITRINE entre as plataformas (adulto = community,
// kids = community-kids). É coluna (não metadata) porque participa da AUTORIZAÇÃO:
// a chave-mestra `all_courses` cobre só cursos `adult` (ver CheckAccessService).
export const courseAudienceEnum = members.enum('course_audience', ['adult', 'kids'])
// Nível pedagógico do curso (dificuldade). Default `iniciante` (backfill dos cursos
// já existentes). Definido pelo professor no admin; alimenta o nível do ALUNO
// (domain/gamification/levels.ts): um curso "qualificado" (concluído + publicado no
// Mural) conta para o nível conforme a sua dificuldade.
export const courseLevelEnum = members.enum('course_level', [
  'iniciante',
  'intermediario',
  'avancado',
])
export const lessonBlockKindEnum = members.enum('lesson_block_kind', [
  'rich_text',
  'video',
  'image',
  'audio',
  'quiz',
  'embed',
  'ebook',
  'studio',
  'certificate',
])
export const accessTypeEnum = members.enum('access_type', [
  'download',
  'course',
  'community',
  'external',
  'none',
  // Chave-mestra ADULTA: 1 matrícula cobre TODOS os cursos `adult` (atuais e futuros).
  'all_courses',
  // Chave-mestra KIDS: idem para os cursos `kids` (cada chave cobre só a sua vitrine).
  'all_kids_courses',
])
export const entitlementStatusEnum = members.enum('entitlement_status', [
  'active',
  'revoked',
  'expired',
  'pending',
])
export const entitlementSourceKindEnum = members.enum('entitlement_source_kind', [
  'payment',
  'subscription',
  'manual',
])

// ── Conteúdo (Course → Module → Lesson → Block/Attachment) ──────────────────
export const courses = members.table(
  'courses',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    status: courseStatusEnum('status').notNull().default('draft'),
    audience: courseAudienceEnum('audience').notNull().default('adult'),
    // Dificuldade do curso (iniciante/intermediário/avançado). Default `iniciante`
    // (backfill dos existentes). Régua de autoria igual a `audience`: o UPDATE sem o
    // campo PRESERVA o valor atual (um PATCH de build antigo não rebaixa o curso).
    level: courseLevelEnum('level').notNull().default('iniciante'),
    // Trava sequencial estilo Duolingo: a próxima aula só libera quando a anterior
    // está concluída. Default `true` = backfill LIGADO p/ os cursos já existentes
    // (decisão da usuária: padrão ligado, com toggle por curso no admin).
    sequentialLock: boolean('sequential_lock').notNull().default(true),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('courses_slug_uq').on(t.slug)],
)

export const modules = members.table(
  'modules',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    summary: text('summary'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('modules_course_sort_order_uq').on(t.courseId, t.sortOrder)],
)

export const lessons = members.table(
  'lessons',
  {
    id: uuid('id').primaryKey(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    // Denormalizado p/ agregação de progresso (FK ao curso, mesmo schema).
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    estimatedMinutes: integer('estimated_minutes'),
    // Default true = backfill das aulas já em produção (continuam visíveis).
    // A API admin sempre manda o valor explícito (aula NOVA nasce rascunho).
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('lessons_course_slug_uq').on(t.courseId, t.slug),
    uniqueIndex('lessons_module_sort_order_uq').on(t.moduleId, t.sortOrder),
  ],
)

export const lessonBlocks = members.table(
  'lesson_blocks',
  {
    id: uuid('id').primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    kind: lessonBlockKindEnum('kind').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    // União discriminada por `kind` (ver domain/course/lesson-block.ts).
    content: jsonb('content').$type<LessonBlockContent>().notNull(),
  },
  (t) => [uniqueIndex('lesson_blocks_lesson_sort_order_uq').on(t.lessonId, t.sortOrder)],
)

export const lessonAttachments = members.table(
  'lesson_attachments',
  {
    id: uuid('id').primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    url: text('url').notNull(),
    fileType: text('file_type'),
    sizeBytes: integer('size_bytes'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [uniqueIndex('lesson_attachments_lesson_sort_order_uq').on(t.lessonId, t.sortOrder)],
)

// ── Matrícula / Entitlement (visão materializada de acesso) ─────────────────
export const entitlements = members.table(
  'entitlements',
  {
    id: uuid('id').primaryKey(),
    version: integer('version').notNull().default(0),
    userId: uuid('user_id').notNull(),
    productId: uuid('product_id').notNull(),
    productKind: text('product_kind').notNull(),
    accessType: accessTypeEnum('access_type').notNull(),
    courseRef: text('course_ref'),
    offerId: uuid('offer_id'),
    snapshot: jsonb('snapshot').$type<EntitlementSnapshot>().notNull(),
    status: entitlementStatusEnum('status').notNull().default('active'),
    sourceKind: entitlementSourceKindEnum('source_kind').notNull(),
    sourceId: text('source_id').notNull(),
    subscriptionId: text('subscription_id'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('entitlements_idem_uq').on(t.idempotencyKey),
    uniqueIndex('entitlements_user_product_source_uq').on(
      t.userId,
      t.productId,
      t.sourceKind,
      t.sourceId,
    ),
    index('entitlements_user_idx').on(t.userId),
    index('entitlements_user_courseref_idx').on(t.userId, t.courseRef),
    index('entitlements_subscription_idx').on(t.subscriptionId),
  ],
)

// ── Progresso (fato leve por aluno) ─────────────────────────────────────────
export const lessonCompletions = members.table(
  'lesson_completions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    lessonId: uuid('lesson_id').notNull(),
    courseId: uuid('course_id').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('lesson_completions_user_lesson_uq').on(t.userId, t.lessonId),
    index('lesson_completions_user_course_idx').on(t.userId, t.courseId),
  ],
)

// ── Tentativas de quiz (histórico; score calculado NO SERVIDOR) ─────────────
// Sem UNIQUE: cada submit é uma linha. O estado derivado (última nota, cooldown,
// já aprovou) é agregado por (user_id, block_id) ordenado por created_at.
export const quizAttempts = members.table(
  'quiz_attempts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    blockId: uuid('block_id')
      .notNull()
      .references(() => lessonBlocks.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    /** 0–100, inteiro. */
    score: integer('score').notNull(),
    passed: boolean('passed').notNull(),
    /** questionId → choiceIds marcados (auditoria/correção). */
    answers: jsonb('answers').$type<QuizAnswers>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('quiz_attempts_user_block_idx').on(t.userId, t.blockId, t.createdAt)],
)

// ── Posição de reprodução / última aula acessada (1 linha por aluno+aula) ───
// `positionSeconds` = retomar o vídeo de onde parou; `updatedAt` = last-accessed
// do curso (alimenta o "continuar de onde parou" no detalhe do curso).
export const lessonProgress = members.table(
  'lesson_progress',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    positionSeconds: integer('position_seconds').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('lesson_progress_user_lesson_uq').on(t.userId, t.lessonId),
    index('lesson_progress_user_course_updated_idx').on(t.userId, t.courseId, t.updatedAt),
  ],
)

// ── Entrega do projeto do Estúdio (1 linha por aluno+bloco, upsert) ─────────
// O aluno faz a atividade no bloco `studio` e ENVIA o projeto (mesmo JSON do
// "Exportar projeto"). A existência da linha destrava a conclusão da aula —
// espelha o gate do quiz. Reenvio = upsert (último vence). Sem nota.
export const studioSubmissions = members.table(
  'studio_submissions',
  {
    id: uuid('id').primaryKey(),
    /** Quem ENTREGOU: o perfil da criança no kids; a própria conta no adulto. */
    userId: uuid('user_id').notNull(),
    /** Conta RESPONSÁVEL (kids: o pai/responsável; adulto: = user_id). Null em linhas legadas. */
    accountId: uuid('account_id'),
    blockId: uuid('block_id')
      .notNull()
      .references(() => lessonBlocks.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    /** Snapshot `Project` do Estúdio enviado pelo aluno (importável no Estúdio do professor). */
    project: jsonb('project').$type<unknown>().notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
    // ── Auto-correção (fase 2; null quando o bloco não tem atividade) ──────────
    /** Nota 0–100 da última entrega gradeada. */
    score: integer('score'),
    /** Resultado por checagem (StudioCheckResult[] — server+client). */
    results: jsonb('results').$type<unknown>(),
    /** Quando a correção rodou. */
    checkedAt: timestamp('checked_at', { withTimezone: true }),
    /** STICKY: 1ª vez que atingiu a nota de corte (gate "aprovou uma vez = destrava"). */
    passedAt: timestamp('passed_at', { withTimezone: true }),
    /**
     * Recado OPCIONAL do aluno ao professor, escrito no modal de envio. `null` = sem recado.
     * Capado em 1000 chars no DB (espelha o `maxLength` do DTO) — backstop caso um
     * futuro caminho de escrita não passe pela borda validada.
     */
    message: varchar('message', { length: 1000 }),
  },
  (t) => [
    uniqueIndex('studio_submissions_user_block_uq').on(t.userId, t.blockId),
    index('studio_submissions_block_idx').on(t.blockId, t.submittedAt),
  ],
)

// ── Classificação do curso pelo aluno (1 linha por aluno+curso, upsert) ─────
// `rating_half` = nota×2 (inteiro 2..10 → 1.0..5.0 em passos de 0.5) — evita
// float/numeric-string. Cada passo do fluxo da UI persiste o estado acumulado.
export const courseRatings = members.table(
  'course_ratings',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    ratingHalf: smallint('rating_half').notNull(),
    comment: text('comment'),
    feedbackAnswers: jsonb('feedback_answers').$type<CourseFeedbackAnswers>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('course_ratings_user_course_uq').on(t.userId, t.courseId)],
)

// ── Gamificação (XP/streak/badges — fatia 06/2026, vitrine v1 = kids) ───────
export const xpSourceTypeEnum = members.enum('xp_source_type', [
  'lesson_complete',
  'quiz_passed',
  'unit_complete',
  // MARCOS (amount 0 — não movem XP/streak, só contam p/ badges):
  // curso 100% (course-complete/-2/-3) e quiz com nota 100 (quiz-perfect/-10/-30).
  'course_complete',
  'quiz_perfect',
  // Atividade do Estúdio aprovada (auto-correção, fase 2) — XP, não é marco.
  'studio_passed',
  // MARCO (amount 0): o aluno PUBLICOU o projeto do curso no Mural dos Criadores
  // (sourceId = courseId). Gravado pelo webhook hub→members; combinado com
  // `course_complete` define o curso "qualificado" p/ o nível do aluno.
  'course_showcased',
  // Pensa (07/2026): etapa do ciclo concluída (z→e/e→r/r→o; sourceId = uuid
  // DETERMINÍSTICO de (cycleId, stage) — `pensaStageSourceId`) e ciclo LANÇADO
  // (o→done; sourceId = cycleId). XP real (amount > 0) — movem streak.
  'pensa_stage_complete',
  'pensa_cycle_complete',
  // Desafio MENSAL (game jam, 07/2026): publicou no Mural com a tag do mês
  // (sourceId = uuid DETERMINÍSTICO do monthKey — `challengeSourceId`; o UNIQUE
  // do ledger deduplica 1 marco/mês). XP real (amount > 0) — move streak.
  'challenge_entry',
])

// Origem de um evento de moeda Zappy (carteira, fatia 06/2026). Faucets (ganho)
// espelham os tipos de XP + marco de streak/missão/liga; sinks (gasto, amount < 0)
// são cosméticos (avatar/quarto/streak-freeze). `admin_adjust` = ajuste manual de
// suporte. Regras/valores vivem em CÓDIGO (domain/gamification/coins.ts).
export const coinSourceTypeEnum = members.enum('coin_source_type', [
  'lesson_complete',
  'quiz_passed',
  'unit_complete',
  'studio_passed',
  'streak_milestone',
  'mission_reward',
  'league_reward',
  'spend_cosmetic',
  'spend_room',
  'spend_streak_freeze',
  'admin_adjust',
  // Pensa (07/2026): faucets de moeda das etapas/ciclos concluídos — o coin_event
  // reusa o MESMO (sourceType, sourceId) do XP (idempotência alinhada ao ledger).
  'pensa_stage_complete',
  'pensa_cycle_complete',
])

// Perfil agregado (1 linha por aluno POR VITRINE — XP/streak kids e adult são
// SEPARADOS, decisão do usuário 06/2026). `last_activity_date` é a DATA CIVIL
// de São Paulo ('YYYY-MM-DD', calculada no app) — `mode: 'string'` é
// OBRIGATÓRIO: `mode: 'date'` faria round-trip via `Date` UTC e deslocaria o dia.
export const gamificationProfiles = members.table(
  'gamification_profiles',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    // CONTA do responsável dona do perfil (sessão de perfil estilo Netflix). É o
    // elo perfil→conta usado SÓ pela COORTE do ranking (perfis cuja conta tem
    // matrícula na audiência). Fora de sessão de perfil = o próprio `user_id` (a
    // conta É o id). IMUTÁVEL por perfil: gravado SÓ no INSERT do award (nunca no
    // update), backfilled = user_id nas linhas legadas (migration 0014). NOT NULL
    // (migration 0015): um `account_id` nulo derrubaria o perfil da própria coorte.
    accountId: uuid('account_id').notNull(),
    // Vitrine da atividade (audiência do CURSO que gerou o award).
    audience: courseAudienceEnum('audience').notNull().default('adult'),
    xp: integer('xp').notNull().default(0),
    streakCurrent: integer('streak_current').notNull().default(0),
    streakBest: integer('streak_best').notNull().default(0),
    lastActivityDate: date('last_activity_date', { mode: 'string' }),
    // Ator é EQUIPE (superadmin/admin/staff)? Snapshot do último award — o
    // ranking conta SÓ clientes (members não conhece roles; o gateway injeta).
    privileged: boolean('privileged').notNull().default(false),
    // ── Carteira Zappy Coins (moeda ganhável; v1 earn-only) ──────────────────
    // `coin_balance` = soma materializada do `coin_events` (leitura O(1)).
    // `coins_earned_today` + `coins_earned_date` (data civil SP) aplicam o TETO
    // DIÁRIO de GANHO (anti-grind) sob o MESMO advisory lock do award — o teto
    // limita o ganho, nunca o saldo. `lifetime_coins_earned` alimenta a badge de
    // poupador (nunca decresce com gasto). Tudo segregado por audiência (o perfil já é).
    coinBalance: integer('coin_balance').notNull().default(0),
    coinsEarnedToday: integer('coins_earned_today').notNull().default(0),
    coinsEarnedDate: date('coins_earned_date', { mode: 'string' }),
    lifetimeCoinsEarned: integer('lifetime_coins_earned').notNull().default(0),
    // ── Proteção de sequência (streak-freeze + modo férias — fatia 06/2026) ──
    // `streak_freezes`: protetores disponíveis (1 grátis/mês lazy + compráveis); o
    // award consome 1 por dia perdido fora de férias. `freeze_granted_month`: 'YYYY-MM'
    // do último grátis (idempotência sem cron). Férias [from,to]: pausa a sequência
    // (dias na janela não quebram nem estendem). Ética: nunca envergonha a quebra.
    streakFreezes: integer('streak_freezes').notNull().default(0),
    freezeGrantedMonth: text('freeze_granted_month'),
    vacationFrom: date('vacation_from', { mode: 'string' }),
    vacationTo: date('vacation_to', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('gamification_profiles_user_audience_uq').on(t.userId, t.audience),
    // Ranking (página de perfil): a coorte filtra por audiência + `privileged=false`
    // e ordena/conta por `xp` — sem este índice cada cálculo varria a tabela inteira
    // da vitrine (o `user_audience_uq` tem audience como 2ª coluna, não serve ao filtro).
    index('gamification_profiles_ranking_idx').on(t.audience, t.privileged, t.xp),
    // Coorte do ranking = perfis cuja CONTA tem matrícula na audiência
    // (`account_id IN (...)`); sem índice em account_id o `IN (subquery)` varre tudo.
    index('gamification_profiles_account_idx').on(t.accountId),
  ],
)

// Ledger de XP. O UNIQUE (user, source_type, source_id) é a IDEMPOTÊNCIA:
// re-complete/replay nunca duplica XP. `source_id` (lessonId|blockId|moduleId|
// courseId) é snapshot SEM FK — aula deletada não pode apagar o XP histórico.
// `audience` segmenta as contagens por vitrine (um source pertence a UM curso
// → uma audiência; por isso o UNIQUE não precisa dela).
export const xpEvents = members.table(
  'xp_events',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('adult'),
    sourceType: xpSourceTypeEnum('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),
    amount: integer('amount').notNull(),
    // SNAPSHOT da dificuldade do curso, gravado SÓ nos marcos de curso
    // (`course_complete`/`course_showcased`; null nos demais e nas linhas legadas).
    // Congela o nível no momento do award p/ o RANK DO ALUNO NUNCA REGREDIR se o
    // professor re-nivelar ou apagar o curso depois (XP/badges já são snapshot —
    // a dificuldade passa a ser também). Ver domain/gamification/levels.ts.
    sourceLevel: courseLevelEnum('source_level'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('xp_events_user_source_uq').on(t.userId, t.sourceType, t.sourceId),
    index('xp_events_user_created_idx').on(t.userId, t.createdAt),
  ],
)

// Badges destravadas POR VITRINE (catálogo vive EM CÓDIGO — domain/gamification/
// badges.ts): a "1ª aula" do kids é independente da do adult.
export const userBadges = members.table(
  'user_badges',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('adult'),
    badgeSlug: text('badge_slug').notNull(),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('user_badges_user_audience_badge_uq').on(t.userId, t.audience, t.badgeSlug)],
)

// Ledger da moeda Zappy. O UNIQUE (user, audience, source_type, source_id) é a
// IDEMPOTÊNCIA: faucet usa o MESMO sourceId do xp_event (lessonId/blockId/moduleId);
// marco de streak usa `streak:<dias>` (one-time); SINK (gasto) usa a idempotencyKey
// da compra. `source_id` é TEXT (não uuid) p/ caber esses formatos. `amount` é
// + (faucet) ou − (sink); `balance_after` materializa o saldo p/ auditoria. A
// `audience` ENTRA no UNIQUE: ao contrário do `xp_events` (sourceId = uuid, único por
// curso → audiência), aqui o sourceId textual (`streak:7`) poderia colidir entre
// vitrines do mesmo userId.
export const coinEvents = members.table(
  'coin_events',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('adult'),
    sourceType: coinSourceTypeEnum('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('coin_events_user_source_uq').on(t.userId, t.audience, t.sourceType, t.sourceId),
    index('coin_events_user_created_idx').on(t.userId, t.createdAt),
  ],
)

// ── Avatar (guarda-roupa por camadas — fatia 06/2026) ───────────────────────
// Config EQUIPADA (1 linha/perfil POR VITRINE) + inventário de peças PAGAS possuídas.
// Peça grátis é IMPLICITAMENTE possuída (não vai ao inventário). `account_id` é
// IMUTÁVEL (gravado só no INSERT, como em gamification_profiles). O catálogo de peças
// vive EM CÓDIGO (domain/avatar/parts-catalog.ts) → `part_id` é snapshot sem FK.
export const avatarConfigs = members.table(
  'avatar_configs',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('kids'),
    equipped: jsonb('equipped').$type<AvatarConfig>().notNull(),
    // URL pública do snapshot 3D (a "foto" do avatar, mostrada em todo o app). NULL até
    // a criança salvar a 1ª foto. O BFF (member-shell) sobe o PNG p/ o R2 e grava a URL.
    photoUrl: text('photo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('avatar_configs_user_audience_uq').on(t.userId, t.audience)],
)

export const avatarInventory = members.table(
  'avatar_inventory',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('kids'),
    partId: text('part_id').notNull(),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull(),
  },
  // Âncora de idempotência da COMPRA: re-comprar a mesma peça é no-op (onConflictDoNothing).
  (t) => [uniqueIndex('avatar_inventory_user_part_uq').on(t.userId, t.audience, t.partId)],
)

// ── Missões (diárias/semanais — claim idempotente, fatia 06/2026) ───────────
// O PROGRESSO é DERIVADO do `xp_events` na leitura (sem hook no award); esta tabela
// só registra o RESGATE (1 linha por missão+período resgatado = idempotência do prêmio).
// `period_key` = dia civil SP ('YYYY-MM-DD') na diária, 'w:<segunda>' na semanal.
export const missionClaims = members.table(
  'mission_claims',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('kids'),
    missionSlug: text('mission_slug').notNull(),
    periodKey: text('period_key').notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('mission_claims_user_mission_period_uq').on(
      t.userId,
      t.audience,
      t.missionSlug,
      t.periodKey,
    ),
    index('mission_claims_user_period_idx').on(t.userId, t.audience, t.periodKey),
  ],
)

// ── Ligas/divisões semanais (fatia 06/2026) ─────────────────────────────────
// 1 linha por (perfil, vitrine, SEMANA) guardando SÓ o `tier` daquela semana — o XP
// da semana é DERIVADO do `xp_events` na leitura (sem coluna acumulada/hook no award).
// O tier é resolvido LAZY (sem cron) na 1ª leitura da semana. `account_id` IMUTÁVEL.
export const leagueMembership = members.table(
  'league_membership',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('kids'),
    weekKey: text('week_key').notNull(),
    tier: text('tier').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('league_membership_user_week_uq').on(t.userId, t.audience, t.weekKey),
    // Coorte da semana (audiência, semana, tier) — o board e o fechamento varrem por aqui.
    index('league_membership_cohort_idx').on(t.audience, t.weekKey, t.tier),
  ],
)

// ── Report semanal dos pais (Fase 5, 07/2026) ────────────────────────────────
// Dedupe de ENVIO por (conta, semana): o job marca APÓS o envio (crash-safety —
// o dedupe do messaging por idempotencyKey `weekly-report:<conta>:<semana>`
// absorve o retry de um crash entre enviar e marcar; at-most-once efetivo).
export const parentReportsSent = members.table(
  'parent_reports_sent',
  {
    accountId: uuid('account_id').notNull(),
    weekKey: text('week_key').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('parent_reports_sent_account_week_uq').on(t.accountId, t.weekKey)],
)

// Opt-out do report semanal (toggle na área dos pais + link no rodapé do e-mail).
// ⚠️ NÃO usar a supressão do messaging (semântica de BOUNCE — mataria transacionais).
export const parentReportPrefs = members.table('parent_report_prefs', {
  accountId: uuid('account_id').primaryKey(),
  disabled: boolean('disabled').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

// ── Quarto virtual (decore-do-seu-jeito — fatia 06/2026) ────────────────────
// Estado decorado (1 linha/perfil POR VITRINE; tema + itens posicionados + pet) +
// inventário de itens/temas PAGOS possuídos (grátis é implícito). `account_id` IMUTÁVEL
// (só no INSERT). Catálogo de itens/temas EM CÓDIGO (domain/room/room-catalog.ts) →
// `item_id` é snapshot sem FK. Last-write-wins (sem version — dono único).
export const roomState = members.table(
  'room_state',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('kids'),
    state: jsonb('state').$type<RoomState>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('room_state_user_audience_uq').on(t.userId, t.audience)],
)

export const roomInventory = members.table(
  'room_inventory',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('kids'),
    itemId: text('item_id').notNull(),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull(),
  },
  // Âncora de idempotência da COMPRA (re-comprar = no-op via onConflictDoNothing).
  (t) => [uniqueIndex('room_inventory_user_item_uq').on(t.userId, t.audience, t.itemId)],
)

// ── Certificado de conclusão emitido (1 linha por aluno+curso, imutável) ────
// Emitido quando o aluno conclui as aulas publicadas ANTERIORES ao bloco `certificate`.
// `student_name`/`course_title` são SNAPSHOTS congelados na
// 1ª emissão (renome posterior não altera o cert — espelha o authorDisplayName do hub).
// `id` é o identificador PÚBLICO de validação (vai no QR). `serial` é o nº legível UNIQUE.
// `course_id` é SNAPSHOT (SEM FK p/ `courses`, ao contrário das demais tabelas): um
// certificado é uma credencial PERMANENTE referenciada externamente (QR em `/validar/:id`)
// — apagar o curso NÃO pode destruir o diploma já emitido (a validação roda só sobre os
// snapshots `course_ref`/`course_title`/`student_name`/`serial`; nenhuma query faz join em
// `courses`). Espelha a convenção "user_id/product_id são snapshots, sem FK" do package.
export const certificatesIssued = members.table(
  'certificates_issued',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    courseId: uuid('course_id').notNull(),
    courseRef: text('course_ref').notNull(),
    serial: text('serial').notNull(),
    studentName: text('student_name').notNull(),
    courseTitle: text('course_title').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('certificates_issued_user_course_uq').on(t.userId, t.courseId),
    uniqueIndex('certificates_issued_serial_uq').on(t.serial),
  ],
)

// ── Pensa (planejamento guiado — metodologia ZERO, fatia 07/2026) ───────────
// Projeto → ciclos (1 = MVP) → etapas z→e→r→o→done; artefatos versionados por
// etapa; kanban de missões; checklist de lançamento. Dono = `user_id` (perfil
// kids); `account_id` = conta responsável (snapshot no INSERT, imutável).
// Cotas/limites vivem nos USE CASES (não no banco). Tipos: domain/pensa/pensa.ts.
export const pensaProjectKindEnum = members.enum('pensa_project_kind', ['game', 'webapp'])
export const pensaProjectStatusEnum = members.enum('pensa_project_status', ['active', 'archived'])
export const pensaStageEnum = members.enum('pensa_stage', ['z', 'e', 'r', 'o', 'done'])
export const pensaArtifactTypeEnum = members.enum('pensa_artifact_type', [
  'idea',
  'prd',
  'friendly_spec',
  'identity',
  'mission_plan',
  'checklist_seed',
])
export const pensaArtifactStatusEnum = members.enum('pensa_artifact_status', ['draft', 'validated'])
export const pensaTaskColumnEnum = members.enum('pensa_task_column', [
  'backlog',
  'doing',
  'review',
  'done',
])
export const pensaChecklistCategoryEnum = members.enum('pensa_checklist_category', [
  'test',
  'polish',
  'publish',
  'share',
])

export const pensaProjects = members.table(
  'pensa_projects',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    // Conta responsável (kids: o pai; adulto: = user_id). Imutável (só no INSERT).
    accountId: uuid('account_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('kids'),
    kind: pensaProjectKindEnum('kind').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    status: pensaProjectStatusEnum('status').notNull().default('active'),
    // Id do projeto semeado no IndexedDB do Estúdio (fase R).
    studioProjectId: text('studio_project_id'),
    // "Onde você vai construir?" ('embedded'|'studio'|'external'; null = chooser
    // pendente). Validado no APP (union do DTO), não com enum pg — é preferência
    // de UX, não integridade.
    buildEnv: text('build_env').$type<PensaBuildEnv>(),
    // Snapshot do Estúdio na NUVEM (backup do jogo atrelado ao projeto do Pensa).
    // BLOB pesado (≤1.8M chars serializado, cap no use case) — NUNCA pega carona
    // nas leituras de projeto/detail (o repo seleciona colunas explícitas).
    studioSnapshot: jsonb('studio_snapshot'),
    studioSnapshotAt: timestamp('studio_snapshot_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('pensa_projects_user_idx').on(t.userId, t.status)],
)

export const pensaCycles = members.table(
  'pensa_cycles',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => pensaProjects.id, { onDelete: 'cascade' }),
    // 1 = MVP ("Versão 1").
    number: integer('number').notNull(),
    // Objetivo do ciclo (ciclos ≥2).
    goal: text('goal'),
    stage: pensaStageEnum('stage').notNull().default('z'),
    zCompletedAt: timestamp('z_completed_at', { withTimezone: true }),
    eCompletedAt: timestamp('e_completed_at', { withTimezone: true }),
    rCompletedAt: timestamp('r_completed_at', { withTimezone: true }),
    oCompletedAt: timestamp('o_completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('pensa_cycles_project_number_uq').on(t.projectId, t.number)],
)

// 1 linha por (ciclo, etapa); upsert por turno. `message_count` é a contagem
// TOTAL histórica (não encolhe quando o trim corta mensagens antigas).
export const pensaConversations = members.table(
  'pensa_conversations',
  {
    id: uuid('id').primaryKey(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => pensaCycles.id, { onDelete: 'cascade' }),
    stage: pensaStageEnum('stage').notNull(),
    messages: jsonb('messages').$type<PensaChatMessage[]>().notNull().default([]),
    // Sumarização quando o cap corta mensagens antigas.
    summary: text('summary'),
    // Etapa z: PensaZState; demais {}.
    state: jsonb('state').$type<Record<string, unknown>>().notNull().default({}),
    messageCount: integer('message_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('pensa_conversations_cycle_stage_uq').on(t.cycleId, t.stage)],
)

// Versionados APPEND-ONLY; "latest" = MAX(version) por (cycle, type).
export const pensaArtifacts = members.table(
  'pensa_artifacts',
  {
    id: uuid('id').primaryKey(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => pensaCycles.id, { onDelete: 'cascade' }),
    stage: pensaStageEnum('stage').notNull(),
    type: pensaArtifactTypeEnum('type').notNull(),
    // 1, 2, 3…
    version: integer('version').notNull(),
    content: jsonb('content').$type<unknown>().notNull(),
    status: pensaArtifactStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('pensa_artifacts_cycle_type_version_uq').on(t.cycleId, t.type, t.version),
    index('pensa_artifacts_cycle_type_idx').on(t.cycleId, t.type),
  ],
)

// Cards do kanban (missões). `position` = ordem DENTRO da coluna (re-sequenciada no move).
export const pensaTasks = members.table(
  'pensa_tasks',
  {
    id: uuid('id').primaryKey(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => pensaCycles.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    summary: text('summary'),
    // Ex.: 'setup' | 'gameplay' | 'polish' | 'fix'.
    taskType: varchar('task_type', { length: 40 }),
    // PensaMission (jsonb opaco, validado na borda — ver domain/pensa/pensa.ts).
    mission: jsonb('mission').$type<PensaMission>().notNull(),
    boardColumn: pensaTaskColumnEnum('board_column').notNull().default('backlog'),
    position: integer('position').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('pensa_tasks_cycle_idx').on(t.cycleId, t.boardColumn, t.position)],
)

export const pensaChecklistItems = members.table(
  'pensa_checklist_items',
  {
    id: uuid('id').primaryKey(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => pensaCycles.id, { onDelete: 'cascade' }),
    category: pensaChecklistCategoryEnum('category').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    // Itens opcionais (ex.: Toque de Brilho) = false — não travam o o→done.
    required: boolean('required').notNull().default(true),
    position: integer('position').notNull(),
    done: boolean('done').notNull().default(false),
    doneAt: timestamp('done_at', { withTimezone: true }),
  },
  (t) => [index('pensa_checklist_cycle_idx').on(t.cycleId, t.position)],
)

// ── Deduplicação de webhooks de entrada ─────────────────────────────────────
export const processedWebhooks = members.table(
  'processed_webhooks',
  {
    deliveryId: text('delivery_id').primaryKey(),
    eventName: text('event_name').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Cobre o prune da retenção (`processed_at < cutoff`) — sem ele cada ciclo
  // faria seq scan da tabela inteira no banco compartilhado.
  (t) => [index('processed_webhooks_processed_at_idx').on(t.processedAt)],
)

export const schema = {
  courses,
  modules,
  lessons,
  lessonBlocks,
  lessonAttachments,
  entitlements,
  lessonCompletions,
  lessonProgress,
  quizAttempts,
  studioSubmissions,
  courseRatings,
  gamificationProfiles,
  xpEvents,
  userBadges,
  coinEvents,
  avatarConfigs,
  avatarInventory,
  missionClaims,
  leagueMembership,
  roomState,
  roomInventory,
  certificatesIssued,
  pensaProjects,
  pensaCycles,
  pensaConversations,
  pensaArtifacts,
  pensaTasks,
  pensaChecklistItems,
  processedWebhooks,
}

// Linha-tipo (importado por testes/seed se útil).
export type EntitlementRow = typeof entitlements.$inferSelect
export type CourseRow = typeof courses.$inferSelect
