import type { StudioAiFundingSource } from '@sistemazero/core/ai-credits'
import type { CourseModality } from '@sistemazero/core/course/modality'
import type { HelpTutorialDocument } from '@sistemazero/core/help'
import type {
  LearningAnswers,
  LearningAttemptView,
  LearningBlockProgress,
  LearningResult,
  LessonDraftDocument,
  LessonSection,
  ProjectObjectiveResult,
} from '@sistemazero/core/learning'
import type {
  LiveAssistanceView,
  LiveCohort,
  LiveEnrollment,
  LiveOccurrence,
  LiveProgram,
  LiveSession,
} from '@sistemazero/core/live'
import type { Palette } from '@sistemazero/core/palette'
import type { PensaOperationStep, PensaOperationView } from '@sistemazero/core/pensa'
import type {
  StudioProAssistanceJournal,
  StudioProBuilderCost,
  StudioProBuilderPhase,
  StudioProBuilderResult,
  StudioProRevision,
} from '@sistemazero/core/studio'
import { isNull, sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  customType,
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
import type { LiveRecordingSegmentTime } from '../../../domain/live/recording-chapters'
import type { CourseFeedbackAnswers } from '../../../domain/rating/course-rating'
import type { RoomState } from '../../../domain/room/room-catalog'

// Compartilha o MESMO Postgres do payments/auth/catalog/funnel, mas é dono do
// schema `members` (isolamento por `pgSchema`). Todo o DDL gerado fica em `members.*`.
// Sem FK cross-schema: `user_id`/`product_id`/`offer_id`/`subscription_id` são
// snapshots de outros serviços (auth/catalog/payments).
export const members = pgSchema('members')

export const profilePreferences = members.table(
  'profile_preferences',
  {
    userId: uuid('user_id').primaryKey(),
    accountId: uuid('account_id').notNull(),
    /**
     * `null` = nunca escolheu; quem renderiza pinta a cor da casa. ⚠️ O CHECK é de FORMA, não de
     * vocabulário: um `in ('a','b',…)` pediria uma migration por cor nova, e apertar um CHECK
     * VALIDA as linhas existentes — com todas as migrações pendentes numa transação só, uma
     * linha fora da lista derruba o lote inteiro (lição da `0063`). A régua de quais cores
     * existem mora em `@sistemazero/core/palette`, e a leitura é tolerante.
     */
    palette: varchar('palette', { length: 32 }).$type<Palette>(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('profile_preferences_account_idx').on(table.accountId),
    check(
      'profile_preferences_palette_shape_check',
      sql`${table.palette} is null or ${table.palette} ~ '^[a-z0-9-]{1,32}$'`,
    ),
  ],
)

const xid8 = customType<{ data: string; driverData: string }>({
  dataType: () => 'xid8',
})

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
  // Degrau de ENTRADA da jornada (14/08, migration `0063`): 1 posição só, o curso que a
  // Faísca faz. Antes o curso-base morava no `iniciante` e a divisão Faísca × Construtor(a)
  // era só apresentação — por isso a Faísca não podia ter curso bônus próprio.
  'primeiros-passos',
  'iniciante',
  'intermediario',
  'avancado',
  // `lenda` = categoria de curso FORA da jornada (bônus da formatura; não é degrau,
  // não conta p/ nível, não trava). Renderizado só na trilha da Lenda no kids.
  'lenda',
])
// Eixo 2D/3D do curso (ortogonal à dificuldade). Par (level, track) = o DEGRAU
// pedagógico ("Iniciante 2D" … "Avançado 3D") que alimenta a jornada de 8 níveis.
// Default `2d` (backfill dos existentes; a usuária re-tagueia os cursos 3D no admin).
export const courseTrackEnum = members.enum('course_track', ['2d', '3d'])
export const courseJourneyRoleEnum = members.enum('course_journey_role', [
  'positioned',
  'reward',
  'extra',
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
  'coming_soon',
  // ⚠️ A ORDEM aqui espelha a FÍSICA do banco, não a lógica: `ALTER TYPE ADD VALUE` anexa ao FIM,
  // e o drizzle compara o array com o que existe. Inserir no meio faria um `db:generate` futuro
  // enxergar um enum divergente e propor recriá-lo — o que levaria junto a coluna que o usa.
  // Bloco do PINTA (migration `0065`) — o ateliê de desenho embarcado na aula.
  'pinta',
  'interactive',
  // Balão de fala do mascote (migration `0082`) — instrução para criança em vez de
  // contexto corrido.
  'dialogue',
  // Materiais complementares (migration `0090`) — a lista de arquivos/imagens/links que a autora
  // põe no ponto que quiser da seção. Substituiu o lugar `support_block_ids`, que saiu.
  'materials',
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
    // Posição do curso na etapa da Jornada do Criador. NULL = curso bônus;
    // 1 = curso-base. O domínio e o banco garantem que só Kids ocupa a jornada
    // e aplicam o teto específico de cada etapa.
    careerSlot: smallint('career_slot'),
    journeyRole: courseJourneyRoleEnum('journey_role').notNull().default('reward'),
    // Trava sequencial estilo Duolingo: a próxima aula só libera quando a anterior
    // está concluída. Default `true` = backfill LIGADO p/ os cursos já existentes
    // (decisão da usuária: padrão ligado, com toggle por curso no admin).
    sequentialLock: boolean('sequential_lock').notNull().default(true),
    // Vídeo antes da atividade (03/10/2026): nas seções com vídeo e atividade, a atividade
    // abre depois que o aluno assiste ao vídeo uma vez. Desligado por padrão: a autora liga
    // nos cursos de quem está começando. Guia de interface, sem checagem no servidor.
    videoBeforeActivity: boolean('video_before_activity').notNull().default(false),
    // Modalidade (14/10/2026, migration 0113): GRAVADO (o curso de sempre) ou AO VIVO (só existe
    // em Oficinas; o acesso vem da vaga na turma). Texto + CHECK, não enum do Postgres: valor novo
    // de enum não pode ser usado na mesma transação que o cria. Mesma régua de autoria do
    // `audience`: o UPDATE sem o campo PRESERVA o valor atual.
    modality: text('modality').$type<CourseModality>().notNull().default('recorded'),
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
      // Espelha `assertJourneySlot`: Primeiros Passos existe só em 2D; Lenda nunca ocupa
      // posição; o teto é 1 no degrau de ENTRADA e 8 em todos os demais.
      // ⚠️ Compara `level::text`, não o literal do enum: a `0063` é quem o adiciona.
      // ⚠️ O Iniciante 2D teve teto 7 entre 14/08 e 15/08 (a `0063` apertou, a `0064`
      // alargou de volta a pedido da usuária). Alargar é seguro; apertar exige normalizar
      // antes, porque `ADD CONSTRAINT ... CHECK` valida as linhas existentes.
      'courses_career_slot_check',
      sql`(${t.level}::text <> 'primeiros-passos' or ${t.track}::text = '2d') and (${t.careerSlot} is null or (${t.audience} = 'kids' and ${t.level}::text <> 'lenda' and ${t.careerSlot} between 1 and (case when ${t.level}::text = 'primeiros-passos' then 1 else 8 end)))`,
    ),
    check(
      'courses_journey_role_slot_check',
      sql`(${t.journeyRole} = 'positioned') = (${t.careerSlot} is not null)`,
    ),
    check('courses_modality_check', sql`${t.modality} in ('recorded', 'live')`),
    // Curso ao vivo nunca ocupa posição na Jornada (espelha a validação do `CourseAdminService`).
    check(
      'courses_live_off_journey_check',
      sql`${t.modality} = 'recorded' or ${t.careerSlot} is null`,
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
    riveUrl: text('rive_url'),
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
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    // Token opaco da revisão do conteúdo. Muda somente em create/update do bloco;
    // ordenação não invalida extrações do Zappy.
    contentRevision: varchar('content_revision', { length: 32 })
      .notNull()
      .default(sql`md5(random()::text || clock_timestamp()::text)`),
  },
  (t) => [
    uniqueIndex('lesson_blocks_lesson_sort_order_uq')
      .on(t.lessonId, t.sortOrder)
      .where(isNull(t.archivedAt)),
  ],
)

