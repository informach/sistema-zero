import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
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
import type {
  PensaChatMessage,
  PensaTaskContext,
  PensaTaskGuide,
  PensaTaskOutputRef,
} from '../../../domain/pensa/pensa'
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
  // Degrau de ENTRADA da carreira (14/08, migration `0063`): 1 posição só, o curso que a
  // Faísca faz. Antes o curso-base morava no `iniciante` e a divisão Faísca × Construtor(a)
  // era só apresentação — por isso a Faísca não podia ter curso bônus próprio.
  'primeiros-passos',
  'iniciante',
  'intermediario',
  'avancado',
  // `lenda` = categoria de curso FORA da carreira (bônus da formatura; não é degrau,
  // não conta p/ nível, não trava). Renderizado só na trilha da Lenda no kids.
  'lenda',
])
// Eixo 2D/3D do curso (ortogonal à dificuldade). Par (level, track) = o DEGRAU
// pedagógico ("Iniciante 2D" … "Avançado 3D") que alimenta a carreira de 8 níveis.
// Default `2d` (backfill dos existentes; a usuária re-tagueia os cursos 3D no admin).
export const courseTrackEnum = members.enum('course_track', ['2d', '3d'])
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
  'coming_soon',
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
    // Eixo 2D/3D (par com `level` = degrau pedagógico). Mesma régua de autoria do
    // `audience`/`level`: UPDATE sem o campo PRESERVA o atual.
    track: courseTrackEnum('track').notNull().default('2d'),
    // Posição do curso na etapa da Carreira do Criador. NULL = curso bônus;
    // 1 = curso-base. O domínio e o banco garantem que só Kids ocupa a carreira
    // e aplicam o teto específico de cada etapa.
    careerSlot: smallint('career_slot'),
    // Trava sequencial estilo Duolingo: a próxima aula só libera quando a anterior
    // está concluída. Default `true` = backfill LIGADO p/ os cursos já existentes
    // (decisão da usuária: padrão ligado, com toggle por curso no admin).
    sequentialLock: boolean('sequential_lock').notNull().default(true),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('courses_slug_uq').on(t.slug),
    uniqueIndex('courses_career_slot_uq')
      .on(t.audience, t.level, t.track, t.careerSlot)
      .where(sql`${t.careerSlot} is not null`),
    check(
      // Espelha `assertCareerSlot`: Primeiros Passos existe só em 2D; Lenda nunca ocupa
      // posição; o teto é 1 no degrau de ENTRADA e 8 em todos os demais.
      // ⚠️ Compara `level::text`, não o literal do enum: a `0063` é quem o adiciona.
      // ⚠️ O Iniciante 2D teve teto 7 entre 14/08 e 15/08 (a `0063` apertou, a `0064`
      // alargou de volta a pedido da usuária). Alargar é seguro; apertar exige normalizar
      // antes, porque `ADD CONSTRAINT ... CHECK` valida as linhas existentes.
      'courses_career_slot_check',
      sql`(${t.level}::text <> 'primeiros-passos' or ${t.track}::text = '2d') and (${t.careerSlot} is null or (${t.audience} = 'kids' and ${t.level}::text <> 'lenda' and ${t.careerSlot} between 1 and (case when ${t.level}::text = 'primeiros-passos' then 1 else 8 end)))`,
    ),
  ],
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
    // Token opaco da revisão do conteúdo. Muda somente em create/update do bloco;
    // ordenação não invalida extrações do Zappy.
    contentRevision: varchar('content_revision', { length: 32 })
      .notNull()
      .default(sql`md5(random()::text || clock_timestamp()::text)`),
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
    /**
     * Quando o professor disse "já conferi". Comparado com `submitted_at` (>=), a
     * MESMA régua da resposta do professor: um reenvio da criança reabre a
     * pendência sozinho. `null` = nunca conferida.
     */
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    /** Qual staff carimbou (auditoria). */
    reviewedBy: uuid('reviewed_by'),
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
  // Clube dos Criadores (07/2026): tópico/comentário APROVADO pela equipe (sourceId =
  // id do conteúdo → 1 marco por conteúdo; premiar só na aprovação bloqueia farm).
  'clube_thread',
  'clube_comment',
  // MARCOS de missão (amount 0 — só contam p/ o progresso da missão; o prêmio vem
  // do claim). Idempotentes pelo sourceId natural (anti-farm): bloco (entregar ao
  // professor) / curso (classificar) / item (comprar cosmético) / comentário (Mural).
  'studio_submitted',
  'course_rated',
  'room_item_buy',
  'avatar_part_buy',
  'mural_comment',
  // Estúdio standalone no Mural (retenção pós-cursos, 07/2026): marco por publicação
  // (sourceId = playId), XP diário de publicar (sourceId = uuid determinístico do dia
  // civil SP — 1×/dia), marco de remix (sourceId = playId do jogo ORIGINAL) e marcos
  // de jogadas recebidas (o jogo do autor cruzou 10/100 plays; sourceId = playId).
  'studio_published',
  'studio_publish_day',
  // CRIOU/editou no Estúdio (retenção pós-cursos, 07/2026): XP diário (1×/dia pelo
  // sourceId determinístico do dia civil SP) que move o streak — âncora de quem já
  // terminou os cursos e cria sem publicar. Sem moeda.
  'studio_activity_day',
  'studio_remix',
  'play_milestone_10',
  'play_milestone_100',
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
  // Publicou jogo standalone no Mural (retenção pós-cursos, 07/2026) — faucet
  // diário (1×/dia pelo sourceId do dia), dentro do teto DAILY_COIN_CAP.
  'studio_publish_day',
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
    // SNAPSHOT do eixo 2D/3D (par do `source_level`, mesma régua). NULL nas linhas
    // anteriores à migration 0044 DE PROPÓSITO (sem backfill): a contagem usa
    // `coalesce(source_track, courses.track, '2d')` — re-taggear um curso 3D no
    // admin corrige os marcos legados sozinho; congelar '2d' aqui impediria isso.
    sourceTrack: courseTrackEnum('source_track'),
    // Snapshot do slot da carreira nos marcos de curso. Linhas anteriores ficam
    // NULL e usam `courses.career_slot` como fallback até o primeiro snapshot.
    sourceCareerSlot: smallint('source_career_slot'),
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