/** Student/content reads use the active view; teacher history keeps the underlying rows. */
export const activeLessonBlocks = members
  .view('active_lesson_blocks')
  .as((qb) => qb.select().from(lessonBlocks).where(isNull(lessonBlocks.archivedAt)))

export const lessonDrafts = members.table('lesson_drafts', {
  lessonId: uuid('lesson_id')
    .primaryKey()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  revision: uuid('revision').notNull(),
  publishedRevision: text('published_revision').notNull(),
  document: jsonb('document').$type<LessonDraftDocument>().notNull(),
  /**
   * O rascunho de ANTES da última restauração, para o "Desfazer" do painel.
   *
   * Vale só até a próxima alteração: todo write que não seja restauração limpa as duas colunas
   * (ver `lesson-draft.repository.ts`). Desfazer horas depois devolveria um documento velho por
   * cima de trabalho novo, que é o acidente que a restauração existe para consertar.
   */
  previousDocument: jsonb('previous_document').$type<LessonDraftDocument>(),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const lessonDraftOperations = members.table(
  'lesson_draft_operations',
  {
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    operationId: uuid('operation_id').notNull(),
    authorId: uuid('author_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    revision: uuid('revision').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.operationId] })],
)

/** The complete section layout is replaced atomically with optimistic concurrency. */
export const lessonStructures = members.table('lesson_structures', {
  lessonId: uuid('lesson_id')
    .primaryKey()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  revision: uuid('revision').notNull(),
  sections: jsonb('sections').$type<LessonSection[]>().notNull(),
})

export const lessonNavigation = members.table(
  'lesson_navigation',
  {
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.lessonId] }),
    index('lesson_navigation_account_idx').on(t.accountId),
  ],
)

/** Section milestones are independent of navigation and survive later review. */
export const lessonSectionProgress = members.table(
  'lesson_section_progress',
  {
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id').notNull(),
    revision: varchar('revision', { length: 32 }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    projectPassed: boolean('project_passed').notNull().default(false),
    /**
     * O último resultado de cada objetivo da parte (`{id, passed}`), da última verificação NESTA
     * revisão (18/10/2026). É o que faz a lista se lembrar ao reabrir a fase; `null` = nunca
     * verificou. Só a verificação escreve; concluir a parte não mexe.
     */
    objectiveResults: jsonb('objective_results').$type<ProjectObjectiveResult[]>(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.lessonId, t.sectionId] }),
    index('lesson_section_progress_account_idx').on(t.accountId),
  ],
)

export const lessonBlockProgress = members.table(
  'lesson_block_progress',
  {
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    blockId: uuid('block_id')
      .notNull()
      .references(() => lessonBlocks.id, { onDelete: 'cascade' }),
    revision: varchar('revision', { length: 32 }).notNull(),
    positionSeconds: integer('position_seconds'),
    answers: jsonb('answers').$type<LearningAnswers>().notNull().default({}),
    hintsUsed: integer('hints_used').notNull().default(0),
    attemptsCount: integer('attempts_count').notNull().default(0),
    result: jsonb('result').$type<LearningResult>(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.blockId] }),
    index('lesson_block_progress_account_lesson_idx').on(t.accountId, t.lessonId),
  ],
)

/** Historical snapshots survive content revisions; no FK to individual blocks. */
export const learningAttempts = members.table(
  'learning_attempts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    lessonId: uuid('lesson_id').notNull(),
    blockId: uuid('block_id').notNull(),
    revision: varchar('revision', { length: 32 }).notNull(),
    answers: jsonb('answers').$type<LearningAnswers>().notNull(),
    hintsUsed: integer('hints_used').notNull(),
    result: jsonb('result').$type<LearningResult>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('learning_attempts_owner_lesson_idx').on(t.userId, t.accountId, t.lessonId, t.createdAt),
  ],
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
    zappyStudentNotebook: boolean('zappy_student_notebook').notNull().default(false),
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
    /**
     * Backup da versão SOBRESCRITA pelo último reenvio (upsert é último-vence): o
     * projeto e a data que estavam na linha ANTES do update. Undo de 1 passo,
     * restaurável pelo professor (`restore-previous`) — protege a entrega boa de
     * um reenvio acidental do template (editor semeado errado num navegador novo).
     * `null` = nunca houve reenvio. NÃO entra no `getOne` (payload das rotas
     * quentes de seed/carryover) — só `getPrevious` o carrega.
     */
    previousProject: jsonb('previous_project').$type<unknown>(),
    previousSubmittedAt: timestamp('previous_submitted_at', { withTimezone: true }),
    /**
     * Impressão digital do conteúdo ENVIADO (10/10/2026), a mesma régua do rascunho guardado na
     * conta (`creations.content_fingerprint`). `null` = envio antigo, galeria ou restaurado pelo
     * professor: o "envio em dia" deixa passar.
     */
    contentFingerprint: varchar('content_fingerprint', { length: 70 }),
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
     * O recado acima foi FALADO pela criança e transcrito pelo servidor (14/10/2026). A equipe lê
     * com boa vontade um erro de transcrição. `false` = digitado, sem recado ou app antigo.
     */
    messageSpoken: boolean('message_spoken').notNull().default(false),
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
  // Financial source values remain stable. Native Pensa milestones use the
  // durable execution event ID; final verification grants the project reward.
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
  // Prêmio resgatado de missão. Registra o XP histórico para snapshots do ranking e
  // métricas semanais; o claim atualiza o perfil diretamente e não move o streak.
  'mission_reward',
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
  // Cursos AO VIVO (14/10/2026, migration 0113) — MARCOS (amount 0, nada de XP por presença):
  // a criança foi recebida num encontro (sourceId = ocorrência; conquista `live-first-encounter`
  // e missão `live_encounter`) e concluiu todas as aulas de um curso ao vivo (sourceId = curso;
  // conquista `live-course-complete` + troféu). Nenhum dos dois conta para a Jornada.
  'live_encounter',
  'live_course_complete',
  // Objetivo EXTRA da parte cumprido pela primeira vez (18/10/2026): XP puro (5), sem moeda.
  // sourceId = uuid determinístico de aula + parte + objetivo (1 vez por objetivo).
  'objective_extra',
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
    // Snapshot do slot da jornada nos marcos de curso. Linhas anteriores ficam
    // NULL e usam `courses.career_slot` como fallback até o primeiro snapshot.
    sourceCareerSlot: smallint('source_career_slot'),
    // XID 64-bit da transação que criou o evento. Diferente de `created_at`,
    // preserva a visibilidade MVCC mesmo quando uma transação confirma fora de ordem.
    transactionId: xid8('transaction_id').default(sql`pg_current_xact_id()`).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('xp_events_user_source_uq').on(t.userId, t.sourceType, t.sourceId),
    index('xp_events_user_created_idx').on(t.userId, t.createdAt),
    // Replay do ranking: audiência + XIDs que não eram visíveis no snapshot original.
    index('xp_events_ranking_snapshot_idx').on(t.audience, t.transactionId, t.userId),
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
// blocos dos cursos elegíveis do aluno (`metadata.studioUnlockBlocks`): bônus Kids concluído;
// curso com posição e curso Adult concluído + publicado no Mural. Esta tabela é o
// **SNAPSHOT congelado** do que cada curso deu ao aluno quando ele recebeu a ferramenta.
//
// ⚠️ Ela existe por UMA razão: **bloco liberado não é revogado**. A união calculada ao
// vivo sobre o `metadata` atual tiraria a ferramenta da mão de quem já a tinha assim que
// a professora editasse o JSON, despublicasse ou apagasse o curso — inclusive de projetos
// que já a usam. É o mesmo remédio do `xp_events.source_level`, que existe para o rank
// nunca regredir num re-nivelamento. A LEITURA é `ao vivo ∪ snapshot`: acréscimo no JSON
// chega sozinho em quem já atende ao critério atual; remoção não tira de ninguém.
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
    // O código do plano (equipe, 26/09/2026): 6 símbolos sem ambíguos; `null` = desligado.
    shareCode: varchar('share_code', { length: 8 }),
    paused: boolean('paused').notNull().default(false),
    activeRevisionId: uuid('active_revision_id'),
    revisionNumber: integer('revision_number').notNull().default(0),
    metadataRevision: integer('metadata_revision').notNull().default(0),
    teamRevision: integer('team_revision').notNull().default(0),
    executionRevision: integer('execution_revision').notNull().default(0),
    gameProfileId: uuid('game_profile_id'),
    gameAccountId: uuid('game_account_id'),
    gameCreationId: varchar('game_creation_id', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('pensa_projects_user_idx').on(t.userId, t.status),
    uniqueIndex('pensa_projects_share_code_uq')
      .on(t.shareCode)
      .where(sql`${t.shareCode} is not null`),
  ],
)

/**
 * A EQUIPE de um plano (26/09/2026): quem entrou pelo código. O dono é o `user_id` do
 * projeto (não há papel além de "membro"). Cai na cascata do projeto.
 */
export const pensaProjectMembers = members.table(
  'pensa_project_members',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => pensaProjects.id, { onDelete: 'cascade' }),
    // O perfil da criança convidada e a conta responsável dela (o gate de produto é da conta).
    profileId: uuid('profile_id').notNull(),
    accountId: uuid('account_id').notNull(),
    invitedBy: uuid('invited_by').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.profileId] }),
    index('pensa_project_members_profile_idx').on(t.profileId),
  ],
)

/**
 * As FUNÇÕES da equipe no Pensa (14/10/2026): `code` = quem programa (o Estúdio, UMA pessoa
 * por plano, o índice parcial garante) e `art` = quem faz as artes (Pinta e Molda, zero ou
 * mais). Sem linha `code`, programa a dona; sem linhas `art`, quem programa também desenha.
 * The aggregate resolves current members and pins ownership of a started game.
 * Leaving a team removes assignments and invalidates unavailable art and dependents.
 */
export const pensaProjectRoles = members.table(
  'pensa_project_roles',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => pensaProjects.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id').notNull(),
    role: varchar('role', { length: 8 }).$type<'code' | 'art'>().notNull(),
    // Quem definiu (a dona): auditoria.
    assignedBy: uuid('assigned_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.profileId, t.role] }),
    uniqueIndex('pensa_project_roles_code_uq').on(t.projectId).where(sql`${t.role} = 'code'`),
    index('pensa_project_roles_profile_idx').on(t.profileId),
    check('pensa_project_roles_role_check', sql`${t.role} in ('code', 'art')`),
  ],
)

/** Immutable accepted definition, plan and technical decision. */
export const pensaProjectRevisions = members.table(
  'pensa_project_revisions',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => pensaProjects.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    previousRevisionId: uuid('previous_revision_id'),
    snapshot: jsonb('snapshot').notNull(),
    acceptedByProfileId: uuid('accepted_by_profile_id').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('pensa_project_revisions_number_uq').on(t.projectId, t.number)],
)
export const pensaPlanDrafts = members.table(
  'pensa_plan_drafts',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => pensaProjects.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull().default(0),
    status: varchar('status', { length: 24 }).notNull(),
    data: jsonb('data').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('pensa_plan_drafts_active_uq')
      .on(t.projectId)
      .where(sql`${t.status} in ('collecting', 'needs_choice', 'ready')`),
  ],
)
export const pensaMissionProgress = members.table(
  'pensa_mission_progress',
  {
    missionId: uuid('mission_id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => pensaProjects.id, { onDelete: 'cascade' }),
    progressRevision: integer('progress_revision').notNull().default(0),
    status: varchar('status', { length: 24 }).notNull().default('planned'),
    validity: varchar('validity', { length: 24 }).notNull().default('current'),
    assigneeProfileId: uuid('assignee_profile_id'),
    data: jsonb('data').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('pensa_mission_progress_project_idx').on(t.projectId, t.status),
    check(
      'pensa_mission_progress_status_check',
      sql`${t.status} in ('planned', 'in_progress', 'completed')`,
    ),
    check(
      'pensa_mission_progress_validity_check',
      sql`${t.validity} in ('current', 'needs_review')`,
    ),
  ],
)
export const pensaProjectMessages = members.table(
  'pensa_project_messages',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => pensaProjects.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id').notNull(),
    context: varchar('context', { length: 24 }).notNull(),
    revision: integer('revision').notNull().default(1),
    data: jsonb('data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('pensa_project_messages_project_idx').on(t.projectId, t.createdAt)],
)
/** Minimal reward receipts survive deletion; private command data is redacted. */
export const pensaExecutionEvents = members.table(
  'pensa_execution_events',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id').references(() => pensaProjects.id, { onDelete: 'set null' }),
    projectKey: uuid('project_key').notNull(),
    requestId: uuid('request_id').notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    profileId: uuid('profile_id').notNull(),
    accountId: uuid('account_id').notNull(),
    kind: varchar('kind', { length: 64 }).notNull(),
    data: jsonb('data').notNull(),
    reward: jsonb('reward'),
    rewardStatus: varchar('reward_status', { length: 16 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('pensa_execution_events_request_uq').on(t.requestId),
    uniqueIndex('pensa_execution_events_milestone_uq')
      .on(t.projectKey, t.kind)
      .where(sql`${t.reward} is not null`),
    index('pensa_execution_events_rewards_idx').on(t.rewardStatus),
  ],
)
export const pensaOperations = members.table(
  'pensa_operations',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => pensaProjects.id, { onDelete: 'cascade' }),
    draftId: uuid('draft_id'),
    profileId: uuid('profile_id').notNull(),
    accountId: uuid('account_id').notNull(),
    kind: varchar('kind', { length: 24 }).$type<PensaOperationView['kind']>().notNull(),
    step: varchar('step', { length: 24 }).$type<PensaOperationStep>().notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    inputRevision: integer('input_revision').notNull(),
    attempts: integer('attempts').notNull().default(0),
    calls: integer('calls').notNull().default(0),
    input: jsonb('input').$type<Record<string, unknown>>().notNull(),
    output: jsonb('output').$type<Record<string, unknown>>().notNull().default({}),
    leaseId: uuid('lease_id'),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('pensa_operations_project_idx').on(t.projectId, t.status),
    index('pensa_operations_lease_idx').on(t.status, t.leaseUntil),
  ],
)

/** Holds count against the shared account quota; only committed delivery increments usage. */
export const aiUsageReservations = members.table(
  'ai_usage_reservations',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id').notNull(),
    profileId: uuid('profile_id').notNull(),
    projectId: uuid('project_id').references(() => pensaProjects.id, { onDelete: 'set null' }),
    day: date('day').notNull(),
    feature: varchar('feature', { length: 40 }).notNull(),
    status: varchar('status', { length: 16 })
      .$type<'reserved' | 'committed' | 'released'>()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    privileged: boolean('privileged').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('ai_usage_reservations_account_idx').on(t.accountId, t.status, t.expiresAt)],
)