// ── Blocos do Estúdio liberados por CURSO (currículo, 08/2026) ──────────────
// A paleta do Estúdio livre deixou de ser fixa por NÍVEL e passou a ser a UNIÃO dos
// blocos dos cursos que o aluno concluiu E publicou no Mural (`metadata.studioUnlockBlocks`
// de cada curso). Esta tabela é o **SNAPSHOT congelado** do que cada curso deu a cada
// aluno no momento em que ele qualificou.
//
// ⚠️ Ela existe por UMA razão: **bloco liberado não é revogado**. A união calculada ao
// vivo sobre o `metadata` atual tiraria a ferramenta da mão de quem já a tinha assim que
// a professora editasse o JSON, despublicasse ou apagasse o curso — inclusive de projetos
// que já a usam. É o mesmo remédio do `xp_events.source_level`, que existe para o rank
// nunca regredir num re-nivelamento. A LEITURA é `ao vivo ∪ snapshot`: acréscimo no JSON
// chega sozinho em quem já concluiu, remoção não tira de ninguém.
//
// `course_id` é SNAPSHOT sem FK (o curso pode ser apagado e a conquista permanece), e
// `blocks` guarda a lista literal daquele momento.
export const studioBlockGrants = members.table(
  'studio_block_grants',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    audience: courseAudienceEnum('audience').notNull().default('kids'),
    courseId: uuid('course_id').notNull(),
    blocks: jsonb('blocks').$type<string[]>().notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('studio_block_grants_user_course_uq').on(t.userId, t.audience, t.courseId),
    index('studio_block_grants_user_idx').on(t.userId, t.audience),
  ],
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