export const pensaCheckpoints = members.table(
  'pensa_checkpoints',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => pensaProjects.id, { onDelete: 'cascade' }),
    projectRevisionId: uuid('project_revision_id').notNull(),
    profileId: uuid('profile_id').notNull(),
    accountId: uuid('account_id').notNull(),
    creationId: varchar('creation_id', { length: 120 }).notNull(),
    saveRevision: varchar('save_revision', { length: 120 }).notNull(),
    snapshot: jsonb('snapshot').notNull(),
    manifest: jsonb('manifest').$type<Record<string, unknown>>().notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('pensa_checkpoints_project_idx').on(t.projectId)],
)

export const privateNarrations = members.table(
  'private_narrations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    projectId: uuid('project_id'),
    profileId: uuid('profile_id').notNull(),
    accountId: uuid('account_id').notNull(),
    chars: integer('chars').notNull(),
    attempts: integer('attempts').notNull().default(1),
    status: varchar('status', { length: 20 }).$type<'generating' | 'ready' | 'failed'>().notNull(),
    leaseId: uuid('lease_id').notNull(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('private_narrations_account_date_idx').on(t.accountId, t.createdAt)],
)

/** Tombstone mínimo do plano + limpeza adiada: nenhuma narrativa permanece aqui. */
export const pensaDeletionJobs = members.table(
  'pensa_deletion_jobs',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id').notNull(),
    profileId: uuid('profile_id').notNull(),
    prefixes: jsonb('prefixes').$type<string[]>().notNull(),
    notBefore: timestamp('not_before', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lastError: text('last_error'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('pensa_deletion_jobs_due_idx').on(t.completedAt, t.notBefore)],
)

/** Custo externo tentado, separado dos créditos entregues; sobrevive ao cancelamento do plano. */
export const pensaProviderUsage = members.table(
  'pensa_provider_usage',
  {
    accountId: uuid('account_id').notNull(),
    day: date('day').notNull(),
    calls: integer('calls').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.day] })],
)

export const teacherThreadContextEnum = members.enum('teacher_thread_context', [
  'studio_submission',
  'mural_publication',
  'general',
  'lesson_section',
])
export const teacherMessageRoleEnum = members.enum('teacher_message_role', ['teacher', 'student'])
export const lessonEvidence = members.table(
  'lesson_evidence',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id'),
    lessonId: uuid('lesson_id').notNull(),
    blockId: uuid('block_id'),
    sectionId: uuid('section_id'),
    kind: text('kind').$type<'section_project' | 'platform_action' | 'quiz' | 'studio'>().notNull(),
    revision: text('revision').notNull(),
    payload: jsonb('payload').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('lesson_evidence_owner_idx').on(t.userId, t.lessonId, t.createdAt)],
)

/** Base para rebase exato dos rascunhos existentes na migração dos critérios. */
export const lessonCriteriaMigrationSnapshots = members.table(
  'lesson_criteria_migration_snapshots',
  {
    lessonId: uuid('lesson_id').primaryKey(),
    previousSections: jsonb('previous_sections').$type<LessonSection[]>().notNull(),
    migratedSections: jsonb('migrated_sections').$type<LessonSection[]>().notNull(),
  },
)

export const teacherBroadcasts = members.table('teacher_broadcasts', {
  id: uuid('id').primaryKey(),
  authorId: uuid('author_id').notNull(),
  authorName: text('author_name').notNull(),
  audience: jsonb('audience')
    .$type<import('../../../domain/ports/teacher-broadcast-repository.port').TeacherAudience>()
    .notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  body: varchar('body', { length: 8000 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
})

export const teacherBroadcastRecipients = members.table(
  'teacher_broadcast_recipients',
  {
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => teacherBroadcasts.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id').notNull(),
    accountId: uuid('account_id').notNull(),
    name: text('name').notNull(),
    accountName: text('account_name').notNull(),
    accountEmail: text('account_email').notNull(),
    threadId: uuid('thread_id').notNull(),
    status: text('status').$type<'pending' | 'delivered' | 'failed'>().notNull().default('pending'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.broadcastId, t.profileId] }),
    uniqueIndex('teacher_delivery_thread_uq').on(t.threadId),
    index('teacher_delivery_pending_idx').on(t.status, t.broadcastId),
  ],
)

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
    broadcastId: uuid('broadcast_id').references(() => teacherBroadcasts.id, {
      onDelete: 'set null',
    }),
    workflowStatus: text('workflow_status')
      .$type<'waiting_teacher' | 'waiting_student' | 'resolved'>()
      .notNull()
      .default('waiting_student'),
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
    /**
     * Turno FALADO pela criança e transcrito pelo servidor (14/10/2026): o Admin avisa a equipe
     * para ler um erro de transcrição com boa vontade. `false` = digitado (e todo o legado).
     */
    spoken: boolean('spoken').notNull().default(false),
    helpContext:
      jsonb('help_context').$type<
        import('../../../domain/ports/teacher-thread-repository.port').TeacherHelpContext
      >(),
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

// ── Ciclo de vida de acessos fixos ──────────────────────────────────────────
// Diferente do lembrete anual, um mesmo vencimento pode gerar mais de uma
// mensagem (7 dias, 3 dias, expirou e marcos comportamentais). A terceira parte
// da chave preserva cada envio sem sobrecarregar `renewal_reminders_sent`.
export const entitlementLifecycleMessagesSent = members.table(
  'entitlement_lifecycle_messages_sent',
  {
    entitlementId: uuid('entitlement_id')
      .notNull()
      .references(() => entitlements.id, { onDelete: 'cascade' }),
    expiresOn: date('expires_on', { mode: 'string' }).notNull(),
    messageKind: text('message_kind').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'entitlement_lifecycle_messages_sent_pk',
      columns: [t.entitlementId, t.expiresOn, t.messageKind],
    }),
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

// ── "Como fazer": a biblioteca de ajuda do Kids (26/09/2026) ─────────────────
// Tutoriais curtos por TAREFA ("Como ver meu jogo na Pré-visualização"), separados dos
// cursos de propósito: SEM FK para `lessons`, sem progresso, sem XP, sem quiz. Guardar como
// aula puxaria o ledger de XP, a contagem de aulas publicadas, a trava de matrícula e a
// reconciliação do Zappy (que apaga fonte sem bloco publicado). Qualquer conta ATIVA lê o
// publicado (gate no gateway, não aqui). A coleção mora no banco (decisão da dona): o admin
// cria, renomeia, reordena e arquiva; ícone e cor são allowlists do core.
export const helpCollections = members.table(
  'help_collections',
  {
    id: uuid('id').primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull(),
    title: varchar('title', { length: 60 }).notNull(),
    description: varchar('description', { length: 240 }).notNull().default(''),
    icon: varchar('icon', { length: 32 }).notNull(),
    tone: varchar('tone', { length: 32 }).notNull(),
    position: integer('position').notNull().default(0),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('help_collections_slug_uq').on(t.slug),
    check('help_collections_status_check', sql`${t.status} in ('active', 'archived')`),
  ],
)

// O tutorial é um JSON inteiro em duas cópias: o admin edita `draft`; "Publicar" copia para
// `published` (a criança lê SÓ essa) e grava `published_search_text`, o texto achatado e
// normalizado que a busca do kids (no navegador) e a do Zappy (tsvector, índice criado à mão
// na migration) leem. `revision` é o lock otimista do PATCH (`expectedRevision`), inteiro
// porque viaja no corpo. RESTRICT na coleção: coleção com tutorial não é apagável, só arquiva.
export const helpTutorials = members.table(
  'help_tutorials',
  {
    id: uuid('id').primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull(),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => helpCollections.id),
    status: varchar('status', { length: 16 }).notNull().default('draft'),
    draft: jsonb('draft').$type<HelpTutorialDocument>().notNull(),
    published: jsonb('published').$type<HelpTutorialDocument>(),
    publishedSearchText: text('published_search_text'),
    revision: integer('revision').notNull().default(1),
    position: integer('position').notNull().default(0),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('help_tutorials_slug_uq').on(t.slug),
    index('help_tutorials_status_collection_idx').on(t.status, t.collectionId, t.position),
    check('help_tutorials_status_check', sql`${t.status} in ('draft', 'published', 'archived')`),
    check(
      'help_tutorials_published_pair',
      sql`(${t.status} = 'published') = (${t.published} is not null)`,
    ),
  ],
)

// ── "Guardado na sua conta": criações do Estúdio Completo e do Pinta (18/08/2026) ──
// ÍNDICE das criações que os editores LIVRES sobem sozinhos depois do autosave. O
// blob (o `Project` do Estúdio / o `.pinta.json` do desenho, gzip) vive no R2 UGC
// privado (chave em `storage_ref`); aqui só metadados. Uma linha por (perfil,
// ferramenta, id do item — preservado, é o vínculo com o IndexedDB e com o
// `pensa-<id>`); reenvio = reserva (`pending_*`) + commit, com `revision` crescente.
// `deleted_at` = lixeira lógica (a linha fica para um restauro futuro do índice; o blob é solto
// — `storage_ref` zerado, o BFF apaga do R2 — e a lista não devolve).
//
// ⚠️ As colunas que a lista MOSTRA (name, kind, item_updated_at, thumb, deleted_at,
// revision, bytes, storage_ref) só mudam no COMMIT. A reserva escreve só em `pending_*`
// e em `last_reserved_revision`.
// ⚠️ Espelho de `CREATION_TOOLS` (domínio): valor novo SEMPRE no fim + migration própria com
// `ADD VALUE IF NOT EXISTS` (`0065_pinta_block`, `0072_molda_creation_tool`).
// `lesson-studio`/`lesson-pinta` (10/10/2026, `0100`): o rascunho do Estúdio e do Pinta DENTRO
// da fase, um item por bloco.
export const creationToolEnum = members.enum('creation_tool', [
  'studio',
  'pinta',
  'molda',
  'lesson-studio',
  'lesson-pinta',
])

/** Shape de uma parte no JSONB (espelho de `CreationPartRef` do domínio). */
export interface CreationPartRefRow {
  hash: string
  bytes: number
}