// ── Pensa (planejador de jogos — metodologia ZERO) ─────────────────────────
// A execução não vive aqui: cada Cartão de Criação aponta para Pinta ou Estúdio
// e sincroniza apenas o progresso/resultados. A migração 0060 apaga o formato
// anterior integralmente antes de criar este contrato.
export const pensaProjectKindEnum = members.enum('pensa_project_kind', ['game'])
export const pensaProjectStatusEnum = members.enum('pensa_project_status', ['active', 'archived'])
export const pensaStageEnum = members.enum('pensa_stage', ['z', 'e', 'r', 'o', 'done'])
export const pensaArtifactTypeEnum = members.enum('pensa_artifact_type', [
  'idea',
  'game_design',
  'visual_direction',
  'task_plan',
  'plan_review',
])
export const pensaArtifactStatusEnum = members.enum('pensa_artifact_status', ['draft', 'validated'])
export const pensaTaskDestinationEnum = members.enum('pensa_task_destination', ['pinta', 'studio'])
export const pensaTaskStatusEnum = members.enum('pensa_task_status', [
  'planned',
  'in_progress',
  'completed',
])
export const pensaTaskCategoryEnum = members.enum('pensa_task_category', [
  'art',
  'setup',
  'gameplay',
  'scene',
  'ui',
  'polish',
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

// Cartões de Criação em ordem GLOBAL. `dependencies` referencia somente cartões
// anteriores (DAG validado no domínio). O contexto é discriminado por destino.
export const pensaTasks = members.table(
  'pensa_tasks',
  {
    id: uuid('id').primaryKey(),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => pensaCycles.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    summary: text('summary'),
    destination: pensaTaskDestinationEnum('destination').notNull(),
    category: pensaTaskCategoryEnum('category').notNull(),
    estimatedMinutes: integer('estimated_minutes').notNull(),
    position: integer('position').notNull(),
    dependencies: jsonb('dependencies').$type<string[]>().notNull().default([]),
    guide: jsonb('guide').$type<PensaTaskGuide>().notNull(),
    context: jsonb('context').$type<PensaTaskContext>().notNull(),
    progressStatus: pensaTaskStatusEnum('progress_status').notNull().default('planned'),
    completedStepIds: jsonb('completed_step_ids').$type<string[]>().notNull().default([]),
    completedCriteriaIds: jsonb('completed_criteria_ids').$type<string[]>().notNull().default([]),
    outputRef: jsonb('output_ref').$type<PensaTaskOutputRef>(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    progressUpdatedAt: timestamp('progress_updated_at', { withTimezone: true }),
    revision: integer('revision').notNull().default(1),
    supersedesTaskId: uuid('supersedes_task_id').references((): AnyPgColumn => pensaTasks.id, {
      onDelete: 'set null',
    }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('pensa_tasks_cycle_position_idx').on(t.cycleId, t.position),
    index('pensa_tasks_cycle_status_idx').on(t.cycleId, t.progressStatus),
  ],
)

// ── Conversas professor↔aluno (canal de retorno — fatia 07/2026) ────────────
// UMA conversa (thread) entre a EQUIPE (professor) e um ALUNO, opcionalmente
// ancorada a um CONTEXTO: a entrega do Estúdio, a publicação no Mural ou um recado
// GERAL. É o canal de VOLTA que faltava (o aluno só falava com o professor; nada
// voltava): o professor responde "o erro está no bloco X", o aluno responde em
// texto E reenvia o projeto corrigido. Tabela À PARTE de `studio_submissions` de
// propósito — o upsert da entrega ("último vence") sobrescreve o projeto a cada
// reenvio; a conversa em tabela própria SOBREVIVE aos reenvios. `context_ref` é
// SNAPSHOT SEM FK (blockId da entrega | threadId do hub no Mural | null no geral) —
// a conversa sobrevive a apagar o bloco/curso/post (como certificados/xp_events).
// Não-lido por WATERMARK (`*_last_read_at`), não flag por mensagem (mais barato).
export const teacherThreadContextEnum = members.enum('teacher_thread_context', [
  'studio_submission',
  'mural_publication',
  'general',
])
export const teacherMessageRoleEnum = members.enum('teacher_message_role', ['teacher', 'student'])

export const teacherThreads = members.table(
  'teacher_threads',
  {
    id: uuid('id').primaryKey(),
    /** Aluno dono da conversa (perfil da criança no kids; a conta no adulto). */
    userId: uuid('user_id').notNull(),
    /** Conta responsável (kids: o pai; adulto: = user_id). Snapshot; null = legado/sem conta. */
    accountId: uuid('account_id'),
    audience: courseAudienceEnum('audience').notNull().default('kids'),
    contextType: teacherThreadContextEnum('context_type').notNull(),
    /** Snapshot SEM FK: blockId (entrega) | threadId do hub (Mural) | null (geral). */
    contextRef: text('context_ref'),
    // Denormalizados p/ renderizar mesmo se a origem sumir (snapshot).
    courseId: uuid('course_id'),
    lessonId: uuid('lesson_id'),
    title: text('title'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull(),
    studentLastReadAt: timestamp('student_last_read_at', { withTimezone: true }),
    teacherLastReadAt: timestamp('teacher_last_read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    // Entrega/Mural = 1 conversa por (aluno, contexto, ref). O `general` fica FORA do
    // UNIQUE (NULL é distinto no índice único do Postgres → cada recado geral é sua
    // própria conversa). Índice PARCIAL `WHERE context_type <> 'general'`.
    uniqueIndex('teacher_threads_context_uq')
      .on(t.userId, t.contextType, t.contextRef)
      .where(sql`${t.contextType} <> 'general'`),
    // Caixa de entrada do ALUNO (por vitrine, mais recente primeiro).
    index('teacher_threads_user_lastmsg_idx').on(t.userId, t.audience, t.lastMessageAt),
    // Caixa de entrada do PROFESSOR (todas as conversas, mais recente primeiro).
    index('teacher_threads_lastmsg_idx').on(t.lastMessageAt),
  ],
)

export const teacherMessages = members.table(
  'teacher_messages',
  {
    id: uuid('id').primaryKey(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => teacherThreads.id, { onDelete: 'cascade' }),
    authorRole: teacherMessageRoleEnum('author_role').notNull(),
    /** Quem escreveu (staff userId no `teacher`; = user_id no `student`). Null tolerado. */
    authorId: uuid('author_id'),
    /** Nome de EXIBIÇÃO no envio (snapshot; renomear a equipe não reescreve o histórico). */
    authorName: text('author_name'),
    // 8000: o professor escreve markdown com print (URL) + trecho de código; o recado curto
    // do aluno cabe de sobra. Espelha os DTOs `TeacherThreadReplyBody`/`AdminTeacherThreadPostBody`.
    body: varchar('body', { length: 8000 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  // Cobre o EXISTS de não-lido (thread + papel + data), a paginação do histórico
  // (`thread, created_at, id`) e a última mensagem por conversa da caixa.
  (t) => [
    index('teacher_messages_thread_idx').on(t.threadId, t.authorRole, t.createdAt),
    index('teacher_messages_thread_created_idx').on(t.threadId, t.createdAt, t.id),
  ],
)

/** Watermark de leitura por membro da equipe (não compartilhado entre professores). */
export const teacherThreadStaffReads = members.table(
  'teacher_thread_staff_reads',
  {
    threadId: uuid('thread_id')
      .notNull()
      .references(() => teacherThreads.id, { onDelete: 'cascade' }),
    staffUserId: uuid('staff_user_id').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.threadId, t.staffUserId] }),
    index('teacher_thread_staff_reads_staff_idx').on(t.staffUserId, t.readAt),
  ],
)

// ── Zappy do Studio: histórico por PERFIL + projeto local ───────────────────
// O snapshot do projeto NUNCA é persistido. Só pergunta, resposta validada e
// metadados agregáveis; `expires_at` é renovado no uso (retenção deslizante 30d).
export const zappyConversations = members.table(
  'zappy_conversations',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    projectId: varchar('project_id', { length: 128 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('zappy_conversations_profile_project_uq').on(t.userId, t.projectId),
    index('zappy_conversations_account_idx').on(t.accountId),
    index('zappy_conversations_expiry_idx').on(t.expiresAt),
  ],
)

export const zappyMessages = members.table(
  'zappy_messages',
  {
    id: uuid('id').primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => zappyConversations.id, { onDelete: 'cascade' }),
    replyToId: uuid('reply_to_id').references((): AnyPgColumn => zappyMessages.id, {
      onDelete: 'cascade',
    }),
    clientMessageId: uuid('client_message_id'),
    role: varchar('role', { length: 16 }).notNull(),
    content: text('content').notNull(),
    response: jsonb('response').$type<Record<string, unknown> | null>(),
    scope: varchar('scope', { length: 40 }),
    latencyMs: integer('latency_ms'),
    outcome: varchar('outcome', { length: 24 }),
    useful: boolean('useful'),
    feedbackAt: timestamp('feedback_at', { withTimezone: true }),
    processingUntil: timestamp('processing_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('zappy_messages_conversation_created_idx').on(t.conversationId, t.createdAt, t.id),
    uniqueIndex('zappy_messages_client_id_uq')
      .on(t.conversationId, t.clientMessageId)
      .where(sql`${t.clientMessageId} is not null`),
    uniqueIndex('zappy_messages_reply_uq').on(t.replyToId).where(sql`${t.replyToId} is not null`),
    check('zappy_messages_role_ck', sql`${t.role} in ('user', 'assistant')`),
  ],
)

// Fontes didáticas pesquisáveis. Conteúdo publicado (não conversa infantil).
export const zappyKnowledgeSources = members.table(
  'zappy_knowledge_sources',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    blockId: uuid('block_id').references(() => lessonBlocks.id, { onDelete: 'cascade' }),
    blockRevision: varchar('block_revision', { length: 32 }),
    sourceType: varchar('source_type', { length: 32 }).notNull(),
    sourceRef: text('source_ref').notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('zappy_knowledge_source_uq').on(t.lessonId, t.sourceType, t.sourceRef),
    index('zappy_knowledge_course_lesson_idx').on(t.courseId, t.lessonId),
    index('zappy_knowledge_block_idx').on(t.blockId),
    index('zappy_knowledge_status_idx').on(t.status),
  ],
)

export const zappyKnowledgeChunks = members.table(
  'zappy_knowledge_chunks',
  {
    id: uuid('id').primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => zappyKnowledgeSources.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    content: text('content').notNull(),
    normalizedText: text('normalized_text').notNull(),
  },
  (t) => [
    uniqueIndex('zappy_knowledge_chunk_position_uq').on(t.sourceId, t.position),
    index('zappy_knowledge_chunk_source_idx').on(t.sourceId),
  ],
)

// ── Uso de IA por CONTA (quota diária/mensal — 07/2026) ─────────────────────
// Contador do uso de IA paga pelo SERVIDOR (Pensa chat/sínteses, descrição do
// Mural, recursos futuros), keyado pela CONTA (kids: a conta responsável — irmãos
// da mesma conta dividem o teto; adulto: a própria conta). 1 linha por
// (conta, dia civil SP, feature); o teto MENSAL é derivado por SUM do mês (≤ ~93
// linhas/conta/mês — barato). `feature` na PK dá o breakdown de custo por recurso
// no admin sem tabela extra. Os LIMITES vivem no use case (env AI_LIMIT_*), não
// no banco — padrão da casa (ver MAX_ACTIVE_PROJECTS do Pensa). `privileged`
// espelha o snapshot de equipe da gamificação: equipe NUNCA é recusada, mas o
// consumo fica visível/filtrável no admin.
export const aiUsageDaily = members.table(
  'ai_usage_daily',
  {
    accountId: uuid('account_id').notNull(),
    // Dia civil de São Paulo `YYYY-MM-DD` — MESMA régua do streak. ⚠️ mode:'string'
    // (como `last_activity_date`): mode:'date' deslocaria o dia no round-trip UTC.
    day: date('day', { mode: 'string' }).notNull(),
    feature: varchar('feature', { length: 40 }).notNull(),
    used: integer('used').notNull().default(0),
    privileged: boolean('privileged').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'ai_usage_daily_pk', columns: [t.accountId, t.day, t.feature] }),
    // Agregados do admin (totais do dia/mês varrem por `day`, não por conta).
    index('ai_usage_daily_day_idx').on(t.day),
  ],
)

// ── Lembrete de renovação (anual à vista) ───────────────────────────────────
// Dedupe do e-mail "seu acesso vence em breve": 1 lembrete por (matrícula, data
// de vencimento). Keyar TAMBÉM na data faz um EXTEND admin (validade nova) gerar
// um lembrete novo — comportamento desejado. Marcado APÓS o envio (crash-safety;
// o dedupe do messaging por idempotencyKey absorve o retry).
export const renewalRemindersSent = members.table(
  'renewal_reminders_sent',
  {
    entitlementId: uuid('entitlement_id').notNull(),
    // Data (UTC `YYYY-MM-DD`) do vencimento LEMBRADO. mode:'string' (regra da casa).
    expiresOn: date('expires_on', { mode: 'string' }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'renewal_reminders_sent_pk', columns: [t.entitlementId, t.expiresOn] }),
  ],
)

// ── Desafio do mês — tema gerenciável pelo admin (07/2026) ──────────────────
// Biblioteca de temas CUSTOM criados pelo professor + override do tema por mês.
// Sem override, o tema vem do sorteio determinístico em código (fallback,
// domain/gamification/challenges.ts). Temas custom NUNCA entram no pool do
// sorteio (decisão da usuária: o módulo % 12 fica estável).
export const challengeCustomThemes = members.table('challenge_custom_themes', {
  id: uuid('id').primaryKey(),
  emoji: text('emoji').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  // Arquivado sai da lista de ESCOLHA, mas segue valendo em mês que o referencia.
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

export const challengeMonthOverrides = members.table(
  'challenge_month_overrides',
  {
    // `m:YYYY-MM` (mês civil de SP) — a MESMA régua do ledger e do hub.
    monthKey: text('month_key').primaryKey(),
    // Snapshot do slug do catálogo EM CÓDIGO (sem FK: o catálogo não é tabela).
    builtinSlug: text('builtin_slug'),
    // RESTRICT (default): tema custom referenciado não é deletável — só arquiva.
    customThemeId: uuid('custom_theme_id').references(() => challengeCustomThemes.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    // Auditoria leve (quem definiu por último; o audit do gateway é a trilha real).
    updatedByUserId: uuid('updated_by_user_id'),
  },
  (t) => [
    check(
      'challenge_month_overrides_one_theme',
      sql`(${t.builtinSlug} IS NULL) <> (${t.customThemeId} IS NULL)`,
    ),
  ],
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
  teacherThreads,
  teacherMessages,
  zappyConversations,
  zappyMessages,
  zappyKnowledgeSources,
  zappyKnowledgeChunks,
  aiUsageDaily,
  renewalRemindersSent,
  challengeCustomThemes,
  challengeMonthOverrides,
  processedWebhooks,
}

// Linha-tipo (importado por testes/seed se útil).
export type EntitlementRow = typeof entitlements.$inferSelect
export type CourseRow = typeof courses.$inferSelect