export const creations = members.table(
  'creations',
  {
    id: uuid('id').primaryKey(),
    /** Dono: o perfil da criança no kids; a própria conta no adulto. */
    userId: uuid('user_id').notNull(),
    /** Conta responsável (kids: o pai; adulto: = user_id). */
    accountId: uuid('account_id').notNull(),
    tool: creationToolEnum('tool').notNull(),
    /** Id do projeto/desenho no editor (ulid/id do Pinta). Preservado de ponta a ponta. */
    itemId: varchar('item_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    /** `kind` do Pinta (`pixel-sprite`…) ou o do Estúdio (`classic`/`pro`). */
    kind: varchar('kind', { length: 40 }).notNull(),
    /** `updatedAt` do ITEM (relógio do cliente): a régua de "quem é mais novo" na sincronia. */
    itemUpdatedAt: timestamp('item_updated_at', { withTimezone: true }).notNull(),
    /** Revisão corrente (a que `storage_ref` aponta). Cresce a cada commit. */
    revision: integer('revision').notNull().default(0),
    /** Documento legado = 1. Promovido somente no commit, nunca rebaixado. */
    formatVersion: integer('format_version').notNull().default(1),
    /**
     * Maior revisão JÁ RESERVADA — contador monotônico (nunca volta, nem no delete):
     * é o que garante chave nova no R2 para toda reserva, mesmo concorrente.
     */
    lastReservedRevision: integer('last_reserved_revision').notNull().default(0),
    /** Reserva em voo (a chave já foi assinada). `null` = nada reservado. */
    pendingRevision: integer('pending_revision'),
    pendingFormatVersion: integer('pending_format_version'),
    /** Bytes reservados (o BFF assina exatamente esse Content-Length; o commit promove). */
    pendingBytes: integer('pending_bytes'),
    /** Nome/kind/updatedAt/thumb que o commit vai promover — a lista NÃO vê. */
    pendingName: varchar('pending_name', { length: 120 }),
    pendingKind: varchar('pending_kind', { length: 40 }),
    pendingItemUpdatedAt: timestamp('pending_item_updated_at', { withTimezone: true }),
    pendingThumb: text('pending_thumb'),
    /** Bytes COMPRIMIDOS da revisão corrente (quota por perfil). */
    bytes: integer('bytes').notNull().default(0),
    /** Chave do objeto no R2 UGC (revisão corrente). `null` = nunca commitou. */
    storageRef: text('storage_ref'),
    /** Miniatura pequena (PNG data URL) opcional, para a lista sem baixar o blob. */
    thumb: text('thumb'),
    /**
     * PARTES da revisão CORRENTE (`[{hash, bytes}]`): assets do Estúdio endereçados por
     * conteúdo, cada um um objeto próprio no R2 (o manifesto em `storage_ref` só aponta os
     * hashes). `[]` = blob único (Pinta, legado). `bytes` da linha = TOTAL (manifesto + partes).
     */
    parts: jsonb('parts').$type<CreationPartRefRow[]>().notNull().default(sql`'[]'::jsonb`),
    /** As partes da reserva em voo (todas as que a revisão reservada referencia). */
    pendingParts: jsonb('pending_parts').$type<CreationPartRefRow[]>(),
    /**
     * Impressão digital do CONTEÚDO da revisão corrente (`v1:<sha256>`, calculada no navegador
     * pela régua do core): é o que o "envio em dia" compara com a do envio. Texto opaco aqui;
     * `null` = cliente antigo ou sem `crypto.subtle` (o critério deixa passar).
     */
    contentFingerprint: varchar('content_fingerprint', { length: 70 }),
    pendingContentFingerprint: varchar('pending_content_fingerprint', { length: 70 }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    /** Última sincronia bem-sucedida (commit) ou remoção. */
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('creations_user_tool_item_uq').on(t.userId, t.tool, t.itemId),
    index('creations_user_tool_idx').on(t.userId, t.tool, t.deletedAt),
    index('creations_tombstone_cleanup_idx').on(t.deletedAt).where(sql`${t.deletedAt} is not null`),
    // Quota por perfil (`usageWith`: count + sum(bytes) dos vivos já confirmados) a cada
    // reserva E commit, sob o advisory lock do perfil: índice PARCIAL com `bytes` como
    // coluna final → index-only scan, sem heap fetch por linha (até 4.000 linhas/perfil).
    index('creations_usage_idx')
      .on(t.userId, t.tool, t.bytes)
      .where(sql`${t.deletedAt} is null and ${t.storageRef} is not null`),
  ],
)

/** Cerca durável: uma conta em exclusão nunca mais pode reservar uploads de criação. */
export const accountDeletionFences = members.table('account_deletion_fences', {
  accountId: uuid('account_id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
})

/** Limpeza final pós-TTL dos objetos R2, com lease distribuído e retry durável. */
export const creationCleanupJobs = members.table(
  'creation_cleanup_jobs',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id').notNull(),
    userIds: jsonb('user_ids').$type<string[]>().notNull().default([]),
    prefixes: jsonb('prefixes').$type<string[]>().notNull(),
    notBefore: timestamp('not_before', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lastError: text('last_error'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('creation_cleanup_jobs_account_uq').on(t.accountId),
    index('creation_cleanup_jobs_due_idx').on(t.completedAt, t.notBefore, t.lockedAt),
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

// Live workshops keep their own commercial clock and immutable lesson snapshots.
// Never create recorded-course entitlements as a side effect of a workshop seat.
export const livePrograms = members.table('live_programs', {
  id: uuid('id').primaryKey(),
  document: jsonb('document').$type<LiveProgram>().notNull(),
})

export const liveCohorts = members.table(
  'live_cohorts',
  {
    id: uuid('id').primaryKey(),
    /** Roteiro antigo (`live_programs`). Turma de curso ao vivo (0114) não tem roteiro. */
    programId: uuid('program_id').references(() => livePrograms.id),
    /**
     * O curso AO VIVO da turma (0114). Sem FK de propósito: o curso é lido pela porta
     * `LiveCoursePort` e a turma guarda o resumo dele no documento. Nulo = turma antiga do
     * roteiro, arquivada pela 0114 e ignorada pelo serviço.
     */
    courseId: uuid('course_id'),
    document: jsonb('document').$type<LiveCohort>().notNull(),
  },
  (t) => [
    index('live_cohorts_program_idx').on(t.programId),
    index('live_cohorts_course_idx').on(t.courseId),
  ],
)

export const liveSessions = members.table(
  'live_sessions',
  {
    id: uuid('id').primaryKey(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => liveCohorts.id),
    document: jsonb('document').$type<LiveSession>().notNull(),
  },
  (t) => [index('live_sessions_cohort_idx').on(t.cohortId)],
)

export const liveOccurrences = members.table(
  'live_occurrences',
  {
    id: uuid('id').primaryKey(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => liveCohorts.id),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => liveSessions.id),
    document: jsonb('document').$type<LiveOccurrence>().notNull(),
  },
  (t) => [
    index('live_occurrences_session_idx').on(t.sessionId),
    index('live_occurrences_cohort_idx').on(t.cohortId),
  ],
)

export const liveEnrollments = members.table(
  'live_enrollments',
  {
    id: uuid('id').primaryKey(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => liveCohorts.id),
    accountId: uuid('account_id').notNull(),
    learnerId: uuid('learner_id'),
    status: text('status').$type<LiveEnrollment['status']>().notNull(),
    document: jsonb('document').$type<LiveEnrollment>().notNull(),
  },
  (t) => [
    index('live_enrollments_account_idx').on(t.accountId),
    index('live_enrollments_cohort_idx').on(t.cohortId),
    uniqueIndex('live_enrollments_active_learner_uq')
      .on(t.cohortId, t.learnerId)
      .where(sql`${t.status} = 'active'`),
    check('live_enrollments_status_check', sql`${t.status} in ('active', 'revoked')`),
  ],
)

export const liveAccessGrants = members.table(
  'live_access_grants',
  {
    id: uuid('id').primaryKey(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => liveEnrollments.id),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => liveSessions.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('live_grants_enrollment_session_uq').on(t.enrollmentId, t.sessionId),
    index('live_grants_session_idx').on(t.sessionId),
    check('live_grants_interval_check', sql`${t.endsAt} > ${t.startsAt}`),
  ],
)

export const liveAudit = members.table(
  'live_audit',
  {
    id: uuid('id').primaryKey(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => liveCohorts.id),
    actorId: uuid('actor_id').notNull(),
    action: varchar('action', { length: 80 }).notNull(),
    targetId: uuid('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('live_audit_cohort_idx').on(t.cohortId, t.createdAt)],
)

export const liveMediaConnections = members.table(
  'live_media_connections',
  {
    id: uuid('id').primaryKey(),
    occurrenceId: uuid('occurrence_id')
      .notNull()
      .references(() => liveOccurrences.id),
    participationId: text('participation_id').notNull(),
    actorId: uuid('actor_id').notNull(),
    deviceId: uuid('device_id').notNull(),
    generation: integer('generation').notNull(),
    state: jsonb('state').$type<Record<string, unknown>>().notNull(),
  },
  (t) => [index('live_media_occurrence_actor_idx').on(t.occurrenceId, t.actorId)],
)

export const liveWorkspaces = members.table(
  'live_workspaces',
  {
    id: uuid('id').primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => liveSessions.id),
    learnerId: uuid('learner_id').notNull(),
    accountId: uuid('account_id').notNull(),
    revision: integer('revision').notNull().default(0),
    writerEpoch: integer('writer_epoch').notNull().default(0),
    writerId: uuid('writer_id').notNull(),
    writerDeviceId: text('writer_device_id'),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    project: jsonb('project').$type<Record<string, unknown>>().notNull(),
    assistance: jsonb('assistance').$type<LiveAssistanceView | null>(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    /**
     * Chave do projeto ao vivo por BLOCO (0114): curso + `chain` do bloco Estúdio, ou curso +
     * id do bloco sem chain. Única por criança. Nula só nos projetos do roteiro antigo.
     */
    projectKey: text('project_key'),
    /** Aulas do curso em que este projeto já abriu (o acesso vale nos encontros delas). */
    lessonIds: jsonb('lesson_ids').$type<string[]>().notNull().default([]),
  },
  (t) => [
    uniqueIndex('live_workspace_session_learner_uq')
      .on(t.sessionId, t.learnerId)
      .where(sql`${t.projectKey} is null`),
    uniqueIndex('live_workspace_learner_key_uq')
      .on(t.learnerId, t.projectKey)
      .where(sql`${t.projectKey} is not null`),
    index('live_workspaces_account_idx').on(t.accountId),
  ],
)

/**
 * Presence in an encounter (0114): when the teacher and each child were last seen, and when the
 * child last confirmed what she is doing. A heartbeat writes this small row, never the
 * occurrence document; every read of the room overlays it on `teachers`, `seenAt` and
 * `activity.reportedAt`.
 */
export const livePresence = members.table(
  'live_presence',
  {
    occurrenceId: uuid('occurrence_id')
      .notNull()
      .references(() => liveOccurrences.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').notNull(),
    accountId: uuid('account_id').notNull(),
    seenAt: timestamp('seen_at', { withTimezone: true }).notNull(),
    activityAt: timestamp('activity_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.occurrenceId, t.actorId] }),
    index('live_presence_account_idx').on(t.accountId),
    index('live_presence_actor_idx').on(t.actorId),
  ],
)

export const liveWorkspaceRevisions = members.table(
  'live_workspace_revisions',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => liveWorkspaces.id),
    revision: integer('revision').notNull(),
    project: jsonb('project').$type<Record<string, unknown>>().notNull(),
    writerId: uuid('writer_id').notNull(),
    mutationId: uuid('mutation_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.revision] }),
    uniqueIndex('live_workspace_mutation_uq').on(t.workspaceId, t.mutationId),
  ],
)

export const liveProjectTemplates = members.table('live_project_templates', {
  id: uuid('id').primaryKey(),
  project: jsonb('project').$type<Record<string, unknown>>().notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
})

export const liveRecordingJobs = members.table(
  'live_recording_jobs',
  {
    occurrenceId: uuid('occurrence_id')
      .primaryKey()
      .references(() => liveOccurrences.id),
    jobId: uuid('job_id').notNull(),
    generation: integer('generation').notNull().default(1),
    desiredState: text('desired_state').$type<'paused' | 'recording' | 'stopped'>().notNull(),
    confirmedState: text('confirmed_state')
      .$type<
        | 'not_started'
        | 'starting'
        | 'recording'
        | 'paused'
        | 'processing'
        | 'review'
        | 'failed'
        | 'empty'
      >()
      .notNull()
      .default('not_started'),
    version: integer('version').notNull().default(0),
    leaseEndsAt: timestamp('lease_ends_at', { withTimezone: true }).notNull(),
    commandVersion: integer('command_version').notNull().default(0),
    manifestKey: text('manifest_key'),
    replayKey: text('replay_key'),
    error: text('error'),
    /** Consecutive failed syncs; reset by any acknowledgement from the recorder. */
    attempts: integer('attempts').notNull().default(0),
    /** Exponential backoff: the loop skips the job until this instant. */
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    /** Last acknowledgement (command response or event) from the private recorder. */
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    /**
     * Lease of the newest command sent with desired `recording`. The recorder stops capturing
     * when its lease ends, so once this passed (plus a margin) nothing can be recording.
     */
    recordingLeaseEndsAt: timestamp('recording_lease_ends_at', { withTimezone: true }),
    /** Terminal: review, empty (no segments) or failed after the retry budget. Never retried. */
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    /**
     * Linha do tempo dos trechos que o gravador confirmou (0114): instantes de parede e duração
     * de cada arquivo. É o que transforma a abertura de uma parte em capítulo do vídeo.
     */
    segments: jsonb('segments').$type<LiveRecordingSegmentTime[]>(),
  },
  (t) => [uniqueIndex('live_recording_job_uq').on(t.jobId)],
)

/**
 * Cross-replica serialization of the media reconcile of one occurrence. A short lease row
 * (never a connection held across provider calls); expired leases are taken over.
 */
export const liveMediaReconcileLeases = members.table('live_media_reconcile_leases', {
  occurrenceId: uuid('occurrence_id').primaryKey(),
  holder: uuid('holder').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export const liveReplayPositions = members.table(
  'live_replay_positions',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => liveSessions.id),
    learnerId: uuid('learner_id').notNull(),
    accountId: uuid('account_id').notNull(),
    version: integer('version').notNull(),
    positionSeconds: integer('position_seconds').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.learnerId, t.version] }),
    index('live_replay_positions_account_idx').on(t.accountId),
  ],
)

export const liveMaterials = members.table('live_materials', {
  id: uuid('id').primaryKey(),
  storageKey: text('storage_key').notNull().unique(),
  fileName: text('file_name').notNull(),
  title: text('title').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  sha256: text('sha256').notNull(),
  uploadedBy: uuid('uploaded_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
})

export const liveLearningProgress = members.table(
  'live_learning_progress',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => liveSessions.id),
    learnerId: uuid('learner_id').notNull(),
    accountId: uuid('account_id').notNull(),
    blockId: uuid('block_id').notNull(),
    revision: uuid('revision').notNull(),
    document: jsonb('document').$type<LearningBlockProgress>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.learnerId, t.blockId, t.revision] }),
    index('live_learning_progress_account_idx').on(t.accountId),
  ],
)
export const liveLearningAttempts = members.table(
  'live_learning_attempts',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => liveSessions.id),
    learnerId: uuid('learner_id').notNull(),
    accountId: uuid('account_id').notNull(),
    id: uuid('id').notNull(),
    document: jsonb('document').$type<LearningAttemptView>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.learnerId, t.id] }),
    index('live_learning_attempts_account_idx').on(t.accountId),
  ],
)

export const studioAiAccounts = members.table(
  'studio_ai_accounts',
  {
    accountId: uuid('account_id').primaryKey(),
    source: varchar('source', { length: 16 })
      .$type<StudioAiFundingSource>()
      .notNull()
      .default('platform'),
    credential: text('credential'),
    keyHash: varchar('key_hash', { length: 64 }),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    externalDailyLimitMicroUsd: integer('external_daily_limit_micro_usd'),
    externalMonthlyLimitMicroUsd: integer('external_monthly_limit_micro_usd'),
    revision: integer('revision').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    check('studio_ai_source_check', sql`${table.source} in ('platform', 'openrouter')`),
    check(
      'studio_ai_daily_limit_check',
      sql`${table.externalDailyLimitMicroUsd} is null or ${table.externalDailyLimitMicroUsd} between 1 and 1000000000`,
    ),
    check(
      'studio_ai_monthly_limit_check',
      sql`${table.externalMonthlyLimitMicroUsd} is null or ${table.externalMonthlyLimitMicroUsd} between 1 and 1000000000`,
    ),
  ],
)

export const studioAiOAuthStates = members.table(
  'studio_ai_oauth_states',
  {
    stateHash: varchar('state_hash', { length: 64 }).primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => studioAiAccounts.accountId, { onDelete: 'cascade' }),
    bindingHash: varchar('binding_hash', { length: 64 }).notNull(),
    verifier: text('verifier').notNull(),
    callbackUrl: text('callback_url').notNull(),
    revision: integer('revision').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('studio_ai_oauth_account_idx').on(table.accountId),
    index('studio_ai_oauth_expiry_idx').on(table.expiresAt),
  ],
)

export const studioAiRuns = members.table(
  'studio_ai_runs',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => studioAiAccounts.accountId, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    projectId: varchar('project_id', { length: 128 }).notNull(),
    purpose: varchar('purpose', { length: 16 }).$type<'tutor' | 'builder'>().notNull(),
    model: varchar('model', { length: 160 }).notNull(),
    source: varchar('source', { length: 16 }).$type<StudioAiFundingSource>().notNull(),
    keyHash: varchar('key_hash', { length: 64 }),
    day: date('day', { mode: 'string' }).notNull(),
    inputBytes: integer('input_bytes').notNull(),
    maxOutputTokens: integer('max_output_tokens').notNull(),
    maxAttempts: smallint('max_attempts').notNull(),
    estimateMicroUsd: bigint('estimate_micro_usd', { mode: 'number' }).notNull(),
    spentMicroUsd: bigint('spent_micro_usd', { mode: 'number' }).notNull().default(0),
    priceCaps: jsonb('price_caps')
      .$type<{ prompt: number; completion: number; request: 0 }>()
      .notNull(),
    dispatched: smallint('dispatched').notNull().default(0),
    allowanceCharged: boolean('allowance_charged').notNull().default(false),
    privileged: boolean('privileged').notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('studio_ai_runs_account_day_idx').on(table.accountId, table.day),
    index('studio_ai_runs_day_idx').on(table.day),
    index('studio_ai_runs_active_idx')
      .on(table.accountId, table.expiresAt)
      .where(isNull(table.finishedAt)),
    check(
      'studio_ai_runs_bounds',
      sql`${table.maxAttempts} between 1 and 6 and ${table.dispatched} between 0 and ${table.maxAttempts} and ${table.estimateMicroUsd} > 0 and ${table.spentMicroUsd} >= 0`,
    ),
    check('studio_ai_runs_source', sql`${table.source} in ('platform', 'openrouter')`),
    check(
      'studio_ai_runs_request',
      sql`${table.purpose} in ('tutor', 'builder') and ${table.inputBytes} between 1 and 256000 and ${table.maxOutputTokens} between 1 and 8000`,
    ),
  ],
)

export const studioAiAttempts = members.table(
  'studio_ai_attempts',
  {
    runId: uuid('run_id')
      .notNull()
      .references(() => studioAiRuns.id, { onDelete: 'cascade' }),
    attempt: smallint('attempt').notNull(),
    status: varchar('status', { length: 16 })
      .$type<'dispatched' | 'uncertain' | 'confirmed' | 'rejected'>()
      .notNull(),
    actualMicroUsd: bigint('actual_micro_usd', { mode: 'number' }),
    generationId: varchar('generation_id', { length: 128 }),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    reconcileAttempts: smallint('reconcile_attempts').notNull().default(0),
    reconcileClaimId: uuid('reconcile_claim_id'),
    reconcileAfter: timestamp('reconcile_after', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.attempt] }),
    uniqueIndex('studio_ai_attempt_generation_idx').on(table.generationId),
    index('studio_ai_attempt_reconcile_idx')
      .on(table.reconcileAfter, table.createdAt)
      .where(
        sql`${table.generationId} is not null and ${table.status} in ('dispatched', 'uncertain')`,
      ),
    check(
      'studio_ai_attempt_state',
      sql`${table.status} in ('dispatched', 'uncertain', 'confirmed', 'rejected')`,
    ),
    check(
      'studio_ai_attempt_cost',
      sql`(${table.status} = 'confirmed' and ${table.actualMicroUsd} is not null and ${table.actualMicroUsd} between 0 and 1000000000) or (${table.status} <> 'confirmed' and ${table.actualMicroUsd} is null)`,
    ),
    check(
      'studio_ai_attempt_bounds',
      sql`${table.attempt} between 1 and 6 and ${table.reconcileAttempts} between 0 and 8 and (${table.promptTokens} is null or ${table.promptTokens} between 0 and 10000000) and (${table.completionTokens} is null or ${table.completionTokens} between 0 and 10000000)`,
    ),
  ],
)

export const studioBuilderJobs = members.table(
  'studio_builder_jobs',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id').notNull(),
    userId: uuid('user_id').notNull(),
    projectId: varchar('project_id', { length: 128 }).notNull(),
    execution: jsonb('execution').$type<{ parentOrigin: string; privileged: boolean }>().notNull(),
    objective: text('objective').notNull(),
    model: varchar('model', { length: 160 }).notNull(),
    binaries: jsonb('binaries')
      .$type<Record<string, { base64: string; sha256: string }>>()
      .notNull(),
    notes: jsonb('notes').$type<string[]>().notNull().default([]),
    assistance: jsonb('assistance').$type<StudioProAssistanceJournal>(),
    base: jsonb('base').$type<StudioProRevision>().notNull(),
    phase: varchar('phase', { length: 16 }).$type<StudioProBuilderPhase>().notNull(),
    version: integer('version').notNull().default(0),
    modelCalls: smallint('model_calls').notNull().default(0),
    validationCalls: smallint('validation_calls').notNull().default(0),
    leaseToken: uuid('lease_token'),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    result: jsonb('result').$type<StudioProBuilderResult>(),
    error: text('error'),
    cost: jsonb('cost').$type<StudioProBuilderCost>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('studio_builder_owner_idx').on(
      table.accountId,
      table.userId,
      table.projectId,
      table.createdAt,
    ),
    index('studio_builder_expiry_idx').on(table.expiresAt),
    index('studio_builder_queue_idx')
      .on(table.phase, table.leaseUntil, table.deadlineAt)
      .where(sql`${table.phase} in ('queued','generating','validating')`),
    check(
      'studio_builder_phase',
      sql`${table.phase} in ('queued','generating','validating','review','failed','cancelled')`,
    ),
    check(
      'studio_builder_bounds',
      sql`${table.modelCalls} between 0 and 3 and ${table.validationCalls} between 0 and 3 and ${table.version} >= 0 and char_length(${table.objective}) between 1 and 2000 and octet_length(${table.base}::text) <= 3000000 and (${table.result} is null or octet_length(${table.result}::text) <= 3000000)`,
    ),
    check(
      'studio_builder_lease',
      sql`(${table.leaseToken} is null) = (${table.leaseUntil} is null)`,
    ),
    check(
      'studio_builder_assistance_bounds',
      sql`${table.assistance} is null or (octet_length(${table.assistance}::text) <= 150000 and jsonb_array_length(${table.assistance}->'events') <= 128)`,
    ),
  ],
)

/** Short deletion fence: an in-flight create cannot resurrect a removed project's jobs. */
export const studioBuilderProjectDeletions = members.table(
  'studio_builder_project_deletions',
  {
    accountId: uuid('account_id').notNull(),
    userId: uuid('user_id').notNull(),
    projectId: varchar('project_id', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.userId, table.projectId] }),
    index('studio_builder_project_deletion_expiry_idx').on(table.expiresAt),
  ],
)

export const schema = {
  studioBuilderProjectDeletions,
  studioBuilderJobs,
  studioAiRuns,
  studioAiAttempts,
  studioAiAccounts,
  studioAiOAuthStates,
  liveLearningProgress,
  liveLearningAttempts,
  livePrograms,
  liveCohorts,
  liveSessions,
  liveOccurrences,
  liveEnrollments,
  liveAccessGrants,
  liveAudit,
  liveMediaConnections,
  liveWorkspaces,
  liveWorkspaceRevisions,
  livePresence,
  liveProjectTemplates,
  liveRecordingJobs,
  liveReplayPositions,
  liveMaterials,
  teacherBroadcasts,
  teacherBroadcastRecipients,
  teacherThreadStaffReads,
  lessonEvidence,
  lessonCriteriaMigrationSnapshots,
  lessonDrafts,
  lessonDraftOperations,
  activeLessonBlocks,
  courses,
  modules,
  lessons,
  lessonBlocks,
  lessonAttachments,
  lessonStructures,
  lessonNavigation,
  lessonSectionProgress,
  lessonBlockProgress,
  learningAttempts,
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
  profilePreferences,
  avatarInventory,
  missionClaims,
  leagueMembership,
  roomState,
  roomInventory,
  certificatesIssued,
  pensaProjects,
  pensaProjectRevisions,
  pensaPlanDrafts,
  pensaMissionProgress,
  pensaProjectMessages,
  pensaExecutionEvents,
  pensaOperations,
  pensaCheckpoints,
  privateNarrations,
  aiUsageReservations,
  teacherThreads,
  teacherMessages,
  zappyConversations,
  zappyMessages,
  zappyKnowledgeSources,
  zappyKnowledgeChunks,
  aiUsageDaily,
  renewalRemindersSent,
  entitlementLifecycleMessagesSent,
  challengeCustomThemes,
  challengeMonthOverrides,
  helpCollections,
  helpTutorials,
  creations,
  accountDeletionFences,
  creationCleanupJobs,
  pensaDeletionJobs,
  pensaProviderUsage,
  processedWebhooks,
}

// Linha-tipo (importado por testes/seed se útil).
export type EntitlementRow = typeof entitlements.$inferSelect
export type CourseRow = typeof courses.$inferSelect
